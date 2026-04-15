-- ============================================================
-- WORTH OPS — SEED DATA
-- Run AFTER schema.sql. Reflects the actual 6-plant process flow.
-- Replace admin_id with your auth user ID if it differs.
-- ============================================================

do $$
declare
  admin_id uuid := '9725e834-0c63-4e53-9622-b99e31d5d7cb';

  -- plant IDs
  p1_id uuid; p2_id uuid; p3_id uuid;
  p4_id uuid; p5_id uuid; p6_id uuid;

  -- tank farm IDs
  tf_p1_feed uuid; tf_p1_prod uuid;
  tf_p2_feed uuid; tf_p2_prod uuid;
  tf_p3_feed uuid; tf_p3_prod uuid;
  tf_p4_feed uuid; tf_p4_prod uuid;
  tf_p5_feed uuid; tf_p5_ole  uuid; tf_p5_ste uuid;
  tf_p6_feed uuid; tf_p6_ole  uuid; tf_p6_ste uuid;

  -- tank IDs (named by process stage)
  -- P1 Soya Degumming
  t_p1_csbo_1 uuid; t_p1_csbo_2 uuid;   -- crude soya feed
  t_p1_dsbo_1 uuid; t_p1_dsbo_2 uuid;   -- degummed soya product
  -- P2 Sunflower
  t_p2_csfo_1 uuid; t_p2_csfo_2 uuid;   -- crude sunflower feed
  t_p2_sfo_1  uuid; t_p2_sfo_2  uuid;   -- sunflower oil product
  -- P3 Palm RBD
  t_p3_cpo_1  uuid; t_p3_cpo_2  uuid; t_p3_cpo_3 uuid; -- CPO feed
  t_p3_rbd_1  uuid; t_p3_rbd_2  uuid;   -- RBD product
  -- P4 Soya Neutralisation
  t_p4_dsbo_1 uuid; t_p4_dsbo_2 uuid;   -- degummed soya feed
  t_p4_nsbo_1 uuid; t_p4_nsbo_2 uuid;   -- neutralised soya product
  -- P5 Fractionation 1
  t_p5_rbd_1  uuid;                      -- RBD feed
  t_p5_ole_1  uuid; t_p5_ole_2  uuid;   -- olein product
  t_p5_ste_1  uuid;                      -- stearin product
  -- P6 Fractionation 2
  t_p6_rbd_1  uuid;                      -- RBD feed
  t_p6_ole_1  uuid; t_p6_ole_2  uuid;   -- olein product
  t_p6_ste_1  uuid;                      -- stearin product

  s_id  uuid;
  lr_id uuid;
  d     date;
