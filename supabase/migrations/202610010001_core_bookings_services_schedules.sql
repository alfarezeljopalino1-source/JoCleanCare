-- JoCleanCare core service catalog, customer bookings, and staff schedules.
-- Additive migration: does not alter or remove profiles or existing data.

create schema if not exists jocleancare_private;
revoke all on schema jocleancare_private from public;
grant usage on schema jocleancare_private to authenticated;

create or replace function jocleancare_private.has_profile_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = required_role
  );
$$;

revoke all on function jocleancare_private.has_profile_role(text) from public;
grant execute on function jocleancare_private.has_profile_role(text) to authenticated;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  booking_date date not null,
  start_time time not null,
  address text not null,
  notes text,
  total_price numeric(12, 2) not null check (total_price >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete restrict,
  scheduled_date date not null,
  start_time time not null,
  end_time time,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'accepted', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_schedules_valid_time check (end_time is null or end_time > start_time)
);

create or replace function jocleancare_private.is_current_staff_assigned_to_booking(target_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_schedules ss
    where ss.booking_id = target_booking_id
      and ss.staff_id = (select auth.uid())
  );
$$;

create or replace function jocleancare_private.customer_owns_booking(target_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = target_booking_id
      and b.customer_id = (select auth.uid())
  );
$$;

revoke all on function jocleancare_private.is_current_staff_assigned_to_booking(uuid) from public;
revoke all on function jocleancare_private.customer_owns_booking(uuid) from public;
grant execute on function jocleancare_private.is_current_staff_assigned_to_booking(uuid) to authenticated;
grant execute on function jocleancare_private.customer_owns_booking(uuid) to authenticated;

create index if not exists services_active_name_idx
  on public.services (name) where is_active;
create index if not exists bookings_customer_date_idx
  on public.bookings (customer_id, booking_date desc);
create index if not exists bookings_service_id_idx
  on public.bookings (service_id);
create index if not exists bookings_status_date_idx
  on public.bookings (status, booking_date);
create index if not exists staff_schedules_booking_id_idx
  on public.staff_schedules (booking_id);
create index if not exists staff_schedules_staff_date_idx
  on public.staff_schedules (staff_id, scheduled_date, start_time);
create index if not exists staff_schedules_status_date_idx
  on public.staff_schedules (status, scheduled_date);

create or replace function jocleancare_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function jocleancare_private.set_updated_at() from public;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row execute function jocleancare_private.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function jocleancare_private.set_updated_at();

drop trigger if exists staff_schedules_set_updated_at on public.staff_schedules;
create trigger staff_schedules_set_updated_at
before update on public.staff_schedules
for each row execute function jocleancare_private.set_updated_at();

-- Prices are snapshotted from an active service on creation, never recalculated
-- when the catalog price changes. Customers cannot choose an initial status.
create or replace function jocleancare_private.prepare_new_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_price numeric(12, 2);
begin
  select s.price
    into selected_price
  from public.services s
  where s.id = new.service_id
    and s.is_active;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'The selected service does not exist or is inactive.';
  end if;

  new.total_price := selected_price;
  new.status := 'pending';
  return new;
end;
$$;

revoke all on function jocleancare_private.prepare_new_booking() from public;

create or replace function jocleancare_private.require_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.customer_id is not distinct from old.customer_id then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.customer_id
      and p.role = 'customer'
  ) then
    raise exception using
      errcode = '23514',
      message = 'customer_id must reference a profile with the customer role.';
  end if;
  return new;
end;
$$;

revoke all on function jocleancare_private.require_customer_profile() from public;

drop trigger if exists bookings_require_customer_profile on public.bookings;
create trigger bookings_require_customer_profile
before insert or update on public.bookings
for each row execute function jocleancare_private.require_customer_profile();

drop trigger if exists bookings_prepare_new_booking on public.bookings;
create trigger bookings_prepare_new_booking
before insert on public.bookings
for each row execute function jocleancare_private.prepare_new_booking();

