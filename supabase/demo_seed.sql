-- ============================================================
-- DEMO SEED DATA — for presentation
-- Run in Supabase SQL Editor AFTER the main schema and migrations
-- ============================================================

-- ============================================================
-- WORK PERMITS
-- ============================================================
insert into work_permits (
  plant_id, permit_number, permit_type, title, work_description,
  location, hazards, precautions, ppe_required,
  status, valid_from, valid_until, rejection_reason
) values

-- 1. ACTIVE — Hot Work on P3 heat exchanger
(
  (select id from plants where code = 'P3'),
  'WP-2026-0001', 'hot_work',
  'Welding — P3 Heat Exchanger Tube Bundle Repair',
  'Replace corroded tube bundle on primary heat exchanger HX-301. Involves cutting and welding of carbon steel tubes. Exchanger must be isolated, drained, and nitrogen-purged before work commences.',
  'P3 Heat Exchanger Bay — HX-301',
  'Hot surfaces, flammable oil residues in pipework, confined working area, welding fumes, UV radiation from arc, potential for oil ignition.',
  'Full nitrogen purge and gas-free certificate required. Fire watch to be maintained throughout. Fire extinguisher adjacent to work area. Welding screen to be erected. Continuous gas monitoring for LEL > 5%.',
  ARRAY['Hard hat','Face shield','Heat-resistant gloves','Fire-retardant clothing','Steel-capped boots','Respirator'],
  'active',
  now() - interval '6 hours',
  now() + interval '18 hours',
  null
),

-- 2. APPROVED — Electrical isolation on P1
(
  (select id from plants where code = 'P1'),
  'WP-2026-0002', 'electrical',
  'Electrical Isolation — P1 MCC Panel 1A Maintenance',
  'Scheduled preventive maintenance on Motor Control Centre Panel 1A. Replacement of faulty contactor on Feed Pump P1-FP-001. Panel to be fully de-energised and LOTO applied before any contact with live parts.',
  'P1 Electrical Room — MCC Panel 1A',
  'High voltage (415V), arc flash risk, risk of electric shock, energised adjacent panels.',
  'LOTO procedure WO-ELEC-011 to be followed. Only qualified electricians to perform work. Test voltage absent with calibrated meter before touching. Adjacent live panels to be barriered.',
  ARRAY['Electrical insulating gloves','Safety glasses','Hard hat','Steel-capped boots'],
  'approved',
  now() + interval '2 hours',
  now() + interval '10 hours',
  null
),

-- 3. PENDING — Confined Space entry P2 tank
(
  (select id from plants where code = 'P2'),
  'WP-2026-0003', 'confined_space',
  'Confined Space Entry — P2-FEED Tank T-201 Internal Inspection',
  'Annual internal inspection of crude sunflower oil storage tank T-201. Visual inspection of floor plates, wall welds, heating coils, and level instrumentation. Full clean-out required prior to entry.',
  'P2 Crude Feed Tank Farm — Tank T-201',
  'Oxygen-deficient atmosphere, toxic hydrogen sulphide, slippery surfaces, falling objects, heat stress, limited egress.',
  'Tank to be fully drained, cleaned, and ventilated for minimum 24 hours. Continuous O2 and H2S monitoring required. Standby person outside at all times. Tripod and rescue harness in place. BA set on standby.',
  ARRAY['Harness / fall arrest','Respirator','Chemical-resistant gloves','Chemical apron','Hard hat','Steel-capped boots','Safety glasses'],
  'pending',
  null,
  null,
  null
),

