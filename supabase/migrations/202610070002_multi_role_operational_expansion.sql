-- JoCleanCare Multi-Role Operational Expansion
-- Additive Migration: Preserves all existing tables, views, rows, and constraints.
-- Enhances profiles with is_active, admin staff management policies, and operational indices.

-- 1. Add is_active column to public.profiles if not present
alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- 2. Add composite index on profiles for role and active status
create index if not exists profiles_role_is_active_idx
  on public.profiles (role, is_active);

-- 3. Policy: Admins can update profiles (including is_active, phone, name)
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update to authenticated
using ((select jocleancare_private.has_profile_role('admin')))
with check ((select jocleancare_private.has_profile_role('admin')));

-- 4. Policy: Admins can insert staff profiles
drop policy if exists "Admins can insert staff profiles" on public.profiles;
create policy "Admins can insert staff profiles"
on public.profiles for insert to authenticated
with check ((select jocleancare_private.has_profile_role('admin')));

-- 5. Helper function for admin staff performance stats
create or replace function public.get_staff_performance_stats()
returns table (
  staff_id uuid,
  staff_name text,
  staff_email text,
  staff_phone text,
  is_active boolean,
  completed_jobs bigint,
  active_jobs bigint,
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
    p.email as staff_email,
    p.phone as staff_phone,
    p.is_active,
    count(distinct case when ss.status = 'completed' then ss.id end) as completed_jobs,
    count(distinct case when ss.status in ('scheduled', 'accepted', 'in_progress') then ss.id end) as active_jobs,
    coalesce(round(avg(br.rating)::numeric, 1), 5.0) as average_rating,
    count(distinct br.id) as total_reviews
  from public.profiles p
  left join public.staff_schedules ss on ss.staff_id = p.id and ss.status <> 'cancelled'
  left join public.booking_reviews br on br.staff_id = p.id
  where p.role = 'staff'
    and jocleancare_private.has_profile_role('admin')
  group by p.id, p.name, p.email, p.phone, p.is_active
  order by p.name asc;
$$;

revoke all on function public.get_staff_performance_stats() from public, anon;
grant execute on function public.get_staff_performance_stats() to authenticated;
