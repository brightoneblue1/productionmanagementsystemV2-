-- ============================================================
-- WORTH OPS — FULL DATABASE SCHEMA
-- Paste this into Supabase SQL Editor and click "Run"
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";


-- ============================================================
-- UTILITY: auto-update updated_at columns
-- ============================================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- 1. PROFILES  (extends Supabase auth.users)
-- ============================================================
create type user_role as enum ('admin', 'supervisor', 'operator', 'tank_filler', 'kapa');

create table profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text not null,
  role        user_role not null default 'operator',
  employee_id text unique,
  phone       text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'operator')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- 2. SECTIONS — plants, tank farms, tanks
-- ============================================================
create table plants (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  code        text unique not null,   -- e.g. 'P1', 'P2'
  description text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table tank_farms (
  id              uuid primary key default uuid_generate_v4(),
  plant_id        uuid references plants(id) on delete cascade,
  name            text not null,
  code            text unique not null,  -- e.g. 'TF1'
  capacity_total  numeric,
  created_at      timestamptz default now()
);

create table tanks (
  id                  uuid primary key default uuid_generate_v4(),
  tank_farm_id        uuid references tank_farms(id) on delete cascade,
  name                text not null,
  code                text unique not null,   -- e.g. 'T001'
  capacity_liters     numeric not null,
  product_type        text,                   -- e.g. 'crude', 'diesel', 'petrol'
  min_level_percent   numeric default 10,
  max_level_percent   numeric default 90,
  current_level_liters numeric default 0,
  is_active           boolean default true,
  created_at          timestamptz default now()
);

-- Supervisor → Plant assignments
create table plant_supervisors (
  id          uuid primary key default uuid_generate_v4(),
  plant_id    uuid references plants(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(plant_id, profile_id)
);

-- Operator → Plant assignments
create table plant_operators (
  id          uuid primary key default uuid_generate_v4(),
  plant_id    uuid references plants(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(plant_id, profile_id)
);

-- Tank filler → Tank farm assignments
create table farm_fillers (
  id            uuid primary key default uuid_generate_v4(),
  tank_farm_id  uuid references tank_farms(id) on delete cascade,
  profile_id    uuid references profiles(id) on delete cascade,
  assigned_at   timestamptz default now(),
  unique(tank_farm_id, profile_id)
);


-- ============================================================
-- 3. SHIFTS & PERSONNEL ASSIGNMENTS
-- ============================================================
create type shift_type as enum ('morning', 'afternoon', 'night');

create table shifts (
  id          uuid primary key default uuid_generate_v4(),
  plant_id    uuid references plants(id) on delete cascade,
  shift_type  shift_type not null,
  shift_date  date not null,
  start_time  time not null,
  end_time    time not null,
  created_by  uuid references profiles(id),
  notes       text,
  created_at  timestamptz default now()
);

create table shift_assignments (
  id              uuid primary key default uuid_generate_v4(),
  shift_id        uuid references shifts(id) on delete cascade,
  profile_id      uuid references profiles(id) on delete cascade,
  role_on_shift   text,
  notes           text,
  unique(shift_id, profile_id)
);


-- ============================================================
-- 4. PRODUCTION SCHEDULES & BATCHES
-- ============================================================
create type schedule_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
create type batch_status    as enum ('pending', 'running', 'completed', 'failed');

create table production_schedules (
  id              uuid primary key default uuid_generate_v4(),
  plant_id        uuid references plants(id),
  title           text not null,
  scheduled_date  date not null,
  status          schedule_status default 'planned',
  created_by      uuid references profiles(id),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger production_schedules_updated_at
  before update on production_schedules
  for each row execute function handle_updated_at();

create table production_batches (
  id                    uuid primary key default uuid_generate_v4(),
  schedule_id           uuid references production_schedules(id) on delete cascade,
  plant_id              uuid references plants(id),
  batch_number          text not null,
  product_type          text not null,
  target_volume_liters  numeric,
  actual_volume_liters  numeric,
  start_time            timestamptz,
  end_time              timestamptz,
  status                batch_status default 'pending',
  operator_id           uuid references profiles(id),
  notes                 text,
  created_at            timestamptz default now()
);


-- ============================================================
-- 5. TANK READINGS, FILL EVENTS, EQUIPMENT STATES
-- ============================================================
create table tank_readings (
  id                  uuid primary key default uuid_generate_v4(),
  tank_id             uuid references tanks(id) on delete cascade,
  level_liters        numeric not null,
  level_percent       numeric,   -- stored directly (calculated before insert)
  temperature_celsius numeric,
  recorded_by         uuid references profiles(id),
  recorded_at         timestamptz default now()
);

-- Update the tank's current level when a new reading is inserted
create or replace function sync_tank_level()
returns trigger as $$
begin
  update tanks set current_level_liters = new.level_liters
  where id = new.tank_id;
  return new;
end;
$$ language plpgsql;

create trigger tank_reading_sync
  after insert on tank_readings
  for each row execute function sync_tank_level();


create type fill_status as enum ('started', 'in_progress', 'completed', 'aborted');

create table tank_fill_events (
  id                    uuid primary key default uuid_generate_v4(),
  tank_id               uuid references tanks(id) on delete cascade,
  filler_id             uuid references profiles(id),
  level_before_liters   numeric,
  level_after_liters    numeric,
  volume_added_liters   numeric,
  started_at            timestamptz default now(),
  completed_at          timestamptz,
  status                fill_status default 'started',
  notes                 text
);

create table equipment_states (
  id               uuid primary key default uuid_generate_v4(),
  tank_id          uuid references tanks(id) on delete cascade,
  equipment_name   text not null,   -- e.g. 'inlet_valve', 'outlet_valve', 'pump'
  equipment_type   text not null,   -- 'valve' or 'motor'
  state            text not null,   -- 'open'/'closed'/'partial' or 'on'/'off'/'fault'
  changed_by       uuid references profiles(id),
  changed_at       timestamptz default now()
);


-- ============================================================
-- 6. SAFETY & PERMITS
-- ============================================================
create type permit_status as enum ('pending', 'approved', 'active', 'closed', 'rejected');

create table work_permits (
  id                uuid primary key default uuid_generate_v4(),
  plant_id          uuid references plants(id),
  permit_number     text unique not null,
  work_description  text not null,
  location          text,
  requested_by      uuid references profiles(id),
  approved_by       uuid references profiles(id),
  status            permit_status default 'pending',
  valid_from        timestamptz,
  valid_until       timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create trigger work_permits_updated_at
  before update on work_permits
  for each row execute function handle_updated_at();

create table ppe_issuances (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid references profiles(id),
  plant_id    uuid references plants(id),
  ppe_items   jsonb not null,   -- [{"item": "helmet", "qty": 1}, ...]
  issued_by   uuid references profiles(id),
  issued_at   timestamptz default now(),
  returned_at timestamptz,
  notes       text
);

create table safety_checkpoints (
  id               uuid primary key default uuid_generate_v4(),
  permit_id        uuid references work_permits(id) on delete cascade,
  checkpoint_name  text not null,
  is_completed     boolean default false,
  completed_by     uuid references profiles(id),
  completed_at     timestamptz,
  notes            text
);


-- ============================================================
-- 7. LAB REPORTS & QUALITY VALUES
-- ============================================================
create type report_status as enum ('draft', 'submitted', 'approved', 'rejected');

create table lab_reports (
  id              uuid primary key default uuid_generate_v4(),
  batch_id        uuid references production_batches(id),
  plant_id        uuid references plants(id),
  report_number   text unique not null,
  sample_taken_at timestamptz not null,
  submitted_by    uuid references profiles(id),
  approved_by     uuid references profiles(id),
  status          report_status default 'draft',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger lab_reports_updated_at
  before update on lab_reports
  for each row execute function handle_updated_at();

create table quality_values (
  id              uuid primary key default uuid_generate_v4(),
  report_id       uuid references lab_reports(id) on delete cascade,
  parameter_name  text not null,   -- e.g. 'viscosity', 'density', 'flash_point'
  value           numeric not null,
  unit            text not null,   -- e.g. 'cSt', 'kg/m3', '°C'
  min_spec        numeric,
  max_spec        numeric,
  is_within_spec  boolean          -- set by app before insert
);


-- ============================================================
-- 8. PROBLEMS & INCIDENTS
-- ============================================================
create type problem_severity as enum ('low', 'medium', 'high', 'critical');
create type problem_status   as enum ('open', 'in_progress', 'resolved', 'closed');

create table problems (
  id            uuid primary key default uuid_generate_v4(),
  plant_id      uuid references plants(id),
  tank_id       uuid references tanks(id),
  title         text not null,
  description   text not null,
  severity      problem_severity default 'medium',
  status        problem_status default 'open',
  reported_by   uuid references profiles(id),
  assigned_to   uuid references profiles(id),
  reported_at   timestamptz default now(),
  resolved_at   timestamptz,
  updated_at    timestamptz default now()
);

create trigger problems_updated_at
  before update on problems
  for each row execute function handle_updated_at();

create table problem_updates (
  id          uuid primary key default uuid_generate_v4(),
  problem_id  uuid references problems(id) on delete cascade,
  update_text text not null,
  updated_by  uuid references profiles(id),
  created_at  timestamptz default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles          enable row level security;
alter table plants             enable row level security;
alter table tank_farms         enable row level security;
alter table tanks              enable row level security;
alter table plant_supervisors  enable row level security;
alter table plant_operators    enable row level security;
alter table farm_fillers       enable row level security;
alter table shifts             enable row level security;
alter table shift_assignments  enable row level security;
alter table production_schedules enable row level security;
alter table production_batches enable row level security;
alter table tank_readings      enable row level security;
alter table tank_fill_events   enable row level security;
alter table equipment_states   enable row level security;
alter table work_permits       enable row level security;
alter table ppe_issuances      enable row level security;
alter table safety_checkpoints enable row level security;
alter table lab_reports        enable row level security;
alter table quality_values     enable row level security;
alter table problems           enable row level security;
alter table problem_updates    enable row level security;

-- Helper: get the current user's role
create or replace function current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean as $$
  select current_user_role() = 'admin';
$$ language sql security definer stable;

-- PROFILES
create policy "Users can view all profiles"    on profiles for select using (auth.uid() is not null);
create policy "Users can update own profile"   on profiles for update using (auth.uid() = id);
create policy "Admin can update any profile"   on profiles for update using (is_admin());
create policy "Admin can insert profiles"      on profiles for insert with check (is_admin());

-- PLANTS, TANK FARMS, TANKS — everyone reads, admin writes
create policy "Anyone authenticated can read plants"     on plants for select using (auth.uid() is not null);
create policy "Admin can manage plants"                  on plants for all using (is_admin());

create policy "Anyone authenticated can read tank_farms" on tank_farms for select using (auth.uid() is not null);
create policy "Admin can manage tank_farms"              on tank_farms for all using (is_admin());

create policy "Anyone authenticated can read tanks"      on tanks for select using (auth.uid() is not null);
create policy "Admin can manage tanks"                   on tanks for all using (is_admin());

-- ASSIGNMENT TABLES — read by all, write by admin
create policy "Read plant_supervisors" on plant_supervisors for select using (auth.uid() is not null);
create policy "Admin manages plant_supervisors" on plant_supervisors for all using (is_admin());

create policy "Read plant_operators" on plant_operators for select using (auth.uid() is not null);
create policy "Admin manages plant_operators" on plant_operators for all using (is_admin());

create policy "Read farm_fillers" on farm_fillers for select using (auth.uid() is not null);
create policy "Admin manages farm_fillers" on farm_fillers for all using (is_admin());

-- SHIFTS — read by all, supervisors and admin create
create policy "Read shifts" on shifts for select using (auth.uid() is not null);
create policy "Supervisors and admin create shifts" on shifts for insert
  with check (current_user_role() in ('admin', 'supervisor'));
create policy "Admin updates shifts" on shifts for update using (is_admin());

create policy "Read shift_assignments" on shift_assignments for select using (auth.uid() is not null);
create policy "Supervisors and admin manage shift_assignments" on shift_assignments for all
  using (current_user_role() in ('admin', 'supervisor'));

-- PRODUCTION — read by all, operators+ create
create policy "Read production_schedules" on production_schedules for select using (auth.uid() is not null);
create policy "Supervisors and admin manage schedules" on production_schedules for all
  using (current_user_role() in ('admin', 'supervisor'));

create policy "Read production_batches" on production_batches for select using (auth.uid() is not null);
create policy "Operators and above manage batches" on production_batches for all
  using (current_user_role() in ('admin', 'supervisor', 'operator'));

-- TANK DATA — read by all, fillers and operators insert
create policy "Read tank_readings" on tank_readings for select using (auth.uid() is not null);
create policy "Fillers and operators insert readings" on tank_readings for insert
  with check (current_user_role() in ('admin', 'supervisor', 'operator', 'tank_filler'));

create policy "Read tank_fill_events" on tank_fill_events for select using (auth.uid() is not null);
create policy "Fillers insert fill events" on tank_fill_events for insert
  with check (current_user_role() in ('admin', 'supervisor', 'tank_filler'));
create policy "Fillers update own fill events" on tank_fill_events for update
  using (auth.uid() = filler_id or is_admin());

create policy "Read equipment_states" on equipment_states for select using (auth.uid() is not null);
create policy "Operators and above manage equipment" on equipment_states for insert
  with check (current_user_role() in ('admin', 'supervisor', 'operator', 'tank_filler'));

-- SAFETY
create policy "Read work_permits" on work_permits for select using (auth.uid() is not null);
create policy "Create work_permits" on work_permits for insert with check (auth.uid() is not null);
create policy "Supervisors approve permits" on work_permits for update
  using (current_user_role() in ('admin', 'supervisor'));

create policy "Read ppe_issuances" on ppe_issuances for select using (auth.uid() is not null);
create policy "Supervisors issue PPE" on ppe_issuances for insert
  with check (current_user_role() in ('admin', 'supervisor'));

create policy "Read safety_checkpoints" on safety_checkpoints for select using (auth.uid() is not null);
create policy "Update safety_checkpoints" on safety_checkpoints for all
  using (current_user_role() in ('admin', 'supervisor', 'operator'));

-- LAB REPORTS
create policy "Read lab_reports" on lab_reports for select using (auth.uid() is not null);
create policy "Operators submit lab reports" on lab_reports for insert
  with check (current_user_role() in ('admin', 'supervisor', 'operator'));
create policy "Supervisors approve lab reports" on lab_reports for update
  using (current_user_role() in ('admin', 'supervisor'));

create policy "Read quality_values" on quality_values for select using (auth.uid() is not null);
create policy "Insert quality_values" on quality_values for insert
  with check (current_user_role() in ('admin', 'supervisor', 'operator'));

-- PROBLEMS
create policy "Read problems" on problems for select using (auth.uid() is not null);
create policy "Anyone can report a problem" on problems for insert with check (auth.uid() is not null);
create policy "Assigned or admin can update problem" on problems for update
  using (auth.uid() = assigned_to or auth.uid() = reported_by or current_user_role() in ('admin', 'supervisor'));

create policy "Read problem_updates" on problem_updates for select using (auth.uid() is not null);
create policy "Anyone can add problem updates" on problem_updates for insert with check (auth.uid() is not null);


-- ============================================================
-- SEED DATA — starter plants and tank farms
-- (Update names/codes to match your actual facility)
-- ============================================================
insert into plants (name, code, description) values
  ('Plant 1', 'P1', 'Main processing plant'),
  ('Plant 2', 'P2', 'Secondary processing plant');

insert into tank_farms (plant_id, name, code) values
  ((select id from plants where code = 'P1'), 'Tank Farm 1', 'TF1'),
  ((select id from plants where code = 'P1'), 'Tank Farm 2', 'TF2'),
  ((select id from plants where code = 'P1'), 'Tank Farm 3', 'TF3'),
  ((select id from plants where code = 'P2'), 'Tank Farm 4', 'TF4'),
  ((select id from plants where code = 'P2'), 'Tank Farm 5', 'TF5');
