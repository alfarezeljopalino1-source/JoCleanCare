-- JoCleanCare Auth profile table and least-privilege policies.
-- Apply this migration in the Supabase SQL Editor or with the Supabase CLI.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text unique,
  phone text,
  role text not null default 'customer'
    check (role in ('customer', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auth signup (email or OAuth) creates a customer profile. Role is never read
-- from user metadata, so public registration cannot grant elevated privileges.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Pelanggan'
    ),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, insert on table public.profiles to authenticated;
-- Column-level update grants make role/email immutable to a signed-in user.
grant update (name, phone) on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can create their customer profile" on public.profiles;
create policy "Users can create their customer profile"
on public.profiles for insert to authenticated
with check (
  (select auth.uid()) = id
  and role = 'customer'
  and email is not distinct from (select auth.jwt() ->> 'email')
);

drop policy if exists "Users can update their own contact details" on public.profiles;
create policy "Users can update their own contact details"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
