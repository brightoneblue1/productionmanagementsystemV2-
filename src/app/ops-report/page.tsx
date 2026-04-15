import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Droplets, AlertTriangle, CheckCircle2,
  FlaskConical, Briefcase, Zap, User, TrendingUp,
  Building2, Fuel,
} from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/ui/AppShell'
import PrintButton from './PrintButton'
import type { Profile } from '@/types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(current: number, capacity: number) {
  if (!capacity) return 0
  return Math.min(100, Math.round((current / capacity) * 100))
}

type TankStatus = 'critical' | 'low' | 'almost_empty' | 'normal' | 'almost_full' | 'high'

function tankStatus(t: {
  current_level_liters: number; capacity_liters: number
  min_level_percent: number; max_level_percent: number
  alert_low_percent: number; alert_high_percent: number
}): TankStatus {
  const p = pct(t.current_level_liters, t.capacity_liters)
  if (p <= 5)                         return 'critical'
  if (p < t.min_level_percent)        return 'low'
  if (p > t.max_level_percent)        return 'high'
  if (p < (t.alert_low_percent ?? 25)) return 'almost_empty'
  if (p > (t.alert_high_percent ?? 80)) return 'almost_full'
  return 'normal'
}

const TANK_STATUS_STYLE: Record<TankStatus, { dot: string; text: string; label: string }> = {
  critical:    { dot: 'bg-red-500',     text: 'text-red-400',     label: 'Critical'     },
  low:         { dot: 'bg-orange-400',  text: 'text-orange-400',  label: 'Low'          },
  almost_empty:{ dot: 'bg-yellow-400',  text: 'text-yellow-400',  label: 'Almost Empty' },
  normal:      { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'Normal'       },
  almost_full: { dot: 'bg-sky-400',     text: 'text-sky-400',     label: 'Almost Full'  },
  high:        { dot: 'bg-blue-500',    text: 'text-blue-400',    label: 'High'         },
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function fmtL(n: number) {
  return n.toLocaleString() + ' L'
}
function timeAgo(s: string) {
  const mins = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const SEV_STYLE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:      'bg-gray-500/20 text-gray-400 border-gray-500/30',
}
const STATUS_STYLE: Record<string, string> = {
  draft:       'text-gray-400',
  submitted:   'text-blue-400',
  approved:    'text-emerald-400',
  rejected:    'text-red-400',
  open:        'text-red-400',
  in_progress: 'text-yellow-400',
  resolved:    'text-emerald-400',
  closed:      'text-gray-500',
}

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode
}) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden print:border-gray-300 print:rounded-none print:mb-6">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800 bg-gray-900/80 print:border-gray-300 print:bg-white">
        <span className="text-gray-400 print:text-gray-600">{icon}</span>
        <h2 className="font-semibold text-sm text-white print:text-black">{title}</h2>
      </div>
      <div className="p-5 print:bg-white">{children}</div>
    </section>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string | null; color?: string
}) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-4 print:border print:border-gray-200 print:bg-white">
      <p className="text-xs text-gray-500 mb-1 print:text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-white'} print:text-black`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 print:text-gray-600">{sub}</p>}
    </div>
  )
}

