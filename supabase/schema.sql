-- ============================================================
-- WORTH OPS — FULL DATABASE SCHEMA
-- Paste into Supabase SQL Editor and click "Run".
-- Safe to re-run: resets the public schema first (auth is untouched).
-- ============================================================

-- Wipe and recreate public schema so re-runs always work cleanly
drop schema public cascade;
create schema public;
grant all on schema public to postgres;
grant all on schema public to public;
grant usage on schema public to anon, authenticated;

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
  code        text unique not null,
  description text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table tank_farms (
  id              uuid primary key default uuid_generate_v4(),
  plant_id        uuid references plants(id) on delete cascade,
  name            text not null,
  code            text unique not null,
  capacity_total  numeric,
  created_at      timestamptz default now()
);

create table tanks (
  id                    uuid primary key default uuid_generate_v4(),
  tank_farm_id          uuid references tank_farms(id) on delete cascade,
  name                  text not null,
  code                  text unique not null,
  capacity_liters       numeric not null,
  product_type          text,
  min_level_percent     numeric default 10,
  max_level_percent     numeric default 90,
  alert_low_percent     numeric default 25,
  alert_high_percent    numeric default 80,
  current_level_liters  numeric default 0,
  pump_flow_rate_lph    numeric default 0,
  pump_speed_factor     numeric default 1.0,
  assigned_filler_id    uuid references profiles(id),
  is_active             boolean default true,
  created_at            timestamptz default now()
);

