'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Save, CheckCircle2, Loader2, ChevronRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plant { id: string; name: string; code: string }

interface RosterPerson {
  name: string; role: string; employeeId: string
  checkIn: string; checkOut: string; status: string
}

type FieldValue =
  | string
  | string[]
  | Record<string, boolean>
  | Array<{ key: string; val: string }>
  | RosterPerson[]
  | Record<string, string>

interface FieldDef {
  key: string; label: string; type: string
  options?: string[]; items?: string[]
}

interface SectionDef {
  id: string; label: string; icon: string
  colorClass: string; bgClass: string; borderClass: string
  accentHex: string
  fields: FieldDef[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PLANT_THEME: Record<string, { badge: string; active: string; dot: string }> = {
  P1: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',   active: 'bg-amber-500',   dot: 'bg-amber-400' },
  P2: { badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30', active: 'bg-yellow-500', dot: 'bg-yellow-400' },
  P3: { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', active: 'bg-orange-500', dot: 'bg-orange-400' },
  P4: { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', active: 'bg-emerald-500', dot: 'bg-emerald-400' },
  P5: { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',       active: 'bg-blue-500',   dot: 'bg-blue-400' },
  P6: { badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30', active: 'bg-violet-500', dot: 'bg-violet-400' },
}
const DEFAULT_THEME = { badge: 'bg-gray-500/15 text-gray-300 border-gray-500/30', active: 'bg-gray-500', dot: 'bg-gray-400' }

const ROLES = ['Supervisor', 'Plant Operator', 'Tank Filler', 'Maintenance Technician', 'Casual Labourer', 'Clerk']

const SECTIONS: SectionDef[] = [
  {
    id: 'shift', label: 'Personnel Shift', icon: '👥',
    colorClass: 'text-sky-400', bgClass: 'bg-sky-500/10', borderClass: 'border-sky-500/30', accentHex: '#0ea5e9',
    fields: [
      { key: 'shiftDate',        label: 'Shift date',                 type: 'date' },
      { key: 'shiftType',        label: 'Shift',                      type: 'select', options: ['Day (06:00–18:00)', 'Night (18:00–06:00)'] },
      { key: 'shiftSupervisor',  label: 'Shift supervisor',           type: 'text' },
      { key: 'roster',           label: 'Shift roster',               type: 'roster' },
      { key: 'attendance',       label: 'Attendance summary',         type: 'attendance' },
      { key: 'absentees',        label: 'Absentees & reason',         type: 'steps' },
      { key: 'overtime',         label: 'Overtime personnel',         type: 'steps' },
      { key: 'handoverNotes',    label: 'Shift handover notes',       type: 'textarea' },
      { key: 'incidentsOnShift', label: 'Incidents on shift',         type: 'textarea' },
      { key: 'nextShiftActions', label: 'Actions for next shift',     type: 'steps' },
      { key: 'signOff',          label: 'Signed off by (supervisor)', type: 'text' },
    ],
  },
  {
    id: 'startup', label: 'Startup Procedure', icon: '▶',
    colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30', accentHex: '#10b981',
    fields: [
      { key: 'preChecks',         label: 'Pre-start checks', type: 'checklist', items: ['Inspect all valves closed', 'Check instrument calibration', 'Verify utility supply (steam/water/power)', 'Confirm PPE worn by all personnel', 'Check lubricant levels on all pumps'] },
      { key: 'sequence',          label: 'Startup sequence',                  type: 'steps' },
      { key: 'setpoints',         label: 'Initial setpoints & parameters',    type: 'keyvalue' },
      { key: 'responsibleOfficer',label: 'Responsible officer',               type: 'text' },
      { key: 'estimatedTime',     label: 'Estimated startup time (mins)',      type: 'number' },
      { key: 'notes',             label: 'Startup notes / remarks',            type: 'textarea' },
    ],
  },
  {
    id: 'running', label: 'Running Procedure', icon: '⚙',
    colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30', accentHex: '#3b82f6',
    fields: [
      { key: 'operatingParams', label: 'Operating parameters',     type: 'keyvalue' },
      { key: 'monitorFreq',     label: 'Monitoring frequency',     type: 'text' },
      { key: 'normalRanges',    label: 'Normal operating ranges',  type: 'keyvalue' },
      { key: 'checkpoints',     label: 'Hourly checkpoints',       type: 'steps' },
      { key: 'operatorTasks',   label: 'Operator duties',          type: 'steps' },
      { key: 'notes',           label: 'Running notes',            type: 'textarea' },
    ],
  },
  {
    id: 'shutdown', label: 'Shutdown Procedure', icon: '⏹',
    colorClass: 'text-red-400', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/30', accentHex: '#ef4444',
    fields: [
      { key: 'shutdownType', label: 'Shutdown type', type: 'select', options: ['Planned', 'Emergency', 'End of batch', 'Maintenance'] },
      { key: 'sequence',     label: 'Shutdown sequence', type: 'steps' },
      { key: 'isolation',    label: 'Isolation steps', type: 'checklist', items: ['Isolate feed lines', 'Drain process lines', 'Close all steam valves', 'De-energise electrical panels', 'Lock out / tag out (LOTO)'] },
      { key: 'postChecks',   label: 'Post-shutdown checks', type: 'checklist', items: ['Confirm all valves closed', 'Check no residual pressure', 'Sign off permit to work'] },
      { key: 'notes',        label: 'Shutdown notes', type: 'textarea' },
    ],
  },
  {
    id: 'production', label: 'Production Report', icon: '📊',
    colorClass: 'text-violet-400', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/30', accentHex: '#8b5cf6',
    fields: [
      { key: 'batchNo',        label: 'Batch number',           type: 'text' },
      { key: 'date',           label: 'Date',                   type: 'date' },
      { key: 'shift',          label: 'Shift',                  type: 'select', options: ['Day (06:00–18:00)', 'Night (18:00–06:00)'] },
      { key: 'feedInput',      label: 'Feed input (MT)',         type: 'number' },
      { key: 'outputProduced', label: 'Output produced (MT)',    type: 'number' },
      { key: 'yieldPct',       label: 'Yield (%)',               type: 'number' },
      { key: 'runningHours',   label: 'Running hours',           type: 'number' },
      { key: 'downtime',       label: 'Downtime (mins)',          type: 'number' },
      { key: 'downtimeCause',  label: 'Downtime cause',          type: 'textarea' },
      { key: 'supervisor',     label: 'Supervisor on duty',      type: 'text' },
      { key: 'remarks',        label: 'Remarks',                 type: 'textarea' },
    ],
  },
  {
    id: 'lab', label: 'Lab Report', icon: '🧪',
    colorClass: 'text-cyan-400', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/30', accentHex: '#06b6d4',
    fields: [
      { key: 'batchNo',      label: 'Batch / sample no.',       type: 'text' },
      { key: 'date',         label: 'Date sampled',             type: 'date' },
      { key: 'ffa',          label: 'FFA (%)',                  type: 'number' },
      { key: 'pv',           label: 'Peroxide value (meq/kg)', type: 'number' },
      { key: 'moisture',     label: 'Moisture (%)',             type: 'number' },
      { key: 'colour',       label: 'Colour (Lovibond R/Y)',    type: 'text' },
      { key: 'meltingPoint', label: 'Melting point (°C)',       type: 'number' },
      { key: 'cloudPoint',   label: 'Cloud point (°C)',         type: 'number' },
      { key: 'iodineValue',  label: 'Iodine value',             type: 'number' },
      { key: 'soapContent',  label: 'Soap content (ppm)',       type: 'number' },
      { key: 'status',       label: 'Quality status',           type: 'select', options: ['Pass', 'Fail', 'Hold — retest', 'Conditional pass'] },
      { key: 'analyst',      label: 'Analyst name',             type: 'text' },
      { key: 'remarks',      label: 'Remarks',                  type: 'textarea' },
    ],
  },
  {
    id: 'maintenance', label: 'Maintenance', icon: '🔧',
    colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30', accentHex: '#f59e0b',
    fields: [
      { key: 'maintenanceType', label: 'Maintenance type', type: 'select', options: ['Preventive', 'Corrective', 'Predictive', 'Breakdown', 'Overhaul'] },
      { key: 'date',            label: 'Date',                          type: 'date' },
      { key: 'equipment',       label: 'Equipment / tag no.',           type: 'text' },
      { key: 'description',     label: 'Work description',             type: 'textarea' },
      { key: 'partsUsed',       label: 'Parts / materials used',       type: 'steps' },
      { key: 'technicianName',  label: 'Technician name',              type: 'text' },
      { key: 'timeSpent',       label: 'Time spent (hrs)',              type: 'number' },
      { key: 'nextService',     label: 'Next scheduled service',       type: 'date' },
      { key: 'permitNo',        label: 'Work permit no.',              type: 'text' },
      { key: 'status',          label: 'Status',                       type: 'select', options: ['Completed', 'In progress', 'Deferred', 'Parts awaited'] },
      { key: 'remarks',         label: 'Remarks',                      type: 'textarea' },
    ],
  },
  {
    id: 'cleaning', label: 'Cleaning Schedule', icon: '🧹',
    colorClass: 'text-teal-400', bgClass: 'bg-teal-500/10', borderClass: 'border-teal-500/30', accentHex: '#14b8a6',
    fields: [
      { key: 'frequency',         label: 'Cleaning frequency',          type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'After each batch', 'As required'] },
      { key: 'areas',             label: 'Areas to clean',              type: 'checklist', items: ['Feed lines', 'Heat exchangers', 'Filters / strainers', 'Pumps and seals', 'Tanks and vessels', 'Floor and drainage'] },
      { key: 'chemicalsUsed',     label: 'Chemicals / detergents used', type: 'steps' },
      { key: 'procedure',         label: 'Cleaning procedure steps',    type: 'steps' },
      { key: 'rinseVerification', label: 'Rinse verification method',   type: 'text' },
      { key: 'responsiblePerson', label: 'Responsible person',          type: 'text' },
      { key: 'remarks',           label: 'Remarks',                     type: 'textarea' },
    ],
  },
  {
    id: 'equipment', label: 'Equipment Handling', icon: '🏗',
    colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/30', accentHex: '#6366f1',
    fields: [
      { key: 'equipmentList',     label: 'Equipment register',          type: 'steps' },
      { key: 'operatingLimits',   label: 'Operating limits per unit',   type: 'keyvalue' },
      { key: 'safeHandling',      label: 'Safe handling instructions',  type: 'steps' },
      { key: 'prohibitedActions', label: 'Prohibited actions',          type: 'checklist', items: ['Do not operate beyond rated capacity', 'Do not bypass safety interlocks', 'Do not operate without guards', 'Do not leave running equipment unattended during startup'] },
      { key: 'ppeRequired',       label: 'PPE required for this plant', type: 'checklist', items: ['Hard hat', 'Safety glasses', 'Heat-resistant gloves', 'Steel-capped boots', 'Chemical apron', 'Face shield', 'Ear protection'] },
      { key: 'remarks',           label: 'Equipment notes',             type: 'textarea' },
    ],
  },
  {
    id: 'hazard', label: 'Hazard & Safety Audit', icon: '⚠',
    colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/30', accentHex: '#f43f5e',
    fields: [
      { key: 'auditDate',         label: 'Audit date',                             type: 'date' },
      { key: 'auditor',           label: 'Auditor name',                           type: 'text' },
      { key: 'hazardChecklist',   label: 'Hazard identification checklist',        type: 'checklist', items: ['Hot surfaces / steam leaks', 'Chemical spill risk', 'Slip / trip hazards', 'Electrical hazards', 'Noise levels', 'Fire / explosion risk', 'Confined space entry', 'Working at height', 'Manual handling'] },
      { key: 'incidentsReported', label: 'Incidents reported since last audit',    type: 'textarea' },
      { key: 'correctiveActions', label: 'Corrective actions raised',              type: 'steps' },
      { key: 'safetyScore',       label: 'Audit score (%)',                        type: 'number' },
      { key: 'nextAuditDate',     label: 'Next audit date',                        type: 'date' },
      { key: 'signOff',           label: 'Signed off by',                          type: 'text' },
      { key: 'remarks',           label: 'Remarks',                                type: 'textarea' },
    ],
  },
]

// ─── Field components ─────────────────────────────────────────────────────────

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500'

function StepsField({ value = [], onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {value.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-mono w-5 text-right shrink-0">{i + 1}.</span>
          <input value={step} onChange={e => { const s = [...value]; s[i] = e.target.value; onChange(s) }}
            placeholder={`Step ${i + 1}`} className={INPUT} />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-gray-600 hover:text-gray-300 shrink-0 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, ''])}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-dashed border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors">
        <Plus size={12} /> Add step
      </button>
    </div>
  )
}

function ChecklistField({ items = [], value = {}, onChange }: {
  items: string[]
  value: Record<string, boolean>
  onChange: (v: Record<string, boolean>) => void
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const checked = !!value[item]
        return (
          <button key={i} type="button" onClick={() => onChange({ ...value, [item]: !checked })}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all ${
              checked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
            }`}>
            <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
              checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'
            }`}>
              {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
            </span>
            <span className={`text-sm ${checked ? 'line-through opacity-60' : ''}`}>{item}</span>
          </button>
        )
      })}
    </div>
  )
}

function KeyValueField({ value = [], onChange }: {
  value: Array<{ key: string; val: string }>
  onChange: (v: Array<{ key: string; val: string }>) => void
}) {
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={row.key} onChange={e => { const a = [...value]; a[i] = { ...a[i], key: e.target.value }; onChange(a) }}
            placeholder="Parameter"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          <span className="text-gray-600 text-sm font-mono">=</span>
          <input value={row.val} onChange={e => { const a = [...value]; a[i] = { ...a[i], val: e.target.value }; onChange(a) }}
            placeholder="Value / range"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-gray-600 hover:text-gray-300 shrink-0 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { key: '', val: '' }])}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-dashed border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors">
        <Plus size={12} /> Add parameter
      </button>
    </div>
  )
}

