-- JoCleanCare advanced feature expansion:
-- Services detail columns, Add-ons catalog, Customer Addresses,
-- Enhanced Booking attributes, Reviews & Ratings, Notifications,
-- Booking Chat Messaging, Favorite Cleaners, and Smart Scheduling.
-- Additive migration: preserves all existing profiles, bookings, schedules.

-- 1. Extend services table with detail attributes
alter table public.services
  add column if not exists whats_included text[] default '{}',
  add column if not exists whats_excluded text[] default '{}',
  add column if not exists badge text,
  add column if not exists service_tier text default 'standard';

-- 2. Create Add-ons catalog table
create table if not exists public.add_ons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  duration_minutes integer not null default 30 check (duration_minutes >= 0),
  is_active boolean not null default true,
  icon_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists add_ons_set_updated_at on public.add_ons;
create trigger add_ons_set_updated_at
before update on public.add_ons
for each row execute function jocleancare_private.set_updated_at();

-- 3. Extend bookings table
alter table public.bookings
  add column if not exists housing_type text check (housing_type is null or housing_type in ('rumah', 'apartemen', 'kantor', 'kos', 'lainnya')),
  add column if not exists room_count text,
  add column if not exists duration_hours integer check (duration_hours is null or duration_hours > 0),
  add column if not exists base_price numeric(12, 2),
  add column if not exists add_ons_price numeric(12, 2) default 0,
  add column if not exists recurring_frequency text default 'one_time' check (recurring_frequency in ('one_time', 'weekly', 'biweekly', 'monthly')),
  add column if not exists address_label text,
  add column if not exists customer_phone text,
  add column if not exists cancellation_reason text,
  add column if not exists preferred_staff_id uuid references public.profiles(id) on delete set null;

-- 4. Create booking_add_ons table
create table if not exists public.booking_add_ons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  add_on_id uuid not null references public.add_ons (id) on delete restrict,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists booking_add_ons_booking_id_idx
  on public.booking_add_ons (booking_id);

-- 5. Customer address book
create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  full_address text not null,
  phone text not null,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_customer_id_idx
  on public.customer_addresses (customer_id);

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;
create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row execute function jocleancare_private.set_updated_at();

