-- ============================================================
-- WORK PERMIT FORMAT UPDATE — match physical Kapa PTW form
-- Run in Supabase SQL Editor
-- ============================================================

alter table work_permits
  add column if not exists contractor_name       text,
  add column if not exists nature_of_job         text[]  default '{}',
  add column if not exists ppe_head              text[]  default '{}',
  add column if not exists ppe_face              text[]  default '{}',
  add column if not exists ppe_hands             text[]  default '{}',
  add column if not exists ppe_body              text[]  default '{}',
  add column if not exists ppe_feet              text[]  default '{}',
  add column if not exists ppe_site              text[]  default '{}',
  add column if not exists ppe_other             text,
  add column if not exists pat_electrical        text,   -- 'YES' | 'NO' | null
  add column if not exists wah_items             text[]  default '{}',
  add column if not exists wah_inspected         text,   -- 'YES' | 'NO' | null
  add column if not exists assignees             text[]  default '{}',
  add column if not exists team_leader_name      text,
  add column if not exists ohs_comment           text;