-- 4. PENDING — Working at Height P5
(
  (select id from plants where code = 'P5'),
  'WP-2026-0004', 'height',
  'Working at Height — P5 Fractionation Column C-501 Top Access',
  'Inspection and replacement of pressure relief valve PRV-501 located at 14m elevation on fractionation column C-501. Scaffold to be erected by certified scaffolders prior to work.',
  'P5 Fractionation Column C-501 — Top Platform (14m AGL)',
  'Fall from height, dropped objects onto lower levels, unstable scaffold, wind loading, hot surfaces on column.',
  'Scaffold inspection certificate required. All tools and materials to be tethered. Exclusion zone 5m radius below. Safety harness attached to anchor point at all times above 1.8m. Wind speed limit 40 km/h.',
  ARRAY['Harness / fall arrest','Hard hat','Safety glasses','Steel-capped boots','Heat-resistant gloves'],
  'pending',
  null,
  null,
  null
),

-- 5. REJECTED — Chemical handling P4
(
  (select id from plants where code = 'P4'),
  'WP-2026-0005', 'chemical',
  'Chemical Handling — Caustic Soda (NaOH 50%) Tanker Offload',
  'Transfer of 20,000L caustic soda solution from road tanker to storage vessel V-401. Offload via dedicated caustic transfer pump.',
  'P4 Chemical Storage Area — V-401',
  'Corrosive burns from caustic contact, eye injury, inhalation of aerosol, spill to drain.',
  'Secondary containment bunding to be checked clear. SDS to be reviewed by all personnel. Eyewash station confirmed operational.',
  ARRAY['Chemical-resistant gloves','Chemical apron','Face shield','Steel-capped boots','Respirator'],
  'rejected',
  null,
  null,
  'Permit rejected — secondary containment bund not repaired after last inspection finding. Resubmit once bund repair work order WO-2026-0142 is signed off by Facility Manager.'
),

-- 6. ACTIVE — Cold Work P4 insulation
(
  (select id from plants where code = 'P4'),
  'WP-2026-0006', 'cold_work',
  'Cold Work — P4 Neutraliser Feed Line Insulation Replacement',
  'Replace damaged pipe insulation on 6-inch neutraliser feed line between V-401 and neutraliser N-401. Approximately 25 metres of insulation to be stripped and replaced with new calcium silicate sections.',
  'P4 Pipe Bridge — Grid Ref C4 to D7',
  'Hot pipe surfaces (max 85°C), fibrous insulation dust, working at low height (2m) on pipe bridge.',
  'Pipes confirmed below 60°C before removal of insulation. Dust mask to be worn when removing old insulation. Area to be cordoned off. Work permit valid for day shift only.',
  ARRAY['Hard hat','Respirator','Safety glasses','Heat-resistant gloves','Steel-capped boots'],
  'active',
  now() - interval '3 hours',
  now() + interval '5 hours',
  null
),

-- 7. CLOSED — General P6
(
  (select id from plants where code = 'P6'),
  'WP-2026-0007', 'general',
  'General Maintenance — P6 Crystalliser Agitator Gearbox Oil Change',
  'Scheduled oil change on crystalliser agitator gearbox GB-601. Drain old oil, inspect for contamination/wear particles, refill with Shell Omala 320.',
  'P6 Crystalliser Section — Agitator GB-601',
  'Hot gearbox oil, slipping on spilled oil, manual handling of oil drums.',
  'Gearbox oil temperature < 50°C before draining. Drip trays in place. Used oil to be collected in labelled IBC for disposal.',
  ARRAY['Heat-resistant gloves','Safety glasses','Steel-capped boots'],
  'closed',
  now() - interval '2 days',
  now() - interval '1 day',
  null
),

-- 8. EXPIRED — Hot work P1
(
  (select id from plants where code = 'P1'),
  'WP-2026-0008', 'hot_work',
  'Hot Work — P1 Degummer Vessel V-101 Nozzle Repair',
  'Weld repair to leaking 2-inch drain nozzle on degummer vessel V-101. Vessel to be taken offline, drained, and flushed before work.',
  'P1 Degummer Section — Vessel V-101',
  'Residual soya oil, hot work in close proximity to process equipment.',
  'Gas-free certificate, fire watch, continuous LEL monitoring.',
  ARRAY['Hard hat','Face shield','Fire-retardant clothing','Heat-resistant gloves','Steel-capped boots'],
  'expired',
  now() - interval '3 days',
  now() - interval '1 day',
  null
),

