-- ============================================================
-- PREDICTIVE MAINTENANCE MODULE
-- Run this in Supabase SQL Editor
-- ============================================================

create type equipment_condition     as enum ('good', 'fair', 'poor', 'critical', 'offline');
create type maintenance_task_type   as enum ('preventive', 'corrective', 'inspection', 'calibration', 'cleaning');
create type maintenance_priority    as enum ('low', 'medium', 'high', 'critical');
create type maintenance_task_status as enum ('pending', 'scheduled', 'in_progress', 'completed', 'overdue', 'cancelled');

-- Equipment registry (per-plant catalog of all equipment)
create table equipment_registry (
  id                     uuid primary key default uuid_generate_v4(),
  plant_id               uuid references plants(id) on delete cascade,
  name                   text not null,
  code                   text,
  equipment_type         text not null,
  manufacturer           text,
  model                  text,
  serial_number          text,
  install_date           date,
  last_service_date      date,
  next_service_date      date,
  condition              equipment_condition not null default 'good',
  runtime_hours          numeric default 0,
  service_interval_hours numeric,
  notes                  text,
  is_active              boolean default true,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create trigger equipment_registry_updated_at
  before update on equipment_registry
  for each row execute function handle_updated_at();

-- Maintenance tasks (scheduled + ad-hoc work)
create table maintenance_tasks (
  id               uuid primary key default uuid_generate_v4(),
  plant_id         uuid references plants(id),
  equipment_id     uuid references equipment_registry(id) on delete set null,
  title            text not null,
  description      text,
  task_type        maintenance_task_type not null default 'preventive',
  priority         maintenance_priority  not null default 'medium',
  status           maintenance_task_status not null default 'pending',
  scheduled_date   date,
  scheduled_start  timestamptz,
  scheduled_end    timestamptz,
  estimated_hours  numeric,
  shift_id         uuid references shifts(id) on delete set null,
  assigned_to      uuid references profiles(id),
  completed_by     uuid references profiles(id),
  completed_at     timestamptz,
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create trigger maintenance_tasks_updated_at
  before update on maintenance_tasks
  for each row execute function handle_updated_at();

-- Predictive / condition-based alerts
create table maintenance_alerts (
  id            uuid primary key default uuid_generate_v4(),
  plant_id      uuid references plants(id),
  equipment_id  uuid references equipment_registry(id) on delete cascade,
  alert_type    text not null,       -- e.g. 'overdue_service', 'poor_condition', 'runtime_exceeded'
  title         text not null,
  message       text,
  severity      maintenance_priority not null default 'medium',
  is_resolved   boolean default false,
  resolved_by   uuid references profiles(id),
  resolved_at   timestamptz,
  created_at    timestamptz default now()
);

-- RLS
alter table equipment_registry enable row level security;
alter table maintenance_tasks   enable row level security;
alter table maintenance_alerts  enable row level security;

create policy "Read equipment_registry"   on equipment_registry for select using (auth.uid() is not null);
create policy "Manage equipment_registry" on equipment_registry for all    using (current_user_role() in ('admin', 'supervisor'));

create policy "Read maintenance_tasks"   on maintenance_tasks for select using (auth.uid() is not null);
create policy "Create maintenance_tasks" on maintenance_tasks for insert  with check (auth.uid() is not null);
create policy "Update maintenance_tasks" on maintenance_tasks for update  using (auth.uid() is not null);

create policy "Read maintenance_alerts"   on maintenance_alerts for select using (auth.uid() is not null);
create policy "Manage maintenance_alerts" on maintenance_alerts for all    using (current_user_role() in ('admin', 'supervisor'));