-- 6. Booking reviews & ratings
create table if not exists public.booking_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  staff_id uuid references public.profiles (id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists booking_reviews_staff_id_idx
  on public.booking_reviews (staff_id);

-- 7. In-app notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_idx
  on public.notifications (user_id, created_at desc);

-- 8. Booking chat messages
create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (length(trim(message)) > 0 and length(message) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists booking_messages_booking_id_created_idx
  on public.booking_messages (booking_id, created_at asc);

-- 9. Favorite cleaners
create table if not exists public.favorite_cleaners (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, staff_id)
);

create index if not exists favorite_cleaners_customer_idx
  on public.favorite_cleaners (customer_id);

-- 10. Update prepare_new_booking trigger to support duration and add-ons server-side
create or replace function jocleancare_private.prepare_new_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  catalog_price numeric(12, 2);
  computed_base numeric(12, 2);
  hours_factor numeric(12, 2) := 1.0;
begin
  select s.price
    into catalog_price
  from public.services s
  where s.id = new.service_id
    and s.is_active;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'The selected service does not exist or is inactive.';
  end if;

  if new.duration_hours is not null and new.duration_hours > 2 then
    hours_factor := 1.0 + ((new.duration_hours - 2) * 0.35);
  end if;

  computed_base := round(catalog_price * hours_factor, 0);
  new.base_price := coalesce(new.base_price, computed_base);
  new.add_ons_price := coalesce(new.add_ons_price, 0);

  -- Set verified total_price server-side
  new.total_price := new.base_price + new.add_ons_price;
  new.status := 'pending';
  return new;
end;
$$;

-- 11. Update status transition guard to allow customer cancellation of pending/confirmed bookings
create or replace function jocleancare_private.guard_booking_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  is_admin boolean := jocleancare_private.has_profile_role('admin');
  is_staff boolean := jocleancare_private.has_profile_role('staff');
  is_customer boolean := jocleancare_private.has_profile_role('customer');
  transition_allowed boolean := false;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if not is_admin and not is_staff then
    if is_customer and old.customer_id = (select auth.uid()) and old.status in ('pending', 'confirmed') and new.status = 'cancelled' then
      transition_allowed := true;
    else
      raise exception using errcode = '42501', message = 'Only operational roles or the customer before assignment may change booking status.';
    end if;
  else
    transition_allowed := case old.status
      when 'pending' then new.status in ('confirmed', 'cancelled')
      when 'confirmed' then new.status in ('assigned', 'cancelled')
      when 'assigned' then new.status in ('in_progress', 'cancelled')
      when 'in_progress' then new.status = 'completed'
      else false
    end;
  end if;

  if not transition_allowed then
    raise exception using errcode = '23514', message = 'Invalid booking status transition.';
  end if;

  if is_staff and not (
    (old.status = 'assigned' and new.status = 'in_progress')
    or (old.status = 'in_progress' and new.status = 'completed')
  ) then
    raise exception using errcode = '42501', message = 'Staff may only advance assigned work.';
  end if;

  if new.status = 'assigned' and not exists (
    select 1 from public.staff_schedules ss
    where ss.booking_id = new.id and ss.status <> 'cancelled'
  ) then
    raise exception using errcode = '23514', message = 'A booking needs an active staff schedule before assignment.';
  end if;

  if new.status = 'in_progress' and not exists (
    select 1 from public.staff_schedules ss
    where ss.booking_id = new.id and ss.status = 'in_progress'
  ) then
    raise exception using errcode = '23514', message = 'A staff schedule must be in progress first.';
  end if;

  if new.status = 'completed' and exists (
    select 1 from public.staff_schedules ss
    where ss.booking_id = new.id and ss.status not in ('completed', 'cancelled')
  ) then
    raise exception using errcode = '23514', message = 'All active staff schedules must be completed first.';
  end if;

  return new;
end;
$$;

-- 12. Helper function to get assigned staff with ratings
drop function if exists public.get_customer_booking_staff(uuid);
create or replace function public.get_customer_booking_staff(p_booking_id uuid)
returns table (
  staff_id uuid,
  staff_name text,
  staff_phone text,
  scheduled_date date,
  start_time time,
  end_time time,
  assignment_status text,
  average_rating numeric,
  total_reviews bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select 
    p.id as staff_id,
    p.name as staff_name,
    p.phone as staff_phone,
    ss.scheduled_date,
    ss.start_time,
    ss.end_time,
    ss.status as assignment_status,
    coalesce(round(avg(br.rating)::numeric, 1), 5.0) as average_rating,
    count(br.id) as total_reviews
  from public.bookings b
  join public.staff_schedules ss on ss.booking_id = b.id
  join public.profiles p on p.id = ss.staff_id and p.role = 'staff'
  left join public.booking_reviews br on br.staff_id = p.id
  where b.id = p_booking_id
    and b.customer_id = (select auth.uid())
    and b.status <> 'cancelled'
    and ss.status <> 'cancelled'
    and jocleancare_private.has_profile_role('customer')
  group by p.id, p.name, p.phone, ss.scheduled_date, ss.start_time, ss.end_time, ss.status;
$$;

revoke all on function public.get_customer_booking_staff(uuid) from public, anon;
grant execute on function public.get_customer_booking_staff(uuid) to authenticated;

-- 13. Enable RLS and setup policies
alter table public.add_ons enable row level security;
alter table public.booking_add_ons enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.booking_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.booking_messages enable row level security;
alter table public.favorite_cleaners enable row level security;

-- Grants
grant select on table public.add_ons to anon, authenticated;
grant insert, update, delete on table public.add_ons to authenticated;

grant select, insert on table public.booking_add_ons to authenticated;
grant update, delete on table public.booking_add_ons to authenticated;

grant select, insert, update, delete on table public.customer_addresses to authenticated;
grant select, insert on table public.booking_reviews to authenticated;
grant select, update on table public.notifications to authenticated;
grant insert on table public.notifications to authenticated;
grant select, insert on table public.booking_messages to authenticated;
grant select, insert, delete on table public.favorite_cleaners to authenticated;

-- Policies for add_ons
drop policy if exists "Anyone can read active add_ons" on public.add_ons;
create policy "Anyone can read active add_ons"
on public.add_ons for select to anon, authenticated
using (is_active);

drop policy if exists "Admins can manage add_ons" on public.add_ons;
create policy "Admins can manage add_ons"
on public.add_ons for all to authenticated
using (jocleancare_private.has_profile_role('admin'))
with check (jocleancare_private.has_profile_role('admin'));

-- Policies for booking_add_ons
drop policy if exists "Customers can read their booking add_ons" on public.booking_add_ons;
create policy "Customers can read their booking add_ons"
on public.booking_add_ons for select to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.customer_id = (select auth.uid())
  )
);

drop policy if exists "Customers can insert booking add_ons" on public.booking_add_ons;
create policy "Customers can insert booking add_ons"
on public.booking_add_ons for insert to authenticated
with check (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.customer_id = (select auth.uid())
  )
);

drop policy if exists "Staff can read assigned booking add_ons" on public.booking_add_ons;
create policy "Staff can read assigned booking add_ons"
on public.booking_add_ons for select to authenticated
using (
  jocleancare_private.has_profile_role('staff')
  and jocleancare_private.is_current_staff_assigned_to_booking(booking_id)
);

