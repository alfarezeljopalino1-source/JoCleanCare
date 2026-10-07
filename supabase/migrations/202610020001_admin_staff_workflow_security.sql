-- Additive operational security for JoCleanCare.
-- Existing tables and rows are preserved. Apply after the two core migrations.

-- Admins may read operational profiles. Existing column-level UPDATE grants
-- remain limited to name/phone for a user's own profile; this policy adds no
-- UPDATE privilege and does not permit changing role, email, or auth password.
drop policy if exists "Admins can read profiles for operations" on public.profiles;
create policy "Admins can read profiles for operations"
on public.profiles for select to authenticated
using ((select jocleancare_private.has_profile_role('admin')));

-- Return only the assigned staff contact details for the authenticated
-- customer's own booking. Email and role are intentionally excluded.
create or replace function public.get_customer_booking_staff(p_booking_id uuid)
returns table (
  staff_name text,
  staff_phone text,
  scheduled_date date,
  start_time time,
  end_time time,
  assignment_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, p.phone, ss.scheduled_date, ss.start_time, ss.end_time, ss.status
  from public.bookings b
  join public.staff_schedules ss on ss.booking_id = b.id
  join public.profiles p on p.id = ss.staff_id and p.role = 'staff'
  where b.id = p_booking_id
    and b.customer_id = (select auth.uid())
    and b.status <> 'cancelled'
    and ss.status <> 'cancelled'
    and jocleancare_private.has_profile_role('customer');
$$;

revoke all on function public.get_customer_booking_staff(uuid) from public, anon;
grant execute on function public.get_customer_booking_staff(uuid) to authenticated;

-- Return the minimum customer and work details for bookings assigned to the
-- authenticated staff member. Service name is returned only as part of that
-- assigned job; this does not expose the service catalog or inactive services
-- through the services table. The function cannot enumerate other bookings.
create or replace function public.get_staff_assigned_job(p_booking_id uuid)
returns table (
  booking_id uuid,
  schedule_id uuid,
  service_name text,
  booking_date date,
  scheduled_date date,
  start_time time,
  end_time time,
  booking_status text,
  assignment_status text,
  address text,
  booking_notes text,
  customer_name text,
  customer_phone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, ss.id, s.name, b.booking_date, ss.scheduled_date,
         ss.start_time, ss.end_time, b.status, ss.status,
         b.address, b.notes, customer.name, customer.phone
  from public.staff_schedules ss
  join public.bookings b on b.id = ss.booking_id
  join public.profiles customer on customer.id = b.customer_id
  join public.services s on s.id = b.service_id
  where b.id = p_booking_id
    and ss.staff_id = (select auth.uid())
    and b.status <> 'cancelled'
    and ss.status <> 'cancelled'
    and jocleancare_private.has_profile_role('staff');
$$;

revoke all on function public.get_staff_assigned_job(uuid) from public, anon;
grant execute on function public.get_staff_assigned_job(uuid) to authenticated;

-- Enforce legal booking transitions for every database caller. Staff are
-- limited to the work transitions; their schedule updates below are the only
-- authorized path that advances a booking on their behalf.
create or replace function jocleancare_private.guard_booking_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  is_admin boolean := jocleancare_private.has_profile_role('admin');
  is_staff boolean := jocleancare_private.has_profile_role('staff');
  transition_allowed boolean := false;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if not is_admin and not is_staff then
    raise exception using errcode = '42501', message = 'Only operational roles may change booking status.';
  end if;

  transition_allowed := case old.status
    when 'pending' then new.status in ('confirmed', 'cancelled')
    when 'confirmed' then new.status in ('assigned', 'cancelled')
    when 'assigned' then new.status in ('in_progress', 'cancelled')
    when 'in_progress' then new.status = 'completed'
    else false
  end;

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

revoke all on function jocleancare_private.guard_booking_status_transition() from public;
drop trigger if exists bookings_guard_status_transition on public.bookings;
create trigger bookings_guard_status_transition
before update of status on public.bookings
for each row execute function jocleancare_private.guard_booking_status_transition();

-- Keep the booking date and any live assignment date consistent if an admin
-- edits a booking after its original request was created.
create or replace function jocleancare_private.guard_booking_schedule_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.booking_date is distinct from old.booking_date and exists (
    select 1 from public.staff_schedules ss
    where ss.booking_id = new.id
      and ss.status <> 'cancelled'
      and ss.scheduled_date <> new.booking_date
  ) then
    raise exception using errcode = '23514', message = 'Reschedule or cancel the active staff assignment before changing the booking date.';
  end if;
  return new;
end;
$$;

revoke all on function jocleancare_private.guard_booking_schedule_date() from public;
drop trigger if exists bookings_guard_schedule_date on public.bookings;
create trigger bookings_guard_schedule_date
before update of booking_date on public.bookings
for each row execute function jocleancare_private.guard_booking_schedule_date();

-- Validate schedule state transitions. Staff retain the existing RLS restriction
-- to their own rows and the existing trigger restriction on assignment fields.
create or replace function jocleancare_private.guard_schedule_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  is_admin boolean := jocleancare_private.has_profile_role('admin');
  is_staff boolean := jocleancare_private.has_profile_role('staff');
  transition_allowed boolean := false;
  current_booking_status text;
begin
  if tg_op = 'INSERT' then
    if not is_admin then
      raise exception using errcode = '42501', message = 'Only admins may create staff schedules.';
    end if;
    if new.status <> 'scheduled' then
      raise exception using errcode = '23514', message = 'New staff schedules must start as scheduled.';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if not is_admin and not is_staff then
    raise exception using errcode = '42501', message = 'Only assigned staff or admins may change schedule status.';
  end if;

  transition_allowed := case old.status
    when 'scheduled' then new.status in ('accepted', 'cancelled')
    when 'accepted' then new.status in ('in_progress', 'cancelled')
    when 'in_progress' then new.status = 'completed'
    else false
  end;

  if not transition_allowed then
    raise exception using errcode = '23514', message = 'Invalid staff schedule status transition.';
  end if;

  if is_staff and old.staff_id <> (select auth.uid()) then
    raise exception using errcode = '42501', message = 'Staff may only update their own schedule.';
  end if;

  select b.status into current_booking_status
  from public.bookings b
  where b.id = old.booking_id;

  if current_booking_status in ('cancelled', 'completed') and new.status <> 'cancelled' then
    raise exception using errcode = '23514', message = 'A terminal booking cannot receive active schedule changes.';
  end if;

  if new.status = 'accepted' and current_booking_status not in ('assigned', 'in_progress') then
    raise exception using errcode = '23514', message = 'The booking must be assigned before staff accepts the schedule.';
  end if;
  if new.status = 'in_progress' and current_booking_status not in ('assigned', 'in_progress') then
    raise exception using errcode = '23514', message = 'The booking must be assigned before work starts.';
  end if;
  if new.status = 'completed' and current_booking_status <> 'in_progress' then
    raise exception using errcode = '23514', message = 'The booking must be in progress before work can be completed.';
  end if;

  return new;
end;
$$;

revoke all on function jocleancare_private.guard_schedule_status_transition() from public;
drop trigger if exists staff_schedules_guard_status_transition on public.staff_schedules;
create trigger staff_schedules_guard_status_transition
before insert or update of status on public.staff_schedules
for each row execute function jocleancare_private.guard_schedule_status_transition();

-- Assignment validation and overlap protection run inside the write transaction.
-- NULL end_time means the schedule occupies the rest of that calendar day.
-- The per-staff transaction advisory lock serializes competing assignments,
-- avoiding the SELECT-then-INSERT race. Cancelled schedules do not block a slot.
create or replace function jocleancare_private.validate_staff_schedule_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_booking_date date;
  target_booking_status text;
  conflicting_schedule_id uuid;
  current_schedule_id uuid;
  core_assignment_fields_changed boolean;
  assignment_fields_changed boolean;
begin
  if tg_op = 'INSERT' then
    core_assignment_fields_changed := true;
    assignment_fields_changed := true;
  else
    current_schedule_id := old.id;
    core_assignment_fields_changed := new.booking_id is distinct from old.booking_id
      or new.staff_id is distinct from old.staff_id
      or new.scheduled_date is distinct from old.scheduled_date
      or new.start_time is distinct from old.start_time;
    assignment_fields_changed := core_assignment_fields_changed
      or new.end_time is distinct from old.end_time;
  end if;

  if not assignment_fields_changed then
    return new;
  end if;

  if core_assignment_fields_changed and not jocleancare_private.has_profile_role('admin') then
    raise exception using errcode = '42501', message = 'Only admins may create or change schedule assignments.';
  end if;

  if tg_op = 'UPDATE' and core_assignment_fields_changed then
    if old.status <> 'scheduled' then
      raise exception using errcode = '23514', message = 'Cancel and create a new schedule to reassign or reschedule accepted work.';
    end if;
  end if;

  if core_assignment_fields_changed and not exists (
    select 1 from public.profiles p
    where p.id = new.staff_id and p.role = 'staff'
  ) then
    raise exception using errcode = '23514', message = 'staff_id must reference a profile with the staff role.';
  end if;

  if core_assignment_fields_changed then
    select b.booking_date, b.status
      into target_booking_date, target_booking_status
    from public.bookings b
    where b.id = new.booking_id
    for update;

    if not found then
      raise exception using errcode = '23503', message = 'The selected booking does not exist.';
    end if;
    if target_booking_status not in ('confirmed', 'assigned') then
      raise exception using errcode = '23514', message = 'Only confirmed or assigned bookings can be scheduled.';
    end if;
    if new.scheduled_date <> target_booking_date then
      raise exception using errcode = '23514', message = 'The schedule date must match the booking date.';
    end if;
    if new.start_time >= time '24:00' then
      raise exception using errcode = '23514', message = 'A schedule must start before the end of the day.';
    end if;
  elsif not jocleancare_private.has_profile_role('admin')
    and (not jocleancare_private.has_profile_role('staff') or old.staff_id <> (select auth.uid())) then
    raise exception using errcode = '42501', message = 'Only the assigned staff member or an admin may change the end time.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20261002, pg_catalog.hashtext(new.staff_id::text));

  select ss.id into conflicting_schedule_id
  from public.staff_schedules ss
  where ss.staff_id = new.staff_id
    and ss.scheduled_date = new.scheduled_date
    and ss.status <> 'cancelled'
    and (current_schedule_id is null or ss.id <> current_schedule_id)
    and new.start_time < coalesce(ss.end_time, time '24:00')
    and ss.start_time < coalesce(new.end_time, time '24:00')
  limit 1;

  if conflicting_schedule_id is not null then
    raise exception using errcode = '23P01', message = 'The staff member already has an overlapping schedule.';
  end if;

  return new;
end;
$$;

revoke all on function jocleancare_private.validate_staff_schedule_assignment() from public;
drop trigger if exists staff_schedules_validate_assignment on public.staff_schedules;
create trigger staff_schedules_validate_assignment
before insert or update on public.staff_schedules
for each row execute function jocleancare_private.validate_staff_schedule_assignment();

-- An admin's first assignment advances a confirmed booking to assigned.
-- Staff schedule progress advances the booking only through legal transitions.
create or replace function jocleancare_private.sync_booking_from_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.bookings
    set status = 'assigned'
    where id = new.booking_id and status = 'confirmed';
    return new;
  end if;

  if new.status = 'in_progress' and old.status is distinct from new.status then
    update public.bookings
    set status = 'in_progress'
    where id = new.booking_id and status = 'assigned';
  elsif new.status = 'completed' and old.status is distinct from new.status then
    update public.bookings b
    set status = 'completed'
    where b.id = new.booking_id
      and b.status = 'in_progress'
      and not exists (
        select 1 from public.staff_schedules ss
        where ss.booking_id = new.booking_id
          and ss.id <> new.id
          and ss.status not in ('completed', 'cancelled')
      );
  end if;

  return new;
end;
$$;

revoke all on function jocleancare_private.sync_booking_from_schedule() from public;
drop trigger if exists staff_schedules_sync_booking on public.staff_schedules;
create trigger staff_schedules_sync_booking
after insert or update of status on public.staff_schedules
for each row execute function jocleancare_private.sync_booking_from_schedule();

-- Cancelling a booking cancels any schedule which has not begun. The schedule
-- transition trigger permits these scheduled/accepted -> cancelled changes.
create or replace function jocleancare_private.cancel_pending_schedules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    update public.staff_schedules
    set status = 'cancelled'
    where booking_id = new.id
      and status in ('scheduled', 'accepted');
  end if;
  return new;
end;
$$;

revoke all on function jocleancare_private.cancel_pending_schedules() from public;
drop trigger if exists bookings_cancel_pending_schedules on public.bookings;
create trigger bookings_cancel_pending_schedules
after update of status on public.bookings
for each row execute function jocleancare_private.cancel_pending_schedules();
