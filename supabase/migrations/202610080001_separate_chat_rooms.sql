-- JoCleanCare Separate Chat Rooms & Realtime Architecture
-- Additive Migration: Preserves all existing tables and data.
-- Creates public.chat_rooms and public.chat_messages with strict role segregation.

-- 1. Create chat_rooms table
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  room_type text not null check (room_type in ('admin', 'staff')),
  booking_id uuid references public.bookings (id) on delete cascade,
  staff_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indices & Unique constraints to prevent duplicate rooms
create unique index if not exists chat_rooms_customer_admin_idx
  on public.chat_rooms (customer_id)
  where (room_type = 'admin');

create unique index if not exists chat_rooms_booking_staff_idx
  on public.chat_rooms (booking_id)
  where (room_type = 'staff');

create index if not exists chat_rooms_customer_id_idx
  on public.chat_rooms (customer_id);

create index if not exists chat_rooms_staff_id_idx
  on public.chat_rooms (staff_id);

create index if not exists chat_rooms_room_type_idx
  on public.chat_rooms (room_type);

-- 2. Create chat_messages table
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (length(trim(message)) > 0 and length(message) <= 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_id_created_idx
  on public.chat_messages (room_id, created_at asc);

create index if not exists chat_messages_sender_id_idx
  on public.chat_messages (sender_id);

create index if not exists chat_messages_room_id_unread_idx
  on public.chat_messages (room_id, is_read);

-- 3. Enable RLS
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

grant select, insert, update on table public.chat_rooms to authenticated;
grant select, insert, update on table public.chat_messages to authenticated;

-- 4. RLS Policies for chat_rooms
drop policy if exists "Customers manage their chat rooms" on public.chat_rooms;
create policy "Customers manage their chat rooms"
on public.chat_rooms for select to authenticated
using (
  customer_id = (select auth.uid())
);

drop policy if exists "Customers insert their chat rooms" on public.chat_rooms;
create policy "Customers insert their chat rooms"
on public.chat_rooms for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and (select jocleancare_private.has_profile_role('customer'))
);

drop policy if exists "Staff read their assigned staff rooms" on public.chat_rooms;
create policy "Staff read their assigned staff rooms"
on public.chat_rooms for select to authenticated
using (
  room_type = 'staff'
  and staff_id = (select auth.uid())
  and (select jocleancare_private.has_profile_role('staff'))
);

drop policy if exists "Staff update their assigned staff rooms" on public.chat_rooms;
create policy "Staff update their assigned staff rooms"
on public.chat_rooms for update to authenticated
using (
  room_type = 'staff'
  and staff_id = (select auth.uid())
  and (select jocleancare_private.has_profile_role('staff'))
)
with check (
  room_type = 'staff'
  and staff_id = (select auth.uid())
  and (select jocleancare_private.has_profile_role('staff'))
);

drop policy if exists "Admins manage all chat rooms" on public.chat_rooms;
create policy "Admins manage all chat rooms"
on public.chat_rooms for all to authenticated
using (
  (select jocleancare_private.has_profile_role('admin'))
)
with check (
  (select jocleancare_private.has_profile_role('admin'))
);

-- 5. RLS Policies for chat_messages
drop policy if exists "Participants read chat messages" on public.chat_messages;
create policy "Participants read chat messages"
on public.chat_messages for select to authenticated
using (
  exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and (
        (r.customer_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('customer')))
        or (r.room_type = 'staff' and r.staff_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('staff')))
        or (select jocleancare_private.has_profile_role('admin'))
      )
  )
);

drop policy if exists "Participants insert chat messages" on public.chat_messages;
create policy "Participants insert chat messages"
on public.chat_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and (
        (r.customer_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('customer')))
        or (r.room_type = 'staff' and r.staff_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('staff')))
        or (select jocleancare_private.has_profile_role('admin'))
      )
  )
);