begin

  -- ── resolve plants ─────────────────────────────────────────
  select id into p1_id from plants where code = 'P1';
  select id into p2_id from plants where code = 'P2';
  select id into p3_id from plants where code = 'P3';
  select id into p4_id from plants where code = 'P4';
  select id into p5_id from plants where code = 'P5';
  select id into p6_id from plants where code = 'P6';

  -- ── resolve tank farms ─────────────────────────────────────
  select id into tf_p1_feed from tank_farms where code = 'P1-FEED';
  select id into tf_p1_prod from tank_farms where code = 'P1-PROD';
  select id into tf_p2_feed from tank_farms where code = 'P2-FEED';
  select id into tf_p2_prod from tank_farms where code = 'P2-PROD';
  select id into tf_p3_feed from tank_farms where code = 'P3-FEED';
  select id into tf_p3_prod from tank_farms where code = 'P3-PROD';
  select id into tf_p4_feed from tank_farms where code = 'P4-FEED';
  select id into tf_p4_prod from tank_farms where code = 'P4-PROD';
  select id into tf_p5_feed from tank_farms where code = 'P5-FEED';
  select id into tf_p5_ole  from tank_farms where code = 'P5-OLE';
  select id into tf_p5_ste  from tank_farms where code = 'P5-STE';
  select id into tf_p6_feed from tank_farms where code = 'P6-FEED';
  select id into tf_p6_ole  from tank_farms where code = 'P6-OLE';
  select id into tf_p6_ste  from tank_farms where code = 'P6-STE';

  -- ── ensure admin profile exists ───────────────────────────
  insert into profiles (id, full_name, role, employee_id, phone)
  values (admin_id, 'Benjamin (Admin)', 'admin', 'EMP-001', '+1-555-0100')
  on conflict (id) do update
    set full_name = 'Benjamin (Admin)', employee_id = 'EMP-001', phone = '+1-555-0100';

  -- ── tanks ──────────────────────────────────────────────────
  -- P1 — Soya Degumming
  insert into tanks (tank_farm_id, name, code, capacity_liters, product_type,
                     min_level_percent, max_level_percent, alert_low_percent, alert_high_percent,
                     current_level_liters, pump_flow_rate_lph, assigned_filler_id)
  values
    (tf_p1_feed, 'Crude Soya Feed 1', 'P1-CSBO-01', 200000, 'Crude Soya Bean Oil',   10, 90, 20, 85, 142000, 8000, admin_id),
    (tf_p1_feed, 'Crude Soya Feed 2', 'P1-CSBO-02', 200000, 'Crude Soya Bean Oil',   10, 90, 20, 85,  18000, 8000, admin_id), -- LOW
    (tf_p1_prod, 'Degummed Soya 1',   'P1-DSBO-01', 150000, 'Degummed Soya Bean Oil',10, 90, 20, 85,  88000, 6000, admin_id),
    (tf_p1_prod, 'Degummed Soya 2',   'P1-DSBO-02', 150000, 'Degummed Soya Bean Oil',10, 90, 20, 85, 135000, 6000, admin_id); -- HIGH

  select id into t_p1_csbo_1 from tanks where code = 'P1-CSBO-01';
  select id into t_p1_csbo_2 from tanks where code = 'P1-CSBO-02';
  select id into t_p1_dsbo_1 from tanks where code = 'P1-DSBO-01';
  select id into t_p1_dsbo_2 from tanks where code = 'P1-DSBO-02';

  -- P2 — Sunflower Processing
  insert into tanks (tank_farm_id, name, code, capacity_liters, product_type,
                     min_level_percent, max_level_percent, alert_low_percent, alert_high_percent,
                     current_level_liters, pump_flow_rate_lph, assigned_filler_id)
  values
    (tf_p2_feed, 'Crude Sunflower Feed 1', 'P2-CSFO-01', 180000, 'Crude Sunflower Oil', 10, 90, 20, 85, 112000, 7000, admin_id),
    (tf_p2_feed, 'Crude Sunflower Feed 2', 'P2-CSFO-02', 180000, 'Crude Sunflower Oil', 10, 90, 20, 85,  74000, 7000, admin_id),
    (tf_p2_prod, 'Sunflower Oil 1',        'P2-SFO-01',  150000, 'Sunflower Oil',        10, 90, 20, 85,  95000, 6000, admin_id),
    (tf_p2_prod, 'Sunflower Oil 2',        'P2-SFO-02',  150000, 'Sunflower Oil',        10, 90, 20, 85,  42000, 6000, admin_id);

  select id into t_p2_csfo_1 from tanks where code = 'P2-CSFO-01';
  select id into t_p2_csfo_2 from tanks where code = 'P2-CSFO-02';
  select id into t_p2_sfo_1  from tanks where code = 'P2-SFO-01';
  select id into t_p2_sfo_2  from tanks where code = 'P2-SFO-02';

  -- P3 — Palm RBD
  insert into tanks (tank_farm_id, name, code, capacity_liters, product_type,
                     min_level_percent, max_level_percent, alert_low_percent, alert_high_percent,
                     current_level_liters, pump_flow_rate_lph, assigned_filler_id)
  values
    (tf_p3_feed, 'CPO Feed 1', 'P3-CPO-01', 500000, 'Crude Palm Oil (CPO)',                    10, 90, 20, 85, 310000, 15000, admin_id),
    (tf_p3_feed, 'CPO Feed 2', 'P3-CPO-02', 500000, 'Crude Palm Oil (CPO)',                    10, 90, 20, 85, 450000, 15000, admin_id), -- HIGH
    (tf_p3_feed, 'CPO Feed 3', 'P3-CPO-03', 500000, 'Crude Palm Oil (CPO)',                    10, 90, 20, 85, 185000, 15000, admin_id),
    (tf_p3_prod, 'RBD Palm 1', 'P3-RBD-01', 400000, 'RBD Palm Oil',                            10, 90, 20, 85, 220000, 12000, admin_id),
    (tf_p3_prod, 'RBD Palm 2', 'P3-RBD-02', 400000, 'RBD Palm Oil',                            10, 90, 20, 85,  38000, 12000, admin_id); -- LOW

  select id into t_p3_cpo_1 from tanks where code = 'P3-CPO-01';
  select id into t_p3_cpo_2 from tanks where code = 'P3-CPO-02';
  select id into t_p3_cpo_3 from tanks where code = 'P3-CPO-03';
  select id into t_p3_rbd_1 from tanks where code = 'P3-RBD-01';
  select id into t_p3_rbd_2 from tanks where code = 'P3-RBD-02';

  -- P4 — Soya Neutralisation
  insert into tanks (tank_farm_id, name, code, capacity_liters, product_type,
                     min_level_percent, max_level_percent, alert_low_percent, alert_high_percent,
                     current_level_liters, pump_flow_rate_lph, assigned_filler_id)
  values
    (tf_p4_feed, 'Degummed Soya Feed 1', 'P4-DSBO-01', 150000, 'Degummed Soya Bean Oil',    10, 90, 20, 85,  72000, 6000, admin_id),
    (tf_p4_feed, 'Degummed Soya Feed 2', 'P4-DSBO-02', 150000, 'Degummed Soya Bean Oil',    10, 90, 20, 85, 110000, 6000, admin_id),
    (tf_p4_prod, 'Neutralised Soya 1',   'P4-NSBO-01', 120000, 'Neutralised Soya Bean Oil', 10, 90, 20, 85,  58000, 5000, admin_id),
    (tf_p4_prod, 'Neutralised Soya 2',   'P4-NSBO-02', 120000, 'Neutralised Soya Bean Oil', 10, 90, 20, 85,  91000, 5000, admin_id);

  select id into t_p4_dsbo_1 from tanks where code = 'P4-DSBO-01';
  select id into t_p4_dsbo_2 from tanks where code = 'P4-DSBO-02';
  select id into t_p4_nsbo_1 from tanks where code = 'P4-NSBO-01';
  select id into t_p4_nsbo_2 from tanks where code = 'P4-NSBO-02';

  -- P5 — Fractionation 1
  insert into tanks (tank_farm_id, name, code, capacity_liters, product_type,
                     min_level_percent, max_level_percent, alert_low_percent, alert_high_percent,
                     current_level_liters, pump_flow_rate_lph, assigned_filler_id)
  values
    (tf_p5_feed, 'RBD Feed (Frac 1)',  'P5-RBD-01', 300000, 'RBD Palm Oil',  10, 90, 20, 85, 195000, 10000, admin_id),
    (tf_p5_ole,  'Olein Tank 1A',      'P5-OLE-01', 250000, 'Palm Olein',    10, 90, 20, 85, 148000,  9000, admin_id),
    (tf_p5_ole,  'Olein Tank 1B',      'P5-OLE-02', 250000, 'Palm Olein',    10, 90, 20, 85,  62000,  9000, admin_id),
    (tf_p5_ste,  'Stearin Tank 1',     'P5-STE-01',  80000, 'Palm Stearin',  10, 90, 20, 85,  51000,  4000, admin_id);

  select id into t_p5_rbd_1 from tanks where code = 'P5-RBD-01';
  select id into t_p5_ole_1 from tanks where code = 'P5-OLE-01';
  select id into t_p5_ole_2 from tanks where code = 'P5-OLE-02';
  select id into t_p5_ste_1 from tanks where code = 'P5-STE-01';

  -- P6 — Fractionation 2
  insert into tanks (tank_farm_id, name, code, capacity_liters, product_type,
                     min_level_percent, max_level_percent, alert_low_percent, alert_high_percent,
                     current_level_liters, pump_flow_rate_lph, assigned_filler_id)
  values
    (tf_p6_feed, 'RBD Feed (Frac 2)',  'P6-RBD-01', 300000, 'RBD Palm Oil',  10, 90, 20, 85, 241000, 10000, admin_id),
    (tf_p6_ole,  'Olein Tank 2A',      'P6-OLE-01', 250000, 'Palm Olein',    10, 90, 20, 85, 103000,  9000, admin_id),
    (tf_p6_ole,  'Olein Tank 2B',      'P6-OLE-02', 250000, 'Palm Olein',    10, 90, 20, 85,  14000,  9000, admin_id), -- LOW
    (tf_p6_ste,  'Stearin Tank 2',     'P6-STE-01',  80000, 'Palm Stearin',  10, 90, 20, 85,  72000,  4000, admin_id); -- HIGH

  select id into t_p6_rbd_1 from tanks where code = 'P6-RBD-01';
  select id into t_p6_ole_1 from tanks where code = 'P6-OLE-01';
  select id into t_p6_ole_2 from tanks where code = 'P6-OLE-02';
  select id into t_p6_ste_1 from tanks where code = 'P6-STE-01';

  -- ── tank readings — 7 days × 2 per day ────────────────────
  for i in 0..6 loop
    d := current_date - i;

    insert into tank_readings (tank_id, level_liters, level_percent, temperature_celsius, recorded_by, created_at) values
      -- P1 Soya Degumming
      (t_p1_csbo_1, 142000+(random()*5000-2500)::int, 71.0, 28.0+random(), admin_id, d+interval '7 hours'),
      (t_p1_csbo_2,  18000+(random()*1000-500)::int,   9.0, 28.0+random(), admin_id, d+interval '7 hours'),
      (t_p1_dsbo_1,  88000+(random()*4000-2000)::int,  58.7, 65.0+random(), admin_id, d+interval '7 hours'),
      (t_p1_dsbo_2, 135000+(random()*4000-2000)::int,  90.0, 65.0+random(), admin_id, d+interval '7 hours'),
      -- P2 Sunflower
      (t_p2_csfo_1, 112000+(random()*5000-2500)::int,  62.2, 25.0+random(), admin_id, d+interval '7 hours'),
      (t_p2_csfo_2,  74000+(random()*3000-1500)::int,  41.1, 25.0+random(), admin_id, d+interval '7 hours'),
      (t_p2_sfo_1,   95000+(random()*4000-2000)::int,  63.3, 55.0+random(), admin_id, d+interval '7 hours'),
      (t_p2_sfo_2,   42000+(random()*2000-1000)::int,  28.0, 55.0+random(), admin_id, d+interval '7 hours'),
      -- P3 Palm RBD
      (t_p3_cpo_1,  310000+(random()*10000-5000)::int, 62.0, 55.0+random(), admin_id, d+interval '7 hours'),
      (t_p3_cpo_2,  450000+(random()*8000-4000)::int,  90.0, 55.0+random(), admin_id, d+interval '7 hours'),
      (t_p3_cpo_3,  185000+(random()*8000-4000)::int,  37.0, 55.0+random(), admin_id, d+interval '7 hours'),
      (t_p3_rbd_1,  220000+(random()*8000-4000)::int,  55.0, 60.0+random(), admin_id, d+interval '7 hours'),
      (t_p3_rbd_2,   38000+(random()*3000-1500)::int,   9.5, 60.0+random(), admin_id, d+interval '7 hours'),
      -- P4 Soya Neutralisation
      (t_p4_dsbo_1,  72000+(random()*3000-1500)::int,  48.0, 65.0+random(), admin_id, d+interval '7 hours'),
      (t_p4_dsbo_2, 110000+(random()*4000-2000)::int,  73.3, 65.0+random(), admin_id, d+interval '7 hours'),
      (t_p4_nsbo_1,  58000+(random()*3000-1500)::int,  48.3, 70.0+random(), admin_id, d+interval '7 hours'),
      (t_p4_nsbo_2,  91000+(random()*3000-1500)::int,  75.8, 70.0+random(), admin_id, d+interval '7 hours'),
      -- P5 Frac 1
      (t_p5_rbd_1,  195000+(random()*8000-4000)::int,  65.0, 40.0+random(), admin_id, d+interval '7 hours'),
      (t_p5_ole_1,  148000+(random()*6000-3000)::int,  59.2, 35.0+random(), admin_id, d+interval '7 hours'),
      (t_p5_ole_2,   62000+(random()*4000-2000)::int,  24.8, 35.0+random(), admin_id, d+interval '7 hours'),
      (t_p5_ste_1,   51000+(random()*2000-1000)::int,  63.8, 45.0+random(), admin_id, d+interval '7 hours'),
      -- P6 Frac 2
      (t_p6_rbd_1,  241000+(random()*8000-4000)::int,  80.3, 40.0+random(), admin_id, d+interval '7 hours'),
      (t_p6_ole_1,  103000+(random()*4000-2000)::int,  41.2, 35.0+random(), admin_id, d+interval '7 hours'),
      (t_p6_ole_2,   14000+(random()*1000-500)::int,    5.6, 35.0+random(), admin_id, d+interval '7 hours'),
      (t_p6_ste_1,   72000+(random()*2000-1000)::int,  90.0, 45.0+random(), admin_id, d+interval '7 hours');

    insert into tank_readings (tank_id, level_liters, level_percent, temperature_celsius, recorded_by, created_at) values
      (t_p1_csbo_1, 142000+(random()*5000-2500)::int, 71.0, 28.5+random(), admin_id, d+interval '19 hours'),
      (t_p1_csbo_2,  18000+(random()*1000-500)::int,   9.0, 28.5+random(), admin_id, d+interval '19 hours'),
      (t_p1_dsbo_1,  88000+(random()*4000-2000)::int,  58.7, 65.5+random(), admin_id, d+interval '19 hours'),
      (t_p1_dsbo_2, 135000+(random()*4000-2000)::int,  90.0, 65.5+random(), admin_id, d+interval '19 hours'),
      (t_p2_csfo_1, 112000+(random()*5000-2500)::int,  62.2, 25.5+random(), admin_id, d+interval '19 hours'),
      (t_p2_csfo_2,  74000+(random()*3000-1500)::int,  41.1, 25.5+random(), admin_id, d+interval '19 hours'),
      (t_p2_sfo_1,   95000+(random()*4000-2000)::int,  63.3, 55.5+random(), admin_id, d+interval '19 hours'),
      (t_p2_sfo_2,   42000+(random()*2000-1000)::int,  28.0, 55.5+random(), admin_id, d+interval '19 hours'),
      (t_p3_cpo_1,  310000+(random()*10000-5000)::int, 62.0, 55.5+random(), admin_id, d+interval '19 hours'),
      (t_p3_cpo_2,  450000+(random()*8000-4000)::int,  90.0, 55.5+random(), admin_id, d+interval '19 hours'),
      (t_p3_cpo_3,  185000+(random()*8000-4000)::int,  37.0, 55.5+random(), admin_id, d+interval '19 hours'),
      (t_p3_rbd_1,  220000+(random()*8000-4000)::int,  55.0, 60.5+random(), admin_id, d+interval '19 hours'),
      (t_p3_rbd_2,   38000+(random()*3000-1500)::int,   9.5, 60.5+random(), admin_id, d+interval '19 hours'),
      (t_p4_dsbo_1,  72000+(random()*3000-1500)::int,  48.0, 65.5+random(), admin_id, d+interval '19 hours'),
      (t_p4_dsbo_2, 110000+(random()*4000-2000)::int,  73.3, 65.5+random(), admin_id, d+interval '19 hours'),
      (t_p4_nsbo_1,  58000+(random()*3000-1500)::int,  48.3, 70.5+random(), admin_id, d+interval '19 hours'),
      (t_p4_nsbo_2,  91000+(random()*3000-1500)::int,  75.8, 70.5+random(), admin_id, d+interval '19 hours'),
      (t_p5_rbd_1,  195000+(random()*8000-4000)::int,  65.0, 40.5+random(), admin_id, d+interval '19 hours'),
      (t_p5_ole_1,  148000+(random()*6000-3000)::int,  59.2, 35.5+random(), admin_id, d+interval '19 hours'),
      (t_p5_ole_2,   62000+(random()*4000-2000)::int,  24.8, 35.5+random(), admin_id, d+interval '19 hours'),
      (t_p5_ste_1,   51000+(random()*2000-1000)::int,  63.8, 45.5+random(), admin_id, d+interval '19 hours'),
      (t_p6_rbd_1,  241000+(random()*8000-4000)::int,  80.3, 40.5+random(), admin_id, d+interval '19 hours'),
      (t_p6_ole_1,  103000+(random()*4000-2000)::int,  41.2, 35.5+random(), admin_id, d+interval '19 hours'),
      (t_p6_ole_2,   14000+(random()*1000-500)::int,    5.6, 35.5+random(), admin_id, d+interval '19 hours'),
      (t_p6_ste_1,   72000+(random()*2000-1000)::int,  90.0, 45.5+random(), admin_id, d+interval '19 hours');
  end loop;

  -- ── shifts + shift reports — last 14 days ──────────────────
  for i in 0..13 loop
    d := current_date - i;

    -- P1 Morning
    insert into shifts (plant_id, shift_type, shift_date, start_time, end_time, created_by)
    values (p1_id, 'morning', d, '06:00', '14:00', admin_id)
    returning id into s_id;
    insert into shift_assignments (shift_id, profile_id, role_on_shift) values (s_id, admin_id, 'Operator');
    insert into shift_reports (shift_id, total_produced_liters, spillage_liters, non_conforming_liters, handover_notes, status)
    values (s_id, (22000+(random()*5000-2500))::int, (random()*200)::int, (random()*150)::int,
            'Degumming process stable. Phosphoric acid dosing normal.', 'signed_off');

    -- P1 Afternoon
    insert into shifts (plant_id, shift_type, shift_date, start_time, end_time, created_by)
    values (p1_id, 'afternoon', d, '14:00', '22:00', admin_id)
    returning id into s_id;
    insert into shift_assignments (shift_id, profile_id, role_on_shift) values (s_id, admin_id, 'Operator');
    insert into shift_reports (shift_id, total_produced_liters, spillage_liters, non_conforming_liters, handover_notes, status)
    values (s_id, (20000+(random()*4000-2000))::int, (random()*180)::int, (random()*100)::int,
            'Normal ops. Feed tank P1-CSBO-02 remains low — refill booked.',
            case when i = 0 then 'submitted' else 'signed_off' end);

    -- P3 Morning (Palm RBD — highest throughput)
    insert into shifts (plant_id, shift_type, shift_date, start_time, end_time, created_by)
    values (p3_id, 'morning', d, '06:00', '14:00', admin_id)
    returning id into s_id;
    insert into shift_assignments (shift_id, profile_id, role_on_shift) values (s_id, admin_id, 'Supervisor');
    insert into shift_reports (shift_id, total_produced_liters, spillage_liters, non_conforming_liters,
                                outstanding_issues, handover_notes, status)
    values (s_id, (55000+(random()*10000-5000))::int, (random()*400)::int, (random()*300)::int,
            case when i % 4 = 0 then 'Bleaching clay consumption slightly elevated — review dosing rate.' else null end,
            'RBD output on target. CPO-02 near capacity — coordinate dispatch.',
            case when i = 0 then 'draft' else 'signed_off' end);

    -- P5+P6 Night (Fractionation runs overnight)
    insert into shifts (plant_id, shift_type, shift_date, start_time, end_time, created_by)
    values (p5_id, 'night', d, '22:00', '06:00', admin_id)
    returning id into s_id;
    insert into shift_assignments (shift_id, profile_id, role_on_shift) values (s_id, admin_id, 'Operator');
    insert into shift_reports (shift_id, total_produced_liters, spillage_liters, non_conforming_liters, handover_notes, status)
    values (s_id, (38000+(random()*8000-4000))::int, (random()*150)::int, (random()*100)::int,
            'Crystallisation temperature holding well. Olein yield ~80%.',
            case when i = 0 then 'submitted' else 'signed_off' end);
  end loop;

  -- ── fill events ────────────────────────────────────────────
  insert into tank_fill_events (tank_id, operator_id, volume_added_liters, tanker_reference,
                                 product_type, level_before_liters, level_after_liters,
                                 started_at, completed_at, status)
  values
    (t_p1_csbo_2, admin_id,  80000, 'TKR-2026-041', 'Crude Soya Bean Oil',    8000,  88000,
     current_date-3+interval '8 hours',  current_date-3+interval '13 hours', 'completed'),
    (t_p3_cpo_1,  admin_id, 120000, 'TKR-2026-042', 'Crude Palm Oil (CPO)',  195000, 315000,
     current_date-2+interval '7 hours',  current_date-2+interval '14 hours', 'completed'),
    (t_p2_csfo_1, admin_id,  50000, 'TKR-2026-043', 'Crude Sunflower Oil',    66000, 116000,
     current_date-1+interval '9 hours',  current_date-1+interval '13 hours', 'completed'),
    (t_p3_rbd_2,  admin_id,  80000, 'TKR-2026-044', 'RBD Palm Oil',           8000,  88000,
     current_date  +interval '7 hours',  null, 'in_progress');

  -- ── problems ───────────────────────────────────────────────
  insert into problems (plant_id, tank_id, title, description, severity, status,
                         priority, due_date, reported_by, assigned_to, reported_at)
  values
    (p1_id, t_p1_csbo_2,
     'P1-CSBO-02 critically low — <10%',
     'Crude soya feed tank 2 at ~9%. Degumming line at risk of running dry if not refilled by next shift.',
     'critical', 'open', 1, current_date+1, admin_id, admin_id, now()-interval '5 hours'),

    (p3_id, t_p3_cpo_2,
     'P3-CPO-02 approaching overflow — 90%',
     'CPO feed tank 2 at 90%. Incoming tanker delivery must be redirected to CPO-03 or held until transfer.',
     'high', 'open', 2, current_date, admin_id, admin_id, now()-interval '8 hours'),

    (p3_id, t_p3_rbd_2,
     'P3-RBD-02 critically low — RBD output restricted',
     'RBD product tank 2 at ~9.5%. Fractionation lines drawing down faster than RBD plant is filling.',
     'high', 'in_progress', 3, current_date+1, admin_id, admin_id, now()-interval '10 hours'),

    (p6_id, t_p6_ole_2,
     'P6-OLE-02 very low — Fractionation 2 olein output',
     'Olein tank 2B (Frac 2) at ~5.6%. Crystallisation cycle running slow — investigate heat exchanger.',
     'high', 'in_progress', 4, current_date+2, admin_id, admin_id, now()-interval '14 hours'),

    (p6_id, t_p6_ste_1,
     'P6-STE-01 near full — stearin dispatch overdue',
     'Stearin tank 2 at 90%. Dispatch to customer scheduled 3 days ago has not been completed.',
     'medium', 'open', 5, current_date, admin_id, admin_id, now()-interval '1 day'),

    (p1_id, t_p1_dsbo_2,
     'P1-DSBO-02 near capacity — transfer to P4 required',
     'Degummed soya product tank 2 at 90%. P4 Neutralisation plant needs to draw down before overflow.',
     'medium', 'open', 6, current_date+1, admin_id, admin_id, now()-interval '6 hours'),

    (p5_id, null,
     'Fractionation 1 — heat exchanger efficiency drop',
     'Crystallisation temperature taking 40 min longer to stabilise than baseline. Fouling suspected.',
     'medium', 'in_progress', 7, current_date+3, admin_id, admin_id, now()-interval '2 days'),

    (p3_id, null,
     'Bleaching clay dosing rate elevated — P3 RBD',
     'Clay consumption up ~15% vs last month. Possible crude quality change or dosing system drift.',
     'low', 'open', 8, current_date+5, admin_id, admin_id, now()-interval '3 days'),

    (p2_id, null,
     'Deodoriser vacuum pump maintenance overdue',
     'P2 deodoriser vacuum pump last serviced 6 months ago — scheduled 3-month interval exceeded.',
     'low', 'resolved', 9, current_date-2, admin_id, admin_id, now()-interval '7 days');

  -- ── problem updates ────────────────────────────────────────
  insert into problem_updates (problem_id, update_text, updated_by, created_at)
  select id, 'Tanker TKR-2026-045 confirmed for 06:00 tomorrow. Line priority adjusted.', admin_id, now()-interval '2 hours'
  from problems where title like 'P1-CSBO-02%';

  insert into problem_updates (problem_id, update_text, updated_by, created_at)
  select id, 'Incoming delivery diverted to CPO-03. CPO-02 transfer to refinery started.', admin_id, now()-interval '4 hours'
  from problems where title like 'P3-CPO-02%';

  insert into problem_updates (problem_id, update_text, updated_by, created_at)
  select id, 'RBD plant throughput increased. Estimated 6 hours to reach safe level.', admin_id, now()-interval '5 hours'
  from problems where title like 'P3-RBD-02%';

  insert into problem_updates (problem_id, update_text, updated_by, created_at)
  select id, 'Heat exchanger plate inspection scheduled for tomorrow. Manual temperature checks every 2h overnight.', admin_id, now()-interval '10 hours'
  from problems where title like 'P6-OLE-02%';

  -- ── lab reports ────────────────────────────────────────────
  -- P3 RBD — approved batch
  insert into lab_reports (plant_id, report_number, sample_taken_at, submitted_by, approved_by, status, notes)
  values (p3_id, 'LAB-2026-041', current_date-3+interval '10 hours', admin_id, admin_id, 'approved',
          'RBD palm oil batch meets all PORAM specifications. Cleared for dispatch.')
  returning id into lr_id;
  insert into quality_values (report_id, parameter_name, value, unit, min_spec, max_spec, is_within_spec) values
    (lr_id, 'Free Fatty Acid (FFA)',        0.05, '%',      0.0,  0.10, true),
    (lr_id, 'Moisture & Impurities',        0.04, '%',      0.0,  0.10, true),
    (lr_id, 'Iodine Value',                52.8,  'g/100g', 50.0, 55.0, true),
    (lr_id, 'Peroxide Value',               1.2,  'meq/kg', 0.0,  5.0,  true),
    (lr_id, 'Colour (Lovibond 5.25")',      2.8,  'R',      0.0,  3.0,  true),
    (lr_id, 'Cloud Point',                  8.5,  '°C',     7.0, 10.0,  true);

  -- P5 Olein — submitted (pending approval)
  insert into lab_reports (plant_id, report_number, sample_taken_at, submitted_by, status, notes)
  values (p5_id, 'LAB-2026-042', current_date-1+interval '8 hours', admin_id, 'submitted',
          'Olein cloud point borderline — within spec but worth monitoring next batch.')
  returning id into lr_id;
  insert into quality_values (report_id, parameter_name, value, unit, min_spec, max_spec, is_within_spec) values
    (lr_id, 'Free Fatty Acid (FFA)',        0.07, '%',      0.0,  0.10, true),
    (lr_id, 'Iodine Value',                56.1,  'g/100g', 55.0, 60.0, true),
    (lr_id, 'Cloud Point',                  9.8,  '°C',     null, 10.0, true),
    (lr_id, 'Peroxide Value',               1.8,  'meq/kg', 0.0,  5.0,  true),
    (lr_id, 'Colour (Lovibond 5.25")',      2.2,  'R',      0.0,  3.0,  true);

  -- P1 Degummed Soya — rejected (FFA out of spec)
  insert into lab_reports (plant_id, report_number, sample_taken_at, submitted_by, approved_by,
                            status, notes, rejection_reason)
  values (p1_id, 'LAB-2026-039', current_date-5+interval '14 hours', admin_id, admin_id, 'rejected',
          'FFA above spec — batch held.',
          'FFA 0.82% exceeds 0.75% max for degummed soya. Batch returned for re-processing.')
  returning id into lr_id;
  insert into quality_values (report_id, parameter_name, value, unit, min_spec, max_spec, is_within_spec) values
    (lr_id, 'Free Fatty Acid (FFA)',        0.82, '%',      0.0,  0.75, false),
    (lr_id, 'Moisture',                     0.08, '%',      0.0,  0.10, true),
    (lr_id, 'Phosphorus Content',          12.5,  'ppm',    0.0, 15.0,  true),
    (lr_id, 'Peroxide Value',               3.2,  'meq/kg', 0.0,  5.0,  true);

  -- P2 Sunflower — draft today
  insert into lab_reports (plant_id, report_number, sample_taken_at, submitted_by, status)
  values (p2_id, 'LAB-2026-043', current_date+interval '9 hours', admin_id, 'draft')
  returning id into lr_id;
  insert into quality_values (report_id, parameter_name, value, unit, min_spec, max_spec, is_within_spec) values
    (lr_id, 'Free Fatty Acid (FFA)',        0.06, '%',      0.0,  0.10, true),
    (lr_id, 'Moisture & Impurities',        0.03, '%',      0.0,  0.10, true),
    (lr_id, 'Iodine Value',               128.4,  'g/100g', 125.0, 140.0, true),
    (lr_id, 'Peroxide Value',               1.1,  'meq/kg', 0.0,  5.0,  true),
    (lr_id, 'Colour (Lovibond 5.25")',      1.8,  'R',      0.0,  3.0,  true);

end $$;
