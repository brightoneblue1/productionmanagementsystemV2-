-- ============================================================
-- SHIFT JOBS — task assignment within shifts
-- Run this in Supabase SQL Editor
-- ============================================================

create type shift_job_priority as enum ('low', 'normal', 'high', 'urgent');
create type shift_job_status   as enum ('assigned', 'in_progress', 'completed', 'skipped');

create table shift_jobs (
  id           uuid primary key default uuid_generate_v4(),
  shift_id     uuid not null references shifts(id) on delete cascade,
  title        text not null,
  description  text,
  assigned_to  uuid references profiles(id) on delete set null,
  priority     shift_job_priority not null default 'normal',
  status       shift_job_status   not null default 'assigned',
  due_time     time,
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  notes        text,
  created_by   uuid references profiles(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger shift_jobs_updated_at
  before update on shift_jobs
  for each row execute function handle_updated_at();

alter table shift_jobs enable row level security;

-- Anyone on the shift can read jobs; supervisors/admins can create/update
create policy "Read shift_jobs"   on shift_jobs for select using (auth.uid() is not null);
create policy "Create shift_jobs" on shift_jobs for insert with check (current_user_role() in ('admin', 'supervisor'));
create policy "Update shift_jobs" on shift_jobs for update using (auth.uid() is not null);
create policy "Delete shift_jobs" on shift_jobs for delete using (current_user_role() in ('admin', 'supervisor'));