drop policy if exists "Participants update chat messages" on public.chat_messages;
create policy "Participants update chat messages"
on public.chat_messages for update to authenticated
using (
  exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and (
        (r.customer_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('customer')))
        or (r.room_type = 'staff' and r.staff_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('staff')))
        or (select jocleancare_private.has_profile_role('admin'))
      )
  )
)
with check (
  exists (
    select 1 from public.chat_rooms r
    where r.id = chat_messages.room_id
      and (
        (r.customer_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('customer')))
        or (r.room_type = 'staff' and r.staff_id = (select auth.uid()) and (select jocleancare_private.has_profile_role('staff')))
        or (select jocleancare_private.has_profile_role('admin'))
      )
  )
);

-- 6. Helper function: Get or create customer admin chat room
create or replace function public.get_or_create_admin_chat_room(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_caller_id uuid := (select auth.uid());
  v_is_admin boolean := jocleancare_private.has_profile_role('admin');
begin
  if not (v_caller_id = p_customer_id or v_is_admin) then
    raise exception using errcode = '42501', message = 'Unauthorized access to admin chat room.';
  end if;

  select id into v_room_id
  from public.chat_rooms
  where customer_id = p_customer_id
    and room_type = 'admin'
  limit 1;

  if v_room_id is null then
    insert into public.chat_rooms (customer_id, room_type, booking_id, staff_id)
    values (p_customer_id, 'admin', null, null)
    on conflict (customer_id) where (room_type = 'admin')
    do update set updated_at = now()
    returning id into v_room_id;
  end if;

  return v_room_id;
end;
$$;

revoke all on function public.get_or_create_admin_chat_room(uuid) from public, anon;
grant execute on function public.get_or_create_admin_chat_room(uuid) to authenticated;

-- 7. Helper function: Get or create staff chat room for booking
create or replace function public.get_or_create_staff_chat_room(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_customer_id uuid;
  v_staff_id uuid;
  v_caller_id uuid := (select auth.uid());
  v_is_admin boolean := jocleancare_private.has_profile_role('admin');
begin
  -- Get customer id
  select customer_id into v_customer_id
  from public.bookings
  where id = p_booking_id;

  if v_customer_id is null then
    raise exception using errcode = '23503', message = 'Booking does not exist.';
  end if;

  -- Find currently assigned staff
  select staff_id into v_staff_id
  from public.staff_schedules
  where booking_id = p_booking_id
    and status <> 'cancelled'
  order by created_at desc
  limit 1;

  if v_staff_id is null then
    return null; -- No staff assigned yet, do not create empty staff room
  end if;

  -- Authorization check: must be customer of booking, assigned staff, or admin
  if not (v_caller_id = v_customer_id or v_caller_id = v_staff_id or v_is_admin) then
    raise exception using errcode = '42501', message = 'Unauthorized access to staff chat room.';
  end if;

  select id into v_room_id
  from public.chat_rooms
  where booking_id = p_booking_id
    and room_type = 'staff'
  limit 1;

  if v_room_id is null then
    insert into public.chat_rooms (customer_id, room_type, booking_id, staff_id)
    values (v_customer_id, 'staff', p_booking_id, v_staff_id)
    on conflict (booking_id) where (room_type = 'staff')
    do update set staff_id = v_staff_id, updated_at = now()
    returning id into v_room_id;
  else
    -- Update staff_id if re-assigned
    update public.chat_rooms
    set staff_id = v_staff_id, updated_at = now()
    where id = v_room_id and (staff_id is distinct from v_staff_id);
  end if;

  return v_room_id;
end;
$$;

revoke all on function public.get_or_create_staff_chat_room(uuid) from public, anon;
grant execute on function public.get_or_create_staff_chat_room(uuid) to authenticated;

-- 8. Helper function to mark room messages as read
create or replace function public.mark_chat_room_messages_read(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
begin
  update public.chat_messages
  set is_read = true
  where room_id = p_room_id
    and sender_id <> v_caller_id
    and is_read = false;
end;
$$;

revoke all on function public.mark_chat_room_messages_read(uuid) from public, anon;
grant execute on function public.mark_chat_room_messages_read(uuid) to authenticated;

-- 9. Add realtime publication
do $$
begin
  begin
    alter publication supabase_realtime add table public.chat_messages;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.chat_rooms;
  exception when others then null;
  end;
end $$;