-- 9. PENDING — General inspection P2
(
  (select id from plants where code = 'P2'),
  'WP-2026-0009', 'general',
  'Safety Inspection — P2 Bleaching Section Monthly Audit',
  'Monthly HSE inspection of P2 bleaching section including bleaching earth handling area, filter press, and associated pipework. Inspection to be performed by HSE Officer and Section Supervisor.',
  'P2 Bleaching Section — Full Area',
  'Bleaching earth dust (respiratory hazard), hot filter surfaces, high-pressure filter press.',
  'Dust masks to be worn in bleaching earth handling area. Filter press to be at ambient pressure during inspection.',
  ARRAY['Respirator','Hard hat','Safety glasses','Steel-capped boots'],
  'pending',
  null,
  null,
  null
),

-- 10. APPROVED — Confined space P5
(
  (select id from plants where code = 'P5'),
  'WP-2026-0010', 'confined_space',
  'Confined Space Entry — P5 Crystalliser Vessel V-502 Coil Inspection',
  'Visual inspection of internal cooling coils inside P5 crystalliser vessel V-502 following a drop in cooling efficiency. Entry by one person, with standby outside.',
  'P5 Crystalliser Bay — Vessel V-502',
  'Oxygen deficiency, residual palm oil making surfaces slippery, limited light.',
  'Vessel drained and ventilated. Continuous O2 monitoring. Standby person with rescue equipment. Intrinsically safe torch.',
  ARRAY['Harness / fall arrest','Hard hat','Safety glasses','Chemical-resistant gloves','Steel-capped boots'],
  'approved',
  now() + interval '4 hours',
  now() + interval '8 hours',
  null
);


-- ============================================================
-- EQUIPMENT REGISTRY
-- ============================================================
insert into equipment_registry (
  plant_id, name, code, equipment_type,
  manufacturer, model, serial_number,
  install_date, last_service_date, next_service_date,
  condition, runtime_hours, service_interval_hours, notes
) values

-- P1 Equipment
(
  (select id from plants where code = 'P1'),
  'P1 Feed Pump', 'P1-PUMP-001', 'Pump',
  'Grundfos', 'NK 65-200/219', 'GF2019-44872',
  '2019-03-15', '2025-11-20', '2026-05-20',
  'good', 14820, 2000,
  'Centrifugal pump. Last impeller wear check clear.'
),
(
  (select id from plants where code = 'P1'),
  'P1 Degummer Heat Exchanger', 'P1-HX-001', 'Heat Exchanger',
  'Alfa Laval', 'M30-FM', 'AL2017-00312',
  '2017-06-01', '2025-09-15', '2026-03-15',
  'fair', 32450, 4000,
  'Shell and tube. Fouling detected on last inspection — efficiency reduced ~8%.'
),
(
  (select id from plants where code = 'P1'),
  'P1 Centrifuge', 'P1-CENT-001', 'Centrifuge',
  'Westfalia', 'OSE 40-01-067', 'WS2020-11901',
  '2020-08-10', '2026-01-08', '2026-07-08',
  'good', 8940, 3000,
  'Disc stack centrifuge. Bowl cleaned and balanced at last service.'
),

-- P2 Equipment
(
  (select id from plants where code = 'P2'),
  'P2 Bleaching Filter Press', 'P2-FP-001', 'Filter',
  'Larox', 'PF 60M2', 'LR2018-20045',
  '2018-04-20', '2025-10-10', '2026-04-10',
  'poor', 27100, 2500,
  'Plate filter press. Two plates showing stress cracks — flagged for replacement. Output pressure inconsistent.'
),
(
  (select id from plants where code = 'P2'),
  'P2 Product Transfer Pump', 'P2-PUMP-001', 'Pump',
  'Flowserve', 'CPXS 2x1.5-8', 'FW2021-78234',
  '2021-02-28', '2026-02-14', '2026-08-14',
  'good', 6720, 2000, null
),