create table plant_supervisors (
  id          uuid primary key default uuid_generate_v4(),
  plant_id    uuid references plants(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(plant_id, profile_id)
);

create table plant_operators (
  id          uuid primary key default uuid_generate_v4(),
  plant_id    uuid references plants(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  assigned_at timestamptz default now(),
  unique(plant_id, profile_id)
);

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

create table shift_reports (
  id                       uuid primary key default uuid_generate_v4(),
  shift_id                 uuid not null references shifts(id) on delete cascade unique,
  total_produced_liters    numeric not null default 0,
  spillage_liters          numeric not null default 0,
  spillage_description     text,
  non_conforming_liters    numeric not null default 0,
  non_conforming_reason    text,
  net_production_liters    numeric generated always as (
                             total_produced_liters - spillage_liters - non_conforming_liters
                           ) stored,
  outstanding_issues       text,
  handover_notes           text,
  status                   text not null default 'submitted'
                             check (status in ('draft', 'submitted', 'signed_off')),
  signed_off_by            uuid references profiles(id),
  signed_off_at            timestamptz,
  created_at               timestamptz default now()
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
-- 5. TANK READINGS, FILL EVENTS, CONNECTIONS, CLEANING
-- ============================================================
create table tank_readings (
  id                  uuid primary key default uuid_generate_v4(),
  tank_id             uuid references tanks(id) on delete cascade,
  level_liters        numeric not null,
  level_percent       numeric,
  temperature_celsius numeric,
  recorded_by         uuid references profiles(id),
  created_at          timestamptz default now()
);

-- Sync tank's current level when a new reading is inserted
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
  operator_id           uuid references profiles(id),
  volume_added_liters   numeric,
  tanker_reference      text,
  product_type          text,
  level_before_liters   numeric,
  level_after_liters    numeric,
  started_at            timestamptz default now(),
  completed_at          timestamptz,
  status                fill_status default 'started',
  notes                 text
);

create table tank_connections (
  id                  uuid primary key default uuid_generate_v4(),
  tank_id             uuid not null references tanks(id) on delete cascade,
  direction           text not null check (direction in ('in', 'out')),
  connection_type     text not null check (connection_type in ('feed', 'drain', 'circulation', 'transfer')),
  connected_tank_id   uuid references tanks(id),
  connected_plant_id  uuid references plants(id),
  pump_name           text,
  flow_rate_lph       numeric default 0,
  notes               text,
  is_active           boolean default true,
  created_at          timestamptz default now()
);

create table tank_cleaning_schedules (
  id               uuid primary key default uuid_generate_v4(),
  tank_id          uuid not null references tanks(id) on delete cascade,
  frequency_days   integer not null default 90,
  last_cleaned_at  timestamptz,
  next_due_at      timestamptz,
  procedure        text,
  notes            text,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

create table tank_cleaning_logs (
  id               uuid primary key default uuid_generate_v4(),
  tank_id          uuid not null references tanks(id) on delete cascade,
  schedule_id      uuid references tank_cleaning_schedules(id),
  cleaned_at       timestamptz not null default now(),
  cleaned_by       uuid references profiles(id),
  duration_hours   numeric,
  observations     text,
  procedure_notes  text,
  created_at       timestamptz default now()
);

create table equipment_states (
  id               uuid primary key default uuid_generate_v4(),
  tank_id          uuid references tanks(id) on delete cascade,
  equipment_name   text not null,
  equipment_type   text not null,
  state            text not null,
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
  ppe_items   jsonb not null,
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
  status           report_status default 'draft',
  notes            text,
  rejection_reason text,
  created_at       timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger lab_reports_updated_at
  before update on lab_reports
  for each row execute function handle_updated_at();

create table quality_values (
  id              uuid primary key default uuid_generate_v4(),
  report_id       uuid references lab_reports(id) on delete cascade,
  parameter_name  text not null,
  value           numeric not null,
  unit            text not null,
  min_spec        numeric,
  max_spec        numeric,
  is_within_spec  boolean
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
  priority      integer,
  due_date      date,
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
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles               enable row level security;
alter table plants                 enable row level security;
alter table tank_farms             enable row level security;
alter table tanks                  enable row level security;
alter table plant_supervisors      enable row level security;
alter table plant_operators        enable row level security;
alter table farm_fillers           enable row level security;
alter table shifts                 enable row level security;
alter table shift_assignments      enable row level security;
alter table shift_reports          enable row level security;
alter table production_schedules   enable row level security;
alter table production_batches     enable row level security;
alter table tank_readings          enable row level security;
alter table tank_fill_events       enable row level security;
alter table tank_connections       enable row level security;
alter table tank_cleaning_schedules enable row level security;
alter table tank_cleaning_logs     enable row level security;
alter table equipment_states       enable row level security;
alter table work_permits           enable row level security;
alter table ppe_issuances          enable row level security;
alter table safety_checkpoints     enable row level security;
alter table lab_reports            enable row level security;
alter table quality_values         enable row level security;
alter table problems               enable row level security;
alter table problem_updates        enable row level security;

-- Role helpers
create or replace function current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_admin()
returns boolean as $$
  select current_user_role() = 'admin';
$$ language sql security definer stable;

-- PROFILES
create policy "Users can view all profiles"  on profiles for select using (auth.uid() is not null);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admin can update any profile" on profiles for update using (is_admin());
create policy "Admin can insert profiles"    on profiles for insert with check (is_admin());

-- PLANTS / TANK FARMS / TANKS
create policy "Read plants"      on plants      for select using (auth.uid() is not null);
create policy "Admin manage plants" on plants   for all    using (is_admin());

create policy "Read tank_farms"      on tank_farms  for select using (auth.uid() is not null);
create policy "Admin manage tank_farms" on tank_farms for all  using (is_admin());

create policy "Read tanks"           on tanks for select using (auth.uid() is not null);
create policy "Admin manage tanks"   on tanks for all    using (is_admin());
create policy "Supervisors update tanks" on tanks for update
  using (current_user_role() in ('admin', 'supervisor'));

-- ASSIGNMENT TABLES
create policy "Read plant_supervisors" on plant_supervisors for select using (auth.uid() is not null);
create policy "Admin manage plant_supervisors" on plant_supervisors for all using (is_admin());

create policy "Read plant_operators" on plant_operators for select using (auth.uid() is not null);
create policy "Admin manage plant_operators" on plant_operators for all using (is_admin());

create policy "Read farm_fillers" on farm_fillers for select using (auth.uid() is not null);
create policy "Admin manage farm_fillers" on farm_fillers for all using (is_admin());

-- SHIFTS
create policy "Read shifts" on shifts for select using (auth.uid() is not null);
create policy "Supervisors create shifts" on shifts for insert
  with check (current_user_role() in ('admin', 'supervisor'));
create policy "Admin update shifts" on shifts for update using (is_admin());

create policy "Read shift_assignments" on shift_assignments for select using (auth.uid() is not null);
create policy "Supervisors manage shift_assignments" on shift_assignments for all
  using (current_user_role() in ('admin', 'supervisor'));

create policy "Read shift_reports" on shift_reports for select using (auth.uid() is not null);
create policy "Authenticated manage shift_reports" on shift_reports for all
  using (auth.uid() is not null);

-- PRODUCTION
create policy "Read production_schedules" on production_schedules for select using (auth.uid() is not null);
create policy "Supervisors manage schedules" on production_schedules for all
  using (current_user_role() in ('admin', 'supervisor'));

create policy "Read production_batches" on production_batches for select using (auth.uid() is not null);
create policy "Operators manage batches" on production_batches for all
  using (current_user_role() in ('admin', 'supervisor', 'operator'));

-- TANK DATA
create policy "Read tank_readings" on tank_readings for select using (auth.uid() is not null);
create policy "Fillers insert readings" on tank_readings for insert
  with check (current_user_role() in ('admin', 'supervisor', 'operator', 'tank_filler'));

create policy "Read tank_fill_events" on tank_fill_events for select using (auth.uid() is not null);
create policy "Fillers insert fill events" on tank_fill_events for insert
  with check (current_user_role() in ('admin', 'supervisor', 'tank_filler'));
create policy "Fillers update own fill events" on tank_fill_events for update
  using (auth.uid() = operator_id or is_admin());

create policy "Read tank_connections" on tank_connections for select using (auth.uid() is not null);
create policy "Supervisors manage tank_connections" on tank_connections for all
  using (current_user_role() in ('admin', 'supervisor'));

create policy "Read tank_cleaning_schedules" on tank_cleaning_schedules for select using (auth.uid() is not null);
create policy "Supervisors manage cleaning schedules" on tank_cleaning_schedules for all
  using (current_user_role() in ('admin', 'supervisor'));

create policy "Read tank_cleaning_logs" on tank_cleaning_logs for select using (auth.uid() is not null);
create policy "Authenticated insert cleaning logs" on tank_cleaning_logs for insert
  with check (auth.uid() is not null);

create policy "Read equipment_states" on equipment_states for select using (auth.uid() is not null);
create policy "Operators manage equipment" on equipment_states for insert
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
create policy "Assigned or admin update problem" on problems for update
  using (auth.uid() = assigned_to or auth.uid() = reported_by
         or current_user_role() in ('admin', 'supervisor'));

create policy "Read problem_updates" on problem_updates for select using (auth.uid() is not null);
create policy "Anyone can add problem updates" on problem_updates for insert with check (auth.uid() is not null);


-- ============================================================
-- 9. REPORTING MODULES
-- ============================================================

-- Machine & Equipment Reports
create table equipment_reports (
  id                uuid primary key default uuid_generate_v4(),
  plant_id          uuid references plants(id),
  shift_id          uuid references shifts(id),
  report_date       date not null default current_date,
  equipment_name    text not null,
  equipment_type    text not null,
  status            text not null check (status in ('operational','degraded','fault','offline','maintenance')),
  uptime_hours      numeric,
  downtime_hours    numeric,
  fault_description text,
  action_taken      text,
  reported_by       uuid references profiles(id),
  created_at        timestamptz default now()
);

-- Safety & Audit Reports
create type safety_report_type as enum ('daily_safety','incident','near_miss','ppe_audit','inspection');

create table safety_reports (
  id                uuid primary key default uuid_generate_v4(),
  plant_id          uuid references plants(id),
  report_date       date not null default current_date,
  report_type       safety_report_type not null,
  title             text not null,
  description       text not null,
  severity          problem_severity,
  workers_count     integer,
  ppe_compliant     boolean,
  corrective_action text,
  submitted_by      uuid references profiles(id),
  reviewed_by       uuid references profiles(id),
  status            text not null default 'open' check (status in ('open','under_review','closed')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create trigger safety_reports_updated_at
  before update on safety_reports
  for each row execute function handle_updated_at();

-- Plant Area / Daily Production Reports
create table plant_daily_reports (
  id                         uuid primary key default uuid_generate_v4(),
  plant_id                   uuid not null references plants(id),
  report_date                date not null,
  shift_id                   uuid references shifts(id),
  crude_received_liters      numeric default 0,
  crude_type                 text,
  product_produced_liters    numeric default 0,
  product_type               text,
  olein_yield_percent        numeric,
  stearin_yield_percent      numeric,
  ffa_percent                numeric,
  moisture_percent           numeric,
  capacity_utilization       numeric,
  operating_hours            numeric,
  notes                      text,
  status                     text not null default 'draft' check (status in ('draft','submitted','approved')),
  submitted_by               uuid references profiles(id),
  approved_by                uuid references profiles(id),
  created_at                 timestamptz default now(),
  unique(plant_id, report_date, shift_id)
);

-- RLS
alter table equipment_reports  enable row level security;
alter table safety_reports     enable row level security;
alter table plant_daily_reports enable row level security;

create policy "Read equipment_reports"   on equipment_reports   for select using (auth.uid() is not null);
create policy "Submit equipment_reports" on equipment_reports   for insert with check (auth.uid() is not null);
create policy "Update equipment_reports" on equipment_reports   for update using (auth.uid() is not null);

create policy "Read safety_reports"      on safety_reports      for select using (auth.uid() is not null);
create policy "Submit safety_reports"    on safety_reports      for insert with check (auth.uid() is not null);
create policy "Update safety_reports"    on safety_reports      for update using (is_admin() or current_user_role() = 'supervisor');

create policy "Read plant_daily_reports"   on plant_daily_reports for select using (auth.uid() is not null);
create policy "Submit plant_daily_reports" on plant_daily_reports for insert with check (auth.uid() is not null);
create policy "Approve plant_daily_reports" on plant_daily_reports for update using (is_admin() or current_user_role() = 'supervisor');

-- ============================================================
-- PLANT PROCEDURES (SOP / document store, per plant × section)
-- ============================================================
create table plant_procedures (
  id          uuid primary key default uuid_generate_v4(),
  plant_id    uuid not null references plants(id) on delete cascade,
  section_id  text not null,
  data        jsonb not null default '{}',
  updated_by  uuid references profiles(id),
  updated_at  timestamptz default now(),
  unique (plant_id, section_id)
);

alter table plant_procedures enable row level security;
create policy "Read plant_procedures"   on plant_procedures for select using (auth.uid() is not null);
create policy "Upsert plant_procedures" on plant_procedures for insert with check (auth.uid() is not null);
create policy "Update plant_procedures" on plant_procedures for update using (auth.uid() is not null);

-- ============================================================
-- ROLE GRANTS
-- (needed after drop schema public cascade wipes default Supabase grants)
-- ============================================================
grant all on all tables    in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
alter default privileges in schema public grant all on tables    to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant select on tables to anon;

-- ============================================================
-- SEED DATA
-- ============================================================
insert into plants (name, code, description) values
  ('Soya Degumming',        'P1', 'Crude soya bean oil → degummed soya bean oil'),
  ('Sunflower Processing',  'P2', 'Crude sunflower oil → refined sunflower oil'),
  ('Palm RBD',              'P3', 'Crude palm oil (CPO) → refined, bleached & deodorised (RBD)'),
  ('Soya Neutralisation',   'P4', 'Degummed soya bean oil → neutralised soya bean oil'),
  ('Fractionation 1',       'P5', 'RBD palm oil → olein and stearin (line 1)'),
  ('Fractionation 2',       'P6', 'RBD palm oil → olein and stearin (line 2)');

insert into tank_farms (plant_id, name, code) values
  -- P1 Soya Degumming
  ((select id from plants where code = 'P1'), 'P1 Crude Feed',       'P1-FEED'),
  ((select id from plants where code = 'P1'), 'P1 Degummed Product', 'P1-PROD'),
  -- P2 Sunflower
  ((select id from plants where code = 'P2'), 'P2 Crude Feed',       'P2-FEED'),
  ((select id from plants where code = 'P2'), 'P2 Product',          'P2-PROD'),
  -- P3 Palm RBD
  ((select id from plants where code = 'P3'), 'P3 CPO Feed',         'P3-FEED'),
  ((select id from plants where code = 'P3'), 'P3 RBD Product',      'P3-PROD'),
  -- P4 Soya Neutralisation
  ((select id from plants where code = 'P4'), 'P4 Degummed Feed',    'P4-FEED'),
  ((select id from plants where code = 'P4'), 'P4 Neutralised',      'P4-PROD'),
  -- P5 Fractionation 1
  ((select id from plants where code = 'P5'), 'P5 RBD Feed',         'P5-FEED'),
  ((select id from plants where code = 'P5'), 'P5 Olein',            'P5-OLE'),
  ((select id from plants where code = 'P5'), 'P5 Stearin',          'P5-STE'),
  -- P6 Fractionation 2
  ((select id from plants where code = 'P6'), 'P6 RBD Feed',         'P6-FEED'),
  ((select id from plants where code = 'P6'), 'P6 Olein',            'P6-OLE'),
  ((select id from plants where code = 'P6'), 'P6 Stearin',          'P6-STE');