// ─── table helpers ─────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`pb-2 text-xs font-medium text-gray-500 border-b border-gray-800 print:border-gray-300 print:text-gray-600 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}
function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td className={`py-2.5 text-xs text-gray-300 border-b border-gray-800/50 print:border-gray-200 print:text-gray-700 ${right ? 'text-right' : ''} ${mono ? 'font-mono' : ''}`}>
      {children}
    </td>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function OpsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days: daysParam } = await searchParams
  const days = Math.min(90, Math.max(1, parseInt(daysParam ?? '7') || 7))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')

  // ── parallel fetch ─────────────────────────────────────────────────────────
  const [
    { data: farms },
    { data: plants },
    { data: shiftReports },
    { data: labReports },
    { data: problems },
    { data: fillEvents },
  ] = await Promise.all([

    supabase.from('tank_farms').select(`
      id, name, code,
      tanks (
        id, name, code, capacity_liters, current_level_liters, product_type,
        min_level_percent, max_level_percent, alert_low_percent, alert_high_percent,
        pump_flow_rate_lph, pump_speed_factor, assigned_filler_id, is_active,
        assigned_filler:profiles!tanks_assigned_filler_id_fkey ( full_name )
      )
    `).order('code'),

    supabase.from('plants').select('id, name, code, is_active').order('name'),

    supabase.from('shift_reports').select(`
      id, total_produced_liters, spillage_liters,
      non_conforming_liters, net_production_liters, created_at,
      shifts ( shift_date, shift_type, plants ( name ) )
    `).gte('created_at', since).order('created_at', { ascending: false }).limit(100),

    supabase.from('lab_reports').select(`
      id, report_number, status, sample_taken_at,
      plants ( name ),
      submitter:profiles!lab_reports_submitted_by_fkey ( full_name ),
      quality_values ( is_within_spec )
    `).gte('sample_taken_at', since).order('sample_taken_at', { ascending: false }).limit(50),

    supabase.from('problems').select(`
      id, title, severity, status, priority, reported_at, due_date,
      plants ( name ),
      reporter:profiles!problems_reported_by_fkey ( full_name ),
      assignee:profiles!problems_assigned_to_fkey ( full_name )
    `).in('status', ['open', 'in_progress'])
      .order('priority', { ascending: true, nullsFirst: false })
      .order('reported_at', { ascending: false }),

    supabase.from('tank_fill_events').select(`
      id, volume_added_liters, product_type, tanker_reference, started_at,
      tanks ( name, code ),
      operator:profiles!tank_fill_events_operator_id_fkey ( full_name )
    `).gte('started_at', since).order('started_at', { ascending: false }).limit(50),
  ])

  // ── derived stats ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTanks: any[] = farms?.flatMap((f: any) => f.tanks ?? []) ?? []
  const activeTanks = allTanks.filter((t: any) => t.is_active)
  const tankAlerts = activeTanks.filter((t: any) => tankStatus(t) !== 'normal').length
  const tankCritical = activeTanks.filter((t: any) => tankStatus(t) === 'critical').length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sr = (shiftReports ?? []) as any[]
  const totalGross = sr.reduce((s, r) => s + (r.total_produced_liters ?? 0), 0)
  const totalSpillage = sr.reduce((s, r) => s + (r.spillage_liters ?? 0), 0)
  const totalNonConf = sr.reduce((s, r) => s + (r.non_conforming_liters ?? 0), 0)
  const totalNet = sr.reduce((s, r) => s + (r.net_production_liters ?? 0), 0)
  const efficiencyPct = totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lr = (labReports ?? []) as any[]
  const pendingLab = lr.filter((r: any) => r.status === 'submitted').length
  const passedLab = lr.filter((r: any) => r.status === 'approved').length
  const labParams = lr.flatMap((r: any) => r.quality_values ?? [])
  const labPassCount = labParams.filter((q: any) => q.is_within_spec === true).length
  const labFailCount = labParams.filter((q: any) => q.is_within_spec === false).length
  const labPassRate = (labPassCount + labFailCount) > 0
    ? Math.round((labPassCount / (labPassCount + labFailCount)) * 100)
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const probs = (problems ?? []) as any[]
  const critProbs = probs.filter((p: any) => p.severity === 'critical').length
  const highProbs = probs.filter((p: any) => p.severity === 'high').length
  const overdueProbs = probs.filter((p: any) =>
    p.due_date && new Date(p.due_date) < new Date()).length

  // aggregate production by date for table
  const prodByDate = new Map<string, { gross: number; spillage: number; nonConf: number; net: number; shifts: number }>()
  for (const r of sr) {
    const date: string = r.shifts?.shift_date ?? r.created_at?.split('T')[0] ?? ''
    if (!date) continue
    const ex = prodByDate.get(date) ?? { gross: 0, spillage: 0, nonConf: 0, net: 0, shifts: 0 }
    prodByDate.set(date, {
      gross:    ex.gross    + (r.total_produced_liters  ?? 0),
      spillage: ex.spillage + (r.spillage_liters        ?? 0),
      nonConf:  ex.nonConf  + (r.non_conforming_liters  ?? 0),
      net:      ex.net      + (r.net_production_liters  ?? 0),
      shifts:   ex.shifts   + 1,
    })
  }
  const prodRows = Array.from(prodByDate.entries())
    .sort(([a], [b]) => b.localeCompare(a))

  const generatedAt = new Date().toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <AppShell profile={profile}>
      {/* ── top bar ── */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-bold text-lg text-white">Operations Report</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Worth Oil Processors · {generatedAt}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center gap-1 text-xs bg-gray-800 rounded-lg p-1">
            {[7, 30, 90].map(d => (
              <Link
                key={d}
                href={`/ops-report?days=${d}`}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  days === d
                    ? 'bg-orange-500 text-white font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {d}d
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>

      {/* inline print trigger */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          var btn = document.querySelector('[data-print]');
          if (btn) btn.addEventListener('click', function() { window.print(); });
        });
      `}} />

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6 print:px-0 print:py-0 print:space-y-4">

        {/* ── print header (hidden on screen) ── */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-black">Worth Oil Processors — Operations Report</h1>
          <p className="text-sm text-gray-600 mt-1">
            Period: last {days} days · Generated: {generatedAt} · By: {profile.full_name}
          </p>
        </div>

        {/* ── executive summary ── */}
        <Section icon={<TrendingUp size={15} />} title="Executive Summary">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat
              label="Active Tanks"
              value={activeTanks.length}
              sub={tankAlerts > 0 ? `${tankAlerts} alerts` : 'all normal'}
              color={tankAlerts > 0 ? 'text-orange-400' : undefined}
            />
            <Stat
              label="Critical Tanks"
              value={tankCritical}
              sub={tankCritical > 0 ? 'urgent fill needed' : 'none critical'}
              color={tankCritical > 0 ? 'text-red-400' : undefined}
            />
            <Stat
              label="Net Production"
              value={totalNet > 0 ? (totalNet / 1000).toFixed(1) + 'k L' : '—'}
              sub={`${days}d period`}
              color="text-emerald-400"
            />
            <Stat
              label="Efficiency"
              value={efficiencyPct !== null ? `${efficiencyPct}%` : '—'}
              sub={totalGross > 0 ? `${(totalSpillage / 1000).toFixed(1)}k L lost` : 'no data'}
              color={efficiencyPct !== null && efficiencyPct < 90 ? 'text-yellow-400' : undefined}
            />
            <Stat
              label="Open Problems"
              value={probs.length}
              sub={critProbs > 0 ? `${critProbs} critical` : overdueProbs > 0 ? `${overdueProbs} overdue` : 'none critical'}
              color={critProbs > 0 ? 'text-red-400' : probs.length > 0 ? 'text-yellow-400' : undefined}
            />
            <Stat
              label="Lab Reports"
              value={lr.length}
              sub={pendingLab > 0 ? `${pendingLab} pending approval` : labPassRate !== null ? `${labPassRate}% pass rate` : 'no data'}
              color={pendingLab > 0 ? 'text-yellow-400' : undefined}
            />
          </div>
        </Section>

        {/* ── tank farm status ── */}
        <Section icon={<Droplets size={15} />} title="Tank Farm Status">
          {!farms || farms.length === 0 ? (
            <p className="text-sm text-gray-500">No tank farms configured.</p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (farms as any[]).map((farm: any) => {
              const active = (farm.tanks ?? []).filter((t: any) => t.is_active)
              const farmAlerts = active.filter((t: any) => tankStatus(t) !== 'normal').length
              return (
                <div key={farm.id} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-sm text-white">{farm.name}</span>
                    <span className="text-xs text-gray-500">({farm.code})</span>
                    {farmAlerts > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-orange-400">
                        <AlertTriangle size={11} /> {farmAlerts} alert{farmAlerts > 1 ? 's' : ''}
                      </span>
                    ) : active.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 size={11} /> All normal
                      </span>
                    ) : null}
                  </div>
                  {active.length === 0 ? (
                    <p className="text-xs text-gray-600">No active tanks.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <Th>Tank</Th>
                            <Th>Product</Th>
                            <Th right>Level</Th>
                            <Th right>Volume</Th>
                            <Th right>Capacity</Th>
                            <Th>Status</Th>
                            <Th>Pump</Th>
                            <Th>Assigned To</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {active.map((t: any) => {
                            const p = pct(t.current_level_liters, t.capacity_liters)
                            const st = tankStatus(t)
                            const stStyle = TANK_STATUS_STYLE[st]
                            const effRate = (t.pump_flow_rate_lph ?? 0) * (t.pump_speed_factor ?? 1)
                            return (
                              <tr key={t.id}>
                                <Td>
                                  <span className="font-medium text-white">{t.name}</span>
                                  <span className="text-gray-600 ml-1">({t.code})</span>
                                </Td>
                                <Td>{t.product_type ?? <span className="text-gray-600">—</span>}</Td>
                                <Td right>
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${stStyle.dot}`} style={{ width: `${p}%` }} />
                                    </div>
                                    <span className="font-medium text-white">{p}%</span>
                                  </div>
                                </Td>
                                <Td right mono>{t.current_level_liters.toLocaleString()}</Td>
                                <Td right mono>{t.capacity_liters.toLocaleString()}</Td>
                                <Td>
                                  <span className={`flex items-center gap-1 ${stStyle.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${stStyle.dot}`} />
                                    {stStyle.label}
                                  </span>
                                </Td>
                                <Td>
                                  {t.pump_flow_rate_lph > 0 ? (
                                    <span className="flex items-center gap-1">
                                      <Zap size={10} className={t.pump_speed_factor > 0 ? 'text-yellow-400' : 'text-gray-600'} />
                                      {Math.round((t.pump_speed_factor ?? 1) * 100)}%
                                      {effRate > 0 && <span className="text-gray-600 ml-1">{effRate.toLocaleString()} L/hr</span>}
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">—</span>
                                  )}
                                </Td>
                                <Td>
                                  {t.assigned_filler?.full_name
                                    ? <span className="flex items-center gap-1"><User size={10} className="text-gray-500" />{t.assigned_filler.full_name}</span>
                                    : <span className="text-gray-600">Unassigned</span>}
                                </Td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </Section>

        {/* ── production summary ── */}
        <Section icon={<Briefcase size={15} />} title={`Production Summary — Last ${days} Days`}>
          {sr.length === 0 ? (
            <p className="text-sm text-gray-500">No shift reports submitted in this period.</p>
          ) : (
            <>
              {/* totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-gray-800/60 rounded-lg p-3 print:border print:border-gray-200">
                  <p className="text-xs text-gray-500">Gross Production</p>
                  <p className="text-lg font-bold text-white">{fmtL(totalGross)}</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3 print:border print:border-gray-200">
                  <p className="text-xs text-gray-500">Spillage</p>
                  <p className="text-lg font-bold text-red-400">{fmtL(totalSpillage)}</p>
                  {totalGross > 0 && <p className="text-xs text-gray-600">{((totalSpillage / totalGross) * 100).toFixed(1)}% of gross</p>}
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3 print:border print:border-gray-200">
                  <p className="text-xs text-gray-500">Non-Conforming</p>
                  <p className="text-lg font-bold text-yellow-400">{fmtL(totalNonConf)}</p>
                  {totalGross > 0 && <p className="text-xs text-gray-600">{((totalNonConf / totalGross) * 100).toFixed(1)}% of gross</p>}
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3 print:border print:border-gray-200">
                  <p className="text-xs text-gray-500">Net Production</p>
                  <p className="text-lg font-bold text-emerald-400">{fmtL(totalNet)}</p>
                  {efficiencyPct !== null && <p className="text-xs text-gray-600">{efficiencyPct}% efficiency</p>}
                </div>
              </div>

              {/* per-day table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th right>Shifts</Th>
                      <Th right>Gross (L)</Th>
                      <Th right>Spillage (L)</Th>
                      <Th right>Non-Conf (L)</Th>
                      <Th right>Net (L)</Th>
                      <Th right>Efficiency</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {prodRows.map(([date, v]) => {
                      const eff = v.gross > 0 ? Math.round((v.net / v.gross) * 100) : null
                      return (
                        <tr key={date}>
                          <Td>{fmtDate(date)}</Td>
                          <Td right>{v.shifts}</Td>
                          <Td right mono>{v.gross.toLocaleString()}</Td>
                          <Td right><span className={v.spillage > 0 ? 'text-red-400' : ''}>{v.spillage.toLocaleString()}</span></Td>
                          <Td right><span className={v.nonConf > 0 ? 'text-yellow-400' : ''}>{v.nonConf.toLocaleString()}</span></Td>
                          <Td right><span className="text-emerald-400 font-medium">{v.net.toLocaleString()}</span></Td>
                          <Td right>{eff !== null ? `${eff}%` : '—'}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        {/* ── quality control ── */}
        <Section icon={<FlaskConical size={15} />} title={`Quality Control — Last ${days} Days`}>
          {lr.length === 0 ? (
            <p className="text-sm text-gray-500">No lab reports submitted in this period.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-400">
                <span>{lr.length} report{lr.length > 1 ? 's' : ''}</span>
                {passedLab > 0 && <span className="text-emerald-400">{passedLab} approved</span>}
                {pendingLab > 0 && <span className="text-yellow-400">{pendingLab} pending</span>}
                {labPassRate !== null && (
                  <span className={labPassRate >= 90 ? 'text-emerald-400' : 'text-yellow-400'}>
                    {labPassRate}% parameter pass rate ({labPassCount} pass / {labFailCount} fail)
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th>Report #</Th>
                      <Th>Plant</Th>
                      <Th>Sample Date</Th>
                      <Th>Submitted By</Th>
                      <Th right>Parameters</Th>
                      <Th right>Pass</Th>
                      <Th right>Fail</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {lr.map((r: any) => {
                      const qv = r.quality_values ?? []
                      const pass = qv.filter((q: any) => q.is_within_spec === true).length
                      const fail = qv.filter((q: any) => q.is_within_spec === false).length
                      return (
                        <tr key={r.id}>
                          <Td><span className="font-medium text-white">{r.report_number}</span></Td>
                          <Td>{r.plants?.name ?? <span className="text-gray-600">—</span>}</Td>
                          <Td>{fmtDateTime(r.sample_taken_at)}</Td>
                          <Td>{r.submitter?.full_name ?? <span className="text-gray-600">—</span>}</Td>
                          <Td right>{qv.length}</Td>
                          <Td right>{pass > 0 ? <span className="text-emerald-400">{pass}</span> : '—'}</Td>
                          <Td right>{fail > 0 ? <span className="text-red-400 font-medium">{fail}</span> : '—'}</Td>
                          <Td><span className={STATUS_STYLE[r.status] ?? 'text-gray-400'}>{r.status}</span></Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        {/* ── active problems ── */}
        <Section icon={<AlertTriangle size={15} />} title="Active Problems & Issues">
          {probs.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 size={15} /> No open problems.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: 'Critical', count: critProbs, style: 'bg-red-500/20 text-red-400 border-red-500/30' },
                  { label: 'High',     count: highProbs, style: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                  { label: 'Overdue',  count: overdueProbs, style: 'bg-red-500/20 text-red-400 border-red-500/30' },
                  { label: 'Total Open', count: probs.length, style: 'bg-gray-700 text-gray-300 border-gray-600' },
                ].filter(b => b.count > 0).map(b => (
                  <span key={b.label} className={`text-xs px-2.5 py-1 rounded-full border ${b.style}`}>
                    {b.count} {b.label}
                  </span>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th>Priority</Th>
                      <Th>Title</Th>
                      <Th>Plant</Th>
                      <Th>Severity</Th>
                      <Th>Status</Th>
                      <Th>Assigned To</Th>
                      <Th>Reported</Th>
                      <Th>Due</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {probs.map((p: any) => {
                      const overdue = p.due_date && new Date(p.due_date) < new Date()
                      return (
                        <tr key={p.id}>
                          <Td>
                            {p.priority
                              ? <span className="font-bold text-white">P{p.priority}</span>
                              : <span className="text-gray-600">—</span>}
                          </Td>
                          <Td><span className="text-white">{p.title}</span></Td>
                          <Td>{p.plants?.name ?? <span className="text-gray-600">—</span>}</Td>
                          <Td>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${SEV_STYLE[p.severity] ?? ''}`}>
                              {p.severity}
                            </span>
                          </Td>
                          <Td>
                            <span className={STATUS_STYLE[p.status] ?? 'text-gray-400'}>
                              {p.status.replace('_', ' ')}
                            </span>
                          </Td>
                          <Td>{p.assignee?.full_name ?? <span className="text-gray-600">Unassigned</span>}</Td>
                          <Td><span className="text-gray-500">{timeAgo(p.reported_at)}</span></Td>
                          <Td>
                            {p.due_date
                              ? <span className={overdue ? 'text-red-400 font-medium' : 'text-gray-300'}>
                                  {overdue ? '⚠ ' : ''}{fmtDate(p.due_date)}
                                </span>
                              : <span className="text-gray-600">—</span>}
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        {/* ── fill events ── */}
        <Section icon={<Fuel size={15} />} title={`Tank Fill Events — Last ${days} Days`}>
          {!fillEvents || fillEvents.length === 0 ? (
            <p className="text-sm text-gray-500">No fill events recorded in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Tank</Th>
                    <Th>Product</Th>
                    <Th right>Volume Added</Th>
                    <Th>Tanker Ref</Th>
                    <Th>Operator</Th>
                    <Th>Time</Th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(fillEvents as any[]).map((e: any) => (
                    <tr key={e.id}>
                      <Td>
                        <span className="text-white">{e.tanks?.name}</span>
                        <span className="text-gray-600 ml-1">({e.tanks?.code})</span>
                      </Td>
                      <Td>{e.product_type ?? <span className="text-gray-600">—</span>}</Td>
                      <Td right><span className="font-medium text-emerald-400">{fmtL(e.volume_added_liters)}</span></Td>
                      <Td>{e.tanker_reference ?? <span className="text-gray-600">—</span>}</Td>
                      <Td>{e.operator?.full_name ?? <span className="text-gray-600">—</span>}</Td>
                      <Td><span className="text-gray-400">{fmtDateTime(e.started_at)}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── plants overview ── */}
        <Section icon={<Building2 size={15} />} title="Plant Directory">
          {!plants || plants.length === 0 ? (
            <p className="text-sm text-gray-500">No plants configured.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(plants as any[]).map((plant: any) => {
                const plantProblems = probs.filter((p: any) => p.plant_id === plant.id).length
                const plantReports  = lr.filter((r: any) => r.plants?.name === plant.name).length
                const plantSr       = sr.filter((r: any) => r.shifts?.plants?.name === plant.name)
                const plantNet      = plantSr.reduce((s: number, r: any) => s + (r.net_production_liters ?? 0), 0)
                return (
                  <div key={plant.id} className="bg-gray-800/60 rounded-lg p-4 print:border print:border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-white">{plant.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        plant.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-gray-700 text-gray-500 border-gray-600'
                      }`}>
                        {plant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Code: {plant.code}</p>
                    <div className="space-y-1 text-xs text-gray-400">
                      {plantNet > 0 && (
                        <div className="flex justify-between">
                          <span>Net production ({days}d)</span>
                          <span className="text-emerald-400 font-medium">{fmtL(plantNet)}</span>
                        </div>
                      )}
                      {plantReports > 0 && (
                        <div className="flex justify-between">
                          <span>Lab reports</span>
                          <span className="text-white">{plantReports}</span>
                        </div>
                      )}
                      {plantProblems > 0 && (
                        <div className="flex justify-between">
                          <span>Open problems</span>
                          <span className="text-yellow-400">{plantProblems}</span>
                        </div>
                      )}
                      {plantNet === 0 && plantReports === 0 && plantProblems === 0 && (
                        <span className="text-gray-600">No activity in period</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* ── footer ── */}
        <div className="flex items-center justify-between text-xs text-gray-600 pb-8 print:pb-0 border-t border-gray-800 pt-4 print:border-gray-300">
          <span>Worth Oil Processors — Confidential</span>
          <span>Generated {generatedAt}</span>
        </div>

      </main>

      {/* floating print button (screen only) */}
      <div className="fixed bottom-6 right-6 print:hidden">
        <PrintButton />
      </div>

      {/* print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, aside, header, .print\\:hidden { display: none !important; }
          main { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>
    </AppShell>
  )
}