drop policy if exists "Admins can manage booking add_ons" on public.booking_add_ons;
create policy "Admins can manage booking add_ons"
on public.booking_add_ons for all to authenticated
using (jocleancare_private.has_profile_role('admin'))
with check (jocleancare_private.has_profile_role('admin'));

-- Policies for customer_addresses
drop policy if exists "Customers manage their addresses" on public.customer_addresses;
create policy "Customers manage their addresses"
on public.customer_addresses for all to authenticated
using (customer_id = (select auth.uid()))
with check (customer_id = (select auth.uid()));

drop policy if exists "Admins read customer addresses" on public.customer_addresses;
create policy "Admins read customer addresses"
on public.customer_addresses for select to authenticated
using (jocleancare_private.has_profile_role('admin'));

-- Policies for booking_reviews
drop policy if exists "Anyone can read reviews" on public.booking_reviews;
create policy "Anyone can read reviews"
on public.booking_reviews for select to anon, authenticated
using (true);

drop policy if exists "Customer can review completed booking" on public.booking_reviews;
create policy "Customer can review completed booking"
on public.booking_reviews for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and b.customer_id = (select auth.uid())
      and b.status = 'completed'
  )
);

-- Policies for notifications
drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or jocleancare_private.has_profile_role('admin'));

drop policy if exists "Users update their notifications" on public.notifications;
create policy "Users update their notifications"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Authenticated insert notifications" on public.notifications;
create policy "Authenticated insert notifications"
on public.notifications for insert to authenticated
with check (true);

-- Policies for booking_messages
drop policy if exists "Participants read booking messages" on public.booking_messages;
create policy "Participants read booking messages"
on public.booking_messages for select to authenticated
using (
  jocleancare_private.has_profile_role('admin')
  or exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.customer_id = (select auth.uid())
  )
  or jocleancare_private.is_current_staff_assigned_to_booking(booking_id)
);

drop policy if exists "Participants insert booking messages" on public.booking_messages;
create policy "Participants insert booking messages"
on public.booking_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    jocleancare_private.has_profile_role('admin')
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = (select auth.uid())
    )
    or jocleancare_private.is_current_staff_assigned_to_booking(booking_id)
  )
);

-- Policies for favorite_cleaners
drop policy if exists "Customers manage favorite cleaners" on public.favorite_cleaners;
create policy "Customers manage favorite cleaners"
on public.favorite_cleaners for all to authenticated
using (customer_id = (select auth.uid()))
with check (customer_id = (select auth.uid()));

-- Policy for customer cancellation
drop policy if exists "Customers can cancel their pending bookings" on public.bookings;
create policy "Customers can cancel their pending bookings"
on public.bookings for update to authenticated
using (
  customer_id = (select auth.uid())
  and jocleancare_private.has_profile_role('customer')
  and status in ('pending', 'confirmed')
)
with check (
  customer_id = (select auth.uid())
  and jocleancare_private.has_profile_role('customer')
  and status = 'cancelled'
);