-- Staff can update work status/notes/end time but cannot change the booking,
-- assignment, or scheduled slot. Admin updates remain unrestricted by this guard.
create or replace function jocleancare_private.guard_staff_schedule_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jocleancare_private.has_profile_role('staff') and (
    new.id is distinct from old.id
    or new.booking_id is distinct from old.booking_id
    or new.staff_id is distinct from old.staff_id
    or new.scheduled_date is distinct from old.scheduled_date
    or new.start_time is distinct from old.start_time
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = '42501',
      message = 'Staff may only update their assigned job status, end time, and notes.';
  end if;

  return new;
end;
$$;

revoke all on function jocleancare_private.guard_staff_schedule_update() from public;

drop trigger if exists staff_schedules_guard_staff_update on public.staff_schedules;
create trigger staff_schedules_guard_staff_update
before update on public.staff_schedules
for each row execute function jocleancare_private.guard_staff_schedule_update();

-- CHECK constraints cannot inspect another table, so validate staff role here.
create or replace function jocleancare_private.require_staff_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.staff_id is not distinct from old.staff_id then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.staff_id
      and p.role = 'staff'
  ) then
    raise exception using
      errcode = '23514',
      message = 'staff_id must reference a profile with the staff role.';
  end if;
  return new;
end;
$$;

revoke all on function jocleancare_private.require_staff_profile() from public;

drop trigger if exists staff_schedules_require_staff_profile on public.staff_schedules;
create trigger staff_schedules_require_staff_profile
before insert or update on public.staff_schedules
for each row execute function jocleancare_private.require_staff_profile();

alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.staff_schedules enable row level security;

revoke all on table public.services from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.staff_schedules from anon, authenticated;

grant select on table public.services to anon, authenticated;
grant insert, update, delete on table public.services to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;
grant select, insert, update, delete on table public.staff_schedules to authenticated;

drop policy if exists "Anyone can read active services" on public.services;
create policy "Anyone can read active services"
on public.services for select to anon, authenticated
using (is_active);

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
on public.services for all to authenticated
using (jocleancare_private.has_profile_role('admin'))
with check (jocleancare_private.has_profile_role('admin'));

drop policy if exists "Customers can read their own bookings" on public.bookings;
create policy "Customers can read their own bookings"
on public.bookings for select to authenticated
using (
  customer_id = (select auth.uid())
  and jocleancare_private.has_profile_role('customer')
);

drop policy if exists "Customers can create their own bookings" on public.bookings;
create policy "Customers can create their own bookings"
on public.bookings for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and jocleancare_private.has_profile_role('customer')
);

drop policy if exists "Assigned staff can read bookings" on public.bookings;
create policy "Assigned staff can read bookings"
on public.bookings for select to authenticated
using (
  jocleancare_private.has_profile_role('staff')
  and jocleancare_private.is_current_staff_assigned_to_booking(id)
);

drop policy if exists "Admins can manage bookings" on public.bookings;
create policy "Admins can manage bookings"
on public.bookings for all to authenticated
using (jocleancare_private.has_profile_role('admin'))
with check (jocleancare_private.has_profile_role('admin'));

drop policy if exists "Staff can read their own schedules" on public.staff_schedules;
create policy "Staff can read their own schedules"
on public.staff_schedules for select to authenticated
using (
  staff_id = (select auth.uid())
  and jocleancare_private.has_profile_role('staff')
);

drop policy if exists "Staff can update their assigned schedules" on public.staff_schedules;
create policy "Staff can update their assigned schedules"
on public.staff_schedules for update to authenticated
using (
  staff_id = (select auth.uid())
  and jocleancare_private.has_profile_role('staff')
)
with check (
  staff_id = (select auth.uid())
  and jocleancare_private.has_profile_role('staff')
);

drop policy if exists "Customers can read schedules for their bookings" on public.staff_schedules;
create policy "Customers can read schedules for their bookings"
on public.staff_schedules for select to authenticated
using (
  jocleancare_private.has_profile_role('customer')
  and jocleancare_private.customer_owns_booking(booking_id)
);

drop policy if exists "Admins can manage staff schedules" on public.staff_schedules;
create policy "Admins can manage staff schedules"
on public.staff_schedules for all to authenticated
using (jocleancare_private.has_profile_role('admin'))
with check (jocleancare_private.has_profile_role('admin'));