-- P3 Equipment
(
  (select id from plants where code = 'P3'),
  'P3 Deodoriser', 'P3-DEOD-001', 'Reactor / Vessel',
  'Crown Iron Works', 'Continuous Deodoriser CD-6', 'CIW2016-00088',
  '2016-11-01', '2025-08-20', '2026-02-20',
  'critical', 52300, 5000,
  'Main deodoriser column. Significant tray corrosion found at last inspection. Requires full tray replacement — currently running at 85% capacity. Vibration alarm triggered twice in last 30 days.'
),
(
  (select id from plants where code = 'P3'),
  'P3 CPO Feed Pump', 'P3-PUMP-001', 'Pump',
  'Grundfos', 'NK 80-250/255', 'GF2020-55109',
  '2020-01-15', '2026-01-25', '2026-07-25',
  'good', 10450, 2000, null
),
(
  (select id from plants where code = 'P3'),
  'P3 Heat Exchanger HX-301', 'P3-HX-301', 'Heat Exchanger',
  'Alfa Laval', 'AQ10-FG', 'AL2021-09874',
  '2021-05-10', '2025-12-01', '2026-06-01',
  'offline', 11200, 3000,
  'Currently offline — tube bundle replacement in progress (WP-2026-0001).'
),

-- P4 Equipment
(
  (select id from plants where code = 'P4'),
  'P4 Neutraliser', 'P4-NEUT-001', 'Reactor / Vessel',
  'Desmet Ballestra', 'CN-40', 'DB2018-30012',
  '2018-07-01', '2026-01-10', '2026-07-10',
  'fair', 22800, 4000,
  'Continuous neutraliser. Agitator bearing replacement due at next service.'
),
(
  (select id from plants where code = 'P4'),
  'P4 Centrifuge (Soap Stock)', 'P4-CENT-001', 'Centrifuge',
  'Westfalia', 'SA 80-06-177', 'WS2019-22744',
  '2019-09-20', '2025-11-05', '2026-05-05',
  'fair', 18600, 3000,
  'Vibration levels slightly elevated since last month — monitoring weekly.'
),

-- P5 Equipment
(
  (select id from plants where code = 'P5'),
  'P5 Crystalliser No.1', 'P5-CRYS-001', 'Reactor / Vessel',
  'Alfa Laval', 'Votator II C2-40', 'AL2015-00441',
  '2015-03-12', '2025-07-30', '2026-01-30',
  'poor', 43700, 4000,
  'Cooling coil inspection identified 3 pinhole leaks. Repair scheduled. Running on partial capacity.'
),
(
  (select id from plants where code = 'P5'),
  'P5 Crystalliser No.2', 'P5-CRYS-002', 'Reactor / Vessel',
  'Alfa Laval', 'Votator II C2-40', 'AL2015-00442',
  '2015-03-12', '2026-02-10', '2026-08-10',
  'good', 41200, 4000, null
),
(
  (select id from plants where code = 'P5'),
  'P5 Membrane Filter', 'P5-FILT-001', 'Filter',
  'Larox', 'CF 20M2', 'LR2020-40011',
  '2020-06-15', '2026-03-01', '2026-09-01',
  'good', 9800, 2500, null
),

-- P6 Equipment
(
  (select id from plants where code = 'P6'),
  'P6 Crystalliser No.1', 'P6-CRYS-001', 'Reactor / Vessel',
  'Alfa Laval', 'Votator II C2-40', 'AL2016-00887',
  '2016-04-18', '2025-10-25', '2026-04-25',
  'fair', 38900, 4000,
  'Agitator motor running 6A above baseline. Motor winding inspection recommended.'
),
(
  (select id from plants where code = 'P6'),
  'P6 Boiler', 'P6-BOIL-001', 'Boiler',
  'Cleaver-Brooks', 'CB-LE-200', 'CB2017-10023',
  '2017-09-01', '2025-12-15', '2026-06-15',
  'good', 29300, 4380,
  'Annual insurance inspection passed. Next inspection due with next service.'
);