-- 14. Seed data: 5 Core Services (if not exists)
insert into public.services (id, name, description, price, duration_minutes, is_active, whats_included, whats_excluded, badge, service_tier)
values
  ('b0000001-0000-0000-0000-000000000001', 'Regular Cleaning', 'Pembersihan standar rutin untuk menjaga kebersihan dan kenyamanan harian rumah, kamar, dan area santai.', 120000, 120, true,
   array['Sapu dan pel seluruh ruangan lantai utama', 'Mengelap permukaan meja, rak, dan perabot utama', 'Membersihkan debu ventilasi dan jendela bawah', 'Merapikan tempat tidur dan ganti sprei dasar', 'Pengosongan dan pembuangan tempat sampah'],
   array['Pembersihan kerak kamar mandi membandel', 'Pembersihan dalam kulkas dan oven', 'Cuci karpet dan sofa basah', 'Area luar ruangan / taman'],
   'Paling Populer', 'standard'),

  ('b0000002-0000-0000-0000-000000000002', 'Deep Cleaning', 'Pembersihan menyeluruh mendalam hingga ke sela-sela tersulit, kerak kamar mandi, dan sanitasi komprehensif.', 250000, 240, true,
   array['Semua cakupan Regular Cleaning', 'Scrubbing kerak lantai dan dinding kamar mandi', 'Sanitasi kloset, wastafel, dan kran air', 'Pembersihan sela-sela kusen dan sudut mati', 'Lap detail lemari, perabot, dan kitchen sink', 'Disinfeksi titik sentuh tinggi'],
   array['Cuci sofa wet vacuum ekstrak', 'Pembersihan plafon tinggi di atas 3.5 meter'],
   'Perawatan Ekstra', 'deep'),

  ('b0000003-0000-0000-0000-000000000003', 'Move In Cleaning', 'Sterilisasi dan pembersihan total sebelum Anda menempati rumah atau apartemen baru. Segar dan siap dihuni.', 350000, 300, true,
   array['Pembersihan debu sisa konstruksi atau renovasi ringan', 'Pembersihan seluruh bagian dalam kabinet dan laci kosong', 'Deep scrub seluruh kamar mandi dan toilet', 'Pembersihan area dapur, kompor, dan sink baru', 'Pel disinfektan 2 lapis seluruh lantai', 'Pembersihan kaca dan ventilasi total'],
   array['Pembersihan tumpukan semen/cat tebal renovasi berat', 'Pembuangan puing sisa bangunan besar'],
   'Pindahan Baru', 'move_in'),

  ('b0000004-0000-0000-0000-000000000004', 'Move Out Cleaning', 'Pembersihan tuntas saat serah terima hunian lama kepada pemilik atau penyewa baru tanpa kendala deposit.', 350000, 300, true,
   array['Pembersihan total seluruh ruangan setelah barang dikosongkan', 'Deep cleaning kamar mandi dan kerak air', 'Pembersihan kitchen set dan bekas minyak memasak', 'Pembersihan kaca jendela, cermin, dan pintu', 'Sapu dan pel sanitasi menyeluruh'],
   array['Perbaikan dinding berlubang atau cat mengelupas', 'Pembuangan furnitur sisa yang rusak'],
   'Serah Terima Bersih', 'move_out'),

  ('b0000005-0000-0000-0000-000000000005', 'Office Cleaning', 'Layanan kebersihan profesional untuk kantor, coworking space, dan ruko agar lingkungan kerja produktif.', 200000, 180, true,
   array['Sanitasi meja kerja, keyboard, dan monitor eksterior', 'Pembersihan area pantry, sink, dan microwave', 'Pembersihan kamar mandi kantor dan restock tisu', 'Vakum karpet atau pel lantai kantor', 'Pengosongan tong sampah setiap meja'],
   array['Pembersihan server room internal khusus', 'Pembersihan kaca luar gedung bertingkat'],
   'Bisnis & Kantor', 'commercial')
on conflict (id) do update set
  whats_included = excluded.whats_included,
  whats_excluded = excluded.whats_excluded,
  badge = excluded.badge,
  service_tier = excluded.service_tier;

-- 15. Seed data: 8 Add-ons
insert into public.add_ons (id, name, description, price, duration_minutes, is_active, icon_key)
values
  ('a0000001-0000-0000-0000-000000000001', 'Pembersihan Kulkas', 'Kuras dan bersihkan bagian dalam kulkas, rak, wadah telur, serta hilangkan bau tak sedap.', 45000, 35, true, 'fridge'),
  ('a0000002-0000-0000-0000-000000000002', 'Pembersihan Kompor & Hood', 'Hilangkan kerak minyak membandel dan jelaga pada kompor, tungku, dan cooker hood.', 40000, 30, true, 'stove'),
  ('a0000003-0000-0000-0000-000000000003', 'Kitchen Set Detailing', 'Lap kabinet dapur luar-dalam, rapikan perabot, dan bersihkan kerak sink cuci piring.', 50000, 40, true, 'kitchen'),
  ('a0000004-0000-0000-0000-000000000004', 'Setrika Pakaian', 'Setrika rapi dan lipat rapi pakaian hingga 15 potong (baju, celana, kemeja).', 35000, 45, true, 'iron'),
  ('a0000005-0000-0000-0000-000000000005', 'Cuci Piring & Sanitasi', 'Cuci tumpukan peralatan makan/masak dan sterilisasi area bak cuci.', 30000, 30, true, 'dishes'),
  ('a0000006-0000-0000-0000-000000000006', 'Pembersihan Kaca & Cermin', 'Lap kaca jendela, cermin rias, dan sekat shower hingga jernih berkilau bebas jamur air.', 35000, 30, true, 'glass'),
  ('a0000007-0000-0000-0000-000000000007', 'Vakum Tungau Upholstery', 'Vakum debu & tungau fabric untuk sofa 3-seater atau 1 kasur springbed ukuran queen.', 60000, 45, true, 'sofa'),
  ('a0000008-0000-0000-0000-000000000008', 'Sanitasi Kamar Mandi Ekstra', 'Pembersihan kerak kuning dinding shower, lantai, dan disinfeksi ekstra kloset.', 55000, 40, true, 'bathroom')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  duration_minutes = excluded.duration_minutes,
  is_active = excluded.is_active;