const ROSTER_STATUS_CLS: Record<string, string> = {
  Present:  'text-emerald-300 border-emerald-500/40',
  Absent:   'text-red-300 border-red-500/40',
  Late:     'text-amber-300 border-amber-500/40',
  'On leave': 'text-violet-300 border-violet-500/40',
  'Half day': 'text-cyan-300 border-cyan-500/40',
}
const ROSTER_STATUS_DOT: Record<string, string> = {
  Present: 'bg-emerald-400', Absent: 'bg-red-400', Late: 'bg-amber-400',
  'On leave': 'bg-violet-400', 'Half day': 'bg-cyan-400',
}

function RosterField({ value = [], onChange }: { value: RosterPerson[]; onChange: (v: RosterPerson[]) => void }) {
  const update = (i: number, k: keyof RosterPerson, v: string) => {
    const a = [...value]; a[i] = { ...a[i], [k]: v }; onChange(a)
  }
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-1.5">
            <div className="grid grid-cols-[1fr_130px_80px_70px_70px_105px_24px] gap-2 px-2 py-1 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
              {['Name', 'Role', 'Emp ID', 'Check in', 'Check out', 'Status', ''].map((h, i) => (
                <span key={i}>{h}</span>
              ))}
            </div>
            {value.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_130px_80px_70px_70px_105px_24px] gap-2 items-center bg-gray-800/50 border border-gray-700 rounded-lg px-2 py-1.5">
                <input value={p.name} onChange={e => update(i, 'name', e.target.value)} placeholder="Full name"
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none" />
                <select value={p.role} onChange={e => update(i, 'role', e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none">
                  <option value="">— Role —</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input value={p.employeeId} onChange={e => update(i, 'employeeId', e.target.value)} placeholder="ID"
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono placeholder-gray-600 focus:outline-none" />
                <input type="time" value={p.checkIn} onChange={e => update(i, 'checkIn', e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono [color-scheme:dark] focus:outline-none" />
                <input type="time" value={p.checkOut} onChange={e => update(i, 'checkOut', e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono [color-scheme:dark] focus:outline-none" />
                <select value={p.status} onChange={e => update(i, 'status', e.target.value)}
                  className={`bg-gray-900 border rounded px-2 py-1 text-xs font-semibold focus:outline-none ${ROSTER_STATUS_CLS[p.status] || 'border-gray-700 text-white'}`}>
                  {['Present', 'Absent', 'Late', 'On leave', 'Half day'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="text-gray-600 hover:text-gray-300 flex items-center justify-center">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <button type="button"
        onClick={() => onChange([...value, { name: '', role: '', employeeId: '', checkIn: '', checkOut: '', status: 'Present' }])}
        className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 border border-dashed border-sky-500/30 hover:border-sky-500/60 rounded-lg px-3 py-1.5 transition-colors">
        <Plus size={12} /> Add person
      </button>
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 px-3 py-2.5 bg-gray-800/40 rounded-lg border border-gray-700 text-xs">
          {['Present', 'Absent', 'Late', 'On leave', 'Half day'].map(s => {
            const count = value.filter(p => p.status === s).length
            if (!count) return null
            return (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${ROSTER_STATUS_DOT[s]}`} />
                <span className="text-gray-500">{s}:</span>
                <span className="font-mono font-bold text-white">{count}</span>
              </span>
            )
          })}
          <span className="ml-auto text-gray-500">
            Total: <span className="font-mono font-bold text-white">{value.length}</span>
          </span>
        </div>
      )}
    </div>
  )
}

function AttendanceField({ value = {}, onChange }: {
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
}) {
  const fields = [
    { key: 'scheduled',   label: 'Scheduled headcount' },
    { key: 'actual',      label: 'Actual present' },
    { key: 'operators',   label: 'Plant operators' },
    { key: 'tankFillers', label: 'Tank fillers' },
    { key: 'technicians', label: 'Maintenance tech.' },
    { key: 'casuals',     label: 'Casual labourers' },
  ]
  const scheduled = parseInt(value.scheduled) || 0
  const actual    = parseInt(value.actual) || 0
  const pct = scheduled > 0 ? Math.min(Math.round((actual / scheduled) * 100), 100) : 0
  const barCls  = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'
  const textCls = pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {fields.map(f => (
          <div key={f.key} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-500 mb-1.5 leading-tight">{f.label}</div>
            <input type="number" min="0" value={value[f.key] || ''} placeholder="0"
              onChange={e => onChange({ ...value, [f.key]: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-center text-lg font-mono font-bold text-white focus:outline-none focus:border-gray-500" />
          </div>
        ))}
      </div>
      {scheduled > 0 && (
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Attendance rate</span>
            <span className={`text-sm font-mono font-bold ${textCls}`}>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${barCls}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function FieldRenderer({ field, value, onChange }: { field: FieldDef; value: FieldValue | undefined; onChange: (v: FieldValue) => void }) {
  if (field.type === 'steps')      return <StepsField value={(value as string[]) ?? []} onChange={v => onChange(v)} />
  if (field.type === 'checklist')  return <ChecklistField items={field.items ?? []} value={(value as Record<string,boolean>) ?? {}} onChange={v => onChange(v)} />
  if (field.type === 'keyvalue')   return <KeyValueField value={(value as Array<{key:string;val:string}>) ?? []} onChange={v => onChange(v)} />
  if (field.type === 'roster')     return <RosterField value={(value as RosterPerson[]) ?? []} onChange={v => onChange(v)} />
  if (field.type === 'attendance') return <AttendanceField value={(value as Record<string,string>) ?? {}} onChange={v => onChange(v)} />
  if (field.type === 'textarea') return (
    <textarea rows={3} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}...`}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none leading-relaxed" />
  )
  if (field.type === 'select') return (
    <select value={(value as string) ?? ''} onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
      <option value="">— Select —</option>
      {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={(value as string) ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}...`}
      className={`${INPUT} [color-scheme:dark]`} />
  )
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function fieldCompleted(field: FieldDef, v: FieldValue | undefined): boolean {
  if (v === undefined || v === null || v === '') return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v).length > 0
  return String(v).trim().length > 0
}

function sectionProgress(section: SectionDef, data: Record<string, FieldValue>): number {
  const filled = section.fields.filter(f => fieldCompleted(f, data[f.key])).length
  return Math.round((filled / section.fields.length) * 100)
}

// ─── Section panel ────────────────────────────────────────────────────────────

function SectionPanel({
  section, data, onSave, saving,
}: {
  section: SectionDef
  data: Record<string, FieldValue>
  onSave: (sectionId: string, data: Record<string, FieldValue>) => Promise<void>
  saving: boolean
}) {
  const [local, setLocal] = useState<Record<string, FieldValue>>(data)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Sync when parent data changes (e.g. loaded from Supabase)
  useEffect(() => { setLocal(data) }, [data])

  const update = (key: string, val: FieldValue) => setLocal(prev => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    setSaveState('saving')
    await onSave(section.id, local)
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2500)
  }

  const pct = sectionProgress(section, local)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Section header */}
      <div className={`${section.bgClass} border-b ${section.borderClass} px-5 py-4`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">{section.icon}</span>
            <div>
              <h2 className={`font-bold text-base ${section.colorClass}`}>{section.label}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {section.fields.filter(f => fieldCompleted(f, local[f.key])).length} of {section.fields.length} fields completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${section.colorClass.replace('text-', 'bg-').replace('-400', '-500')}`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-mono font-bold ${section.colorClass}`}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="p-5 space-y-5">
        {section.fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {field.label}
            </label>
            <FieldRenderer field={field} value={local[field.key]} onChange={val => update(field.key, val)} />
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
        <button type="button" onClick={handleSave} disabled={saveState === 'saving'}
          className={`flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg transition-all disabled:opacity-60 ${
            saveState === 'saved'
              ? 'bg-emerald-600 text-white'
              : `text-white`
          }`}
          style={{ backgroundColor: saveState === 'saved' ? undefined : section.accentHex }}>
          {saveState === 'saving' ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : saveState === 'saved' ? (
            <><CheckCircle2 size={14} /> Saved</>
          ) : (
            <><Save size={14} /> Save section</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProceduresModule({ plants, userId }: { plants: Plant[]; userId: string }) {
  const supabase = createClient()

  const [activePlantId, setActivePlantId]     = useState<string>(plants[0]?.id ?? '')
  const [activeSectionId, setActiveSectionId] = useState<string>(SECTIONS[0].id)
  // allData[plantId][sectionId] = { fieldKey: value, ... }
  const [allData, setAllData]                 = useState<Record<string, Record<string, Record<string, FieldValue>>>>({})
  const [loading, setLoading]                 = useState(false)
  const [saving, setSaving]                   = useState(false)

  const activePlant   = plants.find(p => p.id === activePlantId)
  const activeSection = SECTIONS.find(s => s.id === activeSectionId)!
  const plantTheme    = activePlant ? (PLANT_THEME[activePlant.code] ?? DEFAULT_THEME) : DEFAULT_THEME
  const plantData     = allData[activePlantId] ?? {}

  // Load all procedure data for a plant
  const loadPlant = useCallback(async (plantId: string) => {
    if (!plantId || allData[plantId]) return
    setLoading(true)
    const { data } = await supabase
      .from('plant_procedures')
      .select('section_id, data')
      .eq('plant_id', plantId)
    if (data) {
      const mapped: Record<string, Record<string, FieldValue>> = {}
      for (const row of data) {
        mapped[row.section_id] = row.data as Record<string, FieldValue>
      }
      setAllData(prev => ({ ...prev, [plantId]: mapped }))
    } else {
      setAllData(prev => ({ ...prev, [plantId]: {} }))
    }
    setLoading(false)
  }, [allData, supabase])

  useEffect(() => { loadPlant(activePlantId) }, [activePlantId])

  // Save a section to Supabase
  const handleSave = async (sectionId: string, data: Record<string, FieldValue>) => {
    setSaving(true)
    await supabase.from('plant_procedures').upsert(
      { plant_id: activePlantId, section_id: sectionId, data, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'plant_id,section_id' }
    )
    setAllData(prev => ({
      ...prev,
      [activePlantId]: { ...(prev[activePlantId] ?? {}), [sectionId]: data },
    }))
    setSaving(false)
  }

  const overallPct = (plantId: string) => {
    const pd = allData[plantId] ?? {}
    const filled = SECTIONS.filter(s => {
      const sd = pd[s.id] ?? {}
      return s.fields.some(f => fieldCompleted(f, sd[f.key]))
    }).length
    return Math.round((filled / SECTIONS.length) * 100)
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Panel 1: Plant selector ────────────────────────── */}
      <div className="w-44 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 shrink-0">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Plants</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {plants.map(p => {
            const theme  = PLANT_THEME[p.code] ?? DEFAULT_THEME
            const active = p.id === activePlantId
            const pct    = overallPct(p.id)
            return (
              <button key={p.id} type="button"
                onClick={() => { setActivePlantId(p.id); setActiveSectionId(SECTIONS[0].id) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  active ? theme.active + ' text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <p className={`font-bold text-sm leading-tight ${active ? 'text-white' : ''}`}>{p.name}</p>
                <p className={`text-xs mt-0.5 ${active ? 'text-white/70' : 'text-gray-600'}`}>{p.code}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`flex-1 h-1 rounded-full ${active ? 'bg-white/20' : 'bg-gray-800'}`}>
                    <div className={`h-full rounded-full ${active ? 'bg-white' : theme.dot}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-[10px] font-mono ${active ? 'text-white/80' : 'text-gray-600'}`}>{pct}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panel 2: Section nav ───────────────────────────── */}
      <div className="w-48 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 shrink-0">
          <p className={`font-bold text-sm ${plantTheme.badge.split(' ')[1]}`}>{activePlant?.name ?? '—'}</p>
          <p className="text-xs text-gray-600 mt-0.5">{activePlant?.code} · {overallPct(activePlantId)}% done</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {SECTIONS.map(s => {
            const sd  = plantData[s.id] ?? {}
            const pct = sectionProgress(s, sd)
            const active = s.id === activeSectionId
            return (
              <button key={s.id} type="button" onClick={() => setActiveSectionId(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border-l-2 transition-all ${
                  active
                    ? `${s.bgClass} ${s.borderClass} ${s.colorClass}`
                    : 'border-transparent text-gray-500 hover:text-white hover:bg-gray-800/50'
                }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{s.icon}</span>
                  <span className={`text-xs font-semibold leading-tight ${active ? s.colorClass : ''}`}>{s.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 pl-6">
                  <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.colorClass.replace('text-', 'bg-').replace('-400', '-500')}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-gray-600">{pct}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panel 3: Section content ───────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-950">
        {/* Breadcrumb */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2 text-sm shrink-0">
          <span className="text-gray-400">{activePlant?.name}</span>
          <ChevronRight size={14} className="text-gray-700" />
          <span className={`font-semibold ${activeSection.colorClass}`}>
            {activeSection.icon} {activeSection.label}
          </span>
          {loading && <Loader2 size={13} className="ml-2 animate-spin text-gray-600" />}
        </div>

        <div className="p-6 max-w-3xl">
          <SectionPanel
            key={`${activePlantId}-${activeSectionId}`}
            section={activeSection}
            data={plantData[activeSectionId] ?? {}}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>
    </div>
  )
}