-- ============================================================
-- MAINTENANCE TASKS
-- ============================================================
insert into maintenance_tasks (
  plant_id, equipment_id, title, description,
  task_type, priority, status,
  scheduled_date, estimated_hours, notes
) values

-- Critical + Overdue
(
  (select id from plants where code = 'P3'),
  (select id from equipment_registry where code = 'P3-DEOD-001'),
  'P3 Deodoriser — Full Tray Replacement',
  'Replace all corroded trays in CD-6 deodoriser column. Estimated 4-day shutdown. Crown Iron Works specialist technician to be engaged. All 18 trays to be replaced with 316L stainless steel.',
  'corrective', 'critical', 'in_progress',
  current_date, 32,
  'Specialist technician arriving Monday. Parts on site.'
),
(
  (select id from plants where code = 'P2'),
  (select id from equipment_registry where code = 'P2-FP-001'),
  'P2 Filter Press — Cracked Plate Replacement (×2)',
  'Replace two identified cracked filter plates on PF 60M2. Source replacement plates from Larox spares. Press to be taken offline for minimum 8 hours.',
  'corrective', 'high', 'scheduled',
  current_date + 2, 8,
  'Replacement plates confirmed in stores. Schedule for weekend low-production window.'
),
(
  (select id from plants where code = 'P5'),
  (select id from equipment_registry where code = 'P5-CRYS-001'),
  'P5 Crystalliser 1 — Cooling Coil Pinhole Leak Repair',
  'Weld repair of 3 identified pinhole leaks in internal cooling coils of Votator crystalliser. Requires vessel drain-down, gas-free certification, and confined space permit.',
  'corrective', 'high', 'pending',
  current_date + 3, 12,
  'Confined space permit WP-2026-0010 approved. Certified welder booked.'
),

-- Preventive upcoming
(
  (select id from plants where code = 'P1'),
  (select id from equipment_registry where code = 'P1-HX-001'),
  'P1 Heat Exchanger — Chemical Clean & Tube Inspection',
  'Scheduled 6-monthly chemical cleaning of HX-001 tube bundle. Circulate 2% citric acid solution for 4 hours, flush, then borescope inspection of 20% sample tubes.',
  'preventive', 'medium', 'scheduled',
  current_date + 5, 6, null
),
(
  (select id from plants where code = 'P4'),
  (select id from equipment_registry where code = 'P4-CENT-001'),
  'P4 Centrifuge — Bearing Vibration Investigation',
  'Investigate elevated vibration readings on SA 80 centrifuge. Disassemble bearing housing, inspect spindle bearing for wear. Replace if wear depth exceeds OEM tolerance.',
  'inspection', 'high', 'pending',
  current_date + 1, 4, null
),
(
  (select id from plants where code = 'P3'),
  (select id from equipment_registry where code = 'P3-HX-301'),
  'P3 HX-301 — Post-Repair Pressure Test & Recommission',
  'Hydraulic pressure test of replaced tube bundle at 1.5× operating pressure. Hold for 30 minutes, confirm no leaks. Re-connect pipework and commission. Update equipment records.',
  'inspection', 'high', 'pending',
  current_date + 1, 3,
  'Pending completion of WP-2026-0001.'
),
(
  (select id from plants where code = 'P6'),
  (select id from equipment_registry where code = 'P6-CRYS-001'),
  'P6 Crystalliser 1 — Agitator Motor Winding Inspection',
  'Measure motor winding insulation resistance. Compare against baseline. If < 1MΩ, arrange motor rewind or replacement. Check motor terminal connections and cooling fan.',
  'inspection', 'medium', 'pending',
  current_date + 4, 2, null
),
(
  (select id from plants where code = 'P5'),
  (select id from equipment_registry where code = 'P5-FILT-001'),
  'P5 Membrane Filter — Routine 3-Monthly Service',
  'Replace filter membranes, inspect frame seals, check hydraulic system pressure and fluid level, clean filtrate drainage channels.',
  'preventive', 'low', 'scheduled',
  current_date + 7, 4, null
),
(
  (select id from plants where code = 'P1'),
  (select id from equipment_registry where code = 'P1-CENT-001'),
  'P1 Centrifuge — Bowl Balance Check & Oil Change',
  'Check centrifuge bowl dynamic balance using vibration analyser. Change spindle oil (Shell Turbo T46). Inspect inlet distributor for wear.',
  'preventive', 'low', 'pending',
  current_date + 10, 5, null
),

