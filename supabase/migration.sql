-- ============================================================
-- WORTH OPS — DATABASE MIGRATION
-- Run this in the Supabase SQL Editor if you already ran schema.sql.
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS patterns.
-- ============================================================


-- ── 1. Extra columns on TANKS ─────────────────────────────────────────────────
alter table tanks
  add column if not exists pump_flow_rate_lph   numeric     default 0,
  add column if not exists pump_speed_factor    numeric     default 1.0,
  add column if not exists assigned_filler_id   uuid        references profiles(id),
  add column if not exists alert_low_percent    numeric     default 25,
  add column if not exists alert_high_percent   numeric     default 80;


-- ── 2. Extra columns on TANK_FILL_EVENTS ──────────────────────────────────────
-- Code uses operator_id (not filler_id), plus tanker_reference and product_type
alter table tank_fill_events
  add column if not exists operator_id      uuid references profiles(id),
  add column if not exists tanker_reference text,
  add column if not exists product_type     text;


-- ── 3. Extra columns on PROBLEMS ──────────────────────────────────────────────
alter table problems
  add column if not exists priority  integer,
  add column if not exists due_date  date;


-- ── 4. TANK CONNECTIONS ───────────────────────────────────────────────────────
create table if not exists tank_connections (
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

alter table tank_connections enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'tank_connections' and policyname = 'Read tank_connections'
  ) then
    create policy "Read tank_connections" on tank_connections
      for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'tank_connections' and policyname = 'Supervisors manage tank_connections'
  ) then
    create policy "Supervisors manage tank_connections" on tank_connections
      for all using (current_user_role() in ('admin', 'supervisor'));
  end if;
end $$;


-- ── 5. TANK CLEANING SCHEDULES ────────────────────────────────────────────────
create table if not exists tank_cleaning_schedules (
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

alter table tank_cleaning_schedules enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'tank_cleaning_schedules' and policyname = 'Read tank_cleaning_schedules'
  ) then
    create policy "Read tank_cleaning_schedules" on tank_cleaning_schedules
      for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'tank_cleaning_schedules' and policyname = 'Supervisors manage cleaning schedules'
  ) then
    create policy "Supervisors manage cleaning schedules" on tank_cleaning_schedules
      for all using (current_user_role() in ('admin', 'supervisor'));
  end if;
end $$;


-- ── 6. TANK CLEANING LOGS ─────────────────────────────────────────────────────
create table if not exists tank_cleaning_logs (
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

alter table tank_cleaning_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'tank_cleaning_logs' and policyname = 'Read tank_cleaning_logs'
  ) then
    create policy "Read tank_cleaning_logs" on tank_cleaning_logs
      for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'tank_cleaning_logs' and policyname = 'Authenticated insert cleaning logs'
  ) then
    create policy "Authenticated insert cleaning logs" on tank_cleaning_logs
      for insert with check (auth.uid() is not null);
  end if;
end $$;


-- ── 7. SHIFT REPORTS ──────────────────────────────────────────────────────────
create table if not exists shift_reports (
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

alter table shift_reports enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'shift_reports' and policyname = 'Read shift_reports'
  ) then
    create policy "Read shift_reports" on shift_reports
      for select using (auth.uid() is not null);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'shift_reports' and policyname = 'Authenticated manage shift_reports'
  ) then
    create policy "Authenticated manage shift_reports" on shift_reports
      for all using (auth.uid() is not null);
  end if;
end $$;