-- Completed tasks
(
  (select id from plants where code = 'P6'),
  (select id from equipment_registry where code = 'P6-BOIL-001'),
  'P6 Boiler — Annual Insurance Inspection Prep',
  'Prepare boiler for annual external/internal inspection by insurance engineer. Drain, clean, remove inspection covers, confirm safety valve test records available.',
  'inspection', 'medium', 'completed',
  current_date - 7, 8,
  'Inspection passed. Certificate issued. Valid 12 months.'
),
(
  (select id from plants where code = 'P2'),
  (select id from equipment_registry where code = 'P2-PUMP-001'),
  'P2 Product Pump — Mechanical Seal Replacement',
  'Replace worn mechanical seal on CPXS pump. New seal kit from Flowserve ordered. Expected downtime 3 hours.',
  'corrective', 'high', 'completed',
  current_date - 3, 3,
  'Seal replaced. No further leaks observed. Return to service.'
);


-- ============================================================
-- MAINTENANCE ALERTS
-- ============================================================
insert into maintenance_alerts (
  plant_id, equipment_id, alert_type, title, message, severity
) values

(
  (select id from plants where code = 'P3'),
  (select id from equipment_registry where code = 'P3-DEOD-001'),
  'poor_condition',
  'P3 Deodoriser — Critical Condition: Tray Corrosion',
  'Significant tray corrosion identified during internal inspection. Deodoriser operating at 85% capacity. Vibration alarms triggered ×2 in last 30 days. Full tray replacement now in progress.',
  'critical'
),
(
  (select id from plants where code = 'P2'),
  (select id from equipment_registry where code = 'P2-FP-001'),
  'poor_condition',
  'P2 Filter Press — Cracked Filter Plates Detected',
  'Two filter plates showing stress cracks. Continued operation risks sudden failure and product contamination. Replacement scheduled for this weekend.',
  'high'
),
(
  (select id from plants where code = 'P5'),
  (select id from equipment_registry where code = 'P5-CRYS-001'),
  'poor_condition',
  'P5 Crystalliser 1 — Cooling Coil Leaks',
  'Three pinhole leaks identified in internal cooling coils. Unit running at partial capacity. Weld repair permit approved and work in progress.',
  'high'
),
(
  (select id from plants where code = 'P4'),
  (select id from equipment_registry where code = 'P4-CENT-001'),
  'runtime_exceeded',
  'P4 Centrifuge — Elevated Vibration Since Last Month',
  'Bearing vibration readings 15% above baseline and increasing trend over 4 weeks. Inspection required before next service interval to prevent bearing seizure.',
  'high'
),
(
  (select id from plants where code = 'P1'),
  (select id from equipment_registry where code = 'P1-HX-001'),
  'overdue_service',
  'P1 Heat Exchanger — Efficiency Loss: Fouling Detected',
  'Heat transfer efficiency reduced approximately 8% due to fouling on tube side. Chemical clean due. If left untreated, further efficiency loss expected over the next 4–6 weeks.',
  'medium'
),
(
  (select id from plants where code = 'P6'),
  (select id from equipment_registry where code = 'P6-CRYS-001'),
  'runtime_exceeded',
  'P6 Crystalliser 1 — Agitator Motor Drawing Excess Current',
  'Motor running 6A above nameplate baseline. Possible winding deterioration or mechanical resistance. Winding inspection recommended within 7 days.',
  'medium'
);
