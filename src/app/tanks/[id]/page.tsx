import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ChevronLeft, Droplets, Zap, AlertTriangle,
  CheckCircle2, Activity, Fuel, ShowerHead, ArrowLeftRight,
} from 'lucide-react'
import AppShell from '@/components/ui/AppShell'
import TankLevelChart from './TankLevelChart'
import FlowConnections from './FlowConnections'
import CleaningPanel from './CleaningPanel'
import type { Profile } from '@/types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function pct(current: number, capacity: number) {
  if (!capacity) return 0
  return Math.min(100, Math.round((current / capacity) * 100))
}

type TankStatus = 'critical' | 'low' | 'almost_empty' | 'normal' | 'almost_full' | 'high'

function getStatus(t: {
  current_level_liters: number; capacity_liters: number
  min_level_percent: number; max_level_percent: number
  alert_low_percent: number; alert_high_percent: number
}): TankStatus {
  const p = pct(t.current_level_liters, t.capacity_liters)
  if (p <= 5)                          return 'critical'
  if (p < t.min_level_percent)         return 'low'
  if (p > t.max_level_percent)         return 'high'
  if (p < (t.alert_low_percent ?? 25)) return 'almost_empty'
  if (p > (t.alert_high_percent ?? 80)) return 'almost_full'
  return 'normal'
}

const STATUS_STYLE: Record<TankStatus, { bar: string; badge: string; label: string }> = {
  critical:    { bar: 'bg-red-500',     badge: 'bg-red-500/20 text-red-400 border-red-500/30',         label: 'Critical'     },
  low:         { bar: 'bg-orange-400',  badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Low'          },
  almost_empty:{ bar: 'bg-yellow-500',  badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Almost Empty' },
  normal:      { bar: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Normal'    },
  almost_full: { bar: 'bg-sky-400',     badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',          label: 'Almost Full'  },
  high:        { bar: 'bg-blue-500',    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',        label: 'High'         },
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-800">
        <span className="text-gray-400">{icon}</span>
        <h2 className="font-semibold text-sm text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function TankDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')

  const [
    { data: tank },
    { data: readings },
    { data: fillEvents },
    { data: connections },
    { data: cleaningSchedule },
    { data: cleaningLogs },
    { data: allTanks },
    { data: allPlants },
  ] = await Promise.all([
    supabase.from('tanks').select(`
      *, tank_farms (name, code),
      assigned_filler:profiles!tanks_assigned_filler_id_fkey (full_name)
    `).eq('id', id).single(),

    supabase.from('tank_readings')
      .select('level_liters, created_at, reader:profiles!tank_readings_recorded_by_fkey(full_name)')
      .eq('tank_id', id)
      .order('created_at', { ascending: false })
      .limit(90),

    supabase.from('tank_fill_events')
      .select('id, volume_added_liters, product_type, tanker_reference, started_at, operator:profiles!tank_fill_events_operator_id_fkey(full_name)')
      .eq('tank_id', id)
      .order('started_at', { ascending: false })
      .limit(30),

    supabase.from('tank_connections')
      .select(`
        id, direction, connection_type, pump_name, flow_rate_lph, notes,
        connected_tank:tanks!tank_connections_connected_tank_id_fkey (name, code, product_type),
        connected_plant:plants!tank_connections_connected_plant_id_fkey (name, code)
      `)
      .eq('tank_id', id)
      .eq('is_active', true),

    supabase.from('tank_cleaning_schedules')
      .select('*')
      .eq('tank_id', id)
      .eq('is_active', true)
      .maybeSingle(),

    supabase.from('tank_cleaning_logs')
      .select('id, cleaned_at, duration_hours, observations, procedure_notes, cleaner:profiles!tank_cleaning_logs_cleaned_by_fkey(full_name)')
      .eq('tank_id', id)
      .order('cleaned_at', { ascending: false })
      .limit(20),

    supabase.from('tanks').select('id, name, code').eq('is_active', true),
    supabase.from('plants').select('id, name, code').eq('is_active', true),
  ])

  if (!tank) notFound()

  const canManage = ['admin', 'supervisor'].includes(profile.role)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tank as any
  const levelPct = pct(t.current_level_liters, t.capacity_liters)
  const status   = getStatus(t)
  const styles   = STATUS_STYLE[status]

  const effectiveRate = (t.pump_flow_rate_lph ?? 0) * (t.pump_speed_factor ?? 1)
  let etaLabel: string | null = null
  if (effectiveRate > 0) {
    const remaining = t.capacity_liters - t.current_level_liters
    if (remaining > 0) {
      const mins = Math.round((remaining / effectiveRate) * 60)
      const h = Math.floor(mins / 60); const m = mins % 60
      etaLabel = h > 0 ? `${h}h ${m}m to full` : `${m}m to full`
    } else {
      etaLabel = 'Tank full'
    }
  }

  // Readings adapted for chart (use created_at as read_at)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartReadings = (readings ?? []).map((r: any) => ({
    read_at: r.created_at,
    reading_liters: r.level_liters,
  }))

  return (
    <AppShell profile={profile}>
      {/* ── breadcrumb ── */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/tanks" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={14} /> Tank Farms
          </Link>
          <span className="text-gray-700">/</span>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <span className="text-xs text-gray-400">{(t.tank_farms as any)?.name}</span>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-white font-medium">{t.name}</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${styles.badge}`}>
          {styles.label}
        </span>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* ── hero ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl font-bold text-white">{t.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {t.code}
                {t.product_type && ` · ${t.product_type}`}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(t.tank_farms as any)?.name && ` · ${(t.tank_farms as any).name} (${(t.tank_farms as any).code})`}
              </p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(t.assigned_filler as any)?.full_name && (
                <p className="text-xs text-gray-500 mt-1">Assigned: {(t.assigned_filler as any).full_name}</p>
              )}
            </div>
          </div>

          {/* Level bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-white">{levelPct}%</span>
              <span className="text-gray-300">{t.current_level_liters.toLocaleString()} L / {t.capacity_liters.toLocaleString()} L</span>
            </div>
            <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${styles.bar}`} style={{ width: `${levelPct}%` }} />
              {t.alert_low_percent > 0 && (
                <div className="absolute top-0 h-full w-0.5 bg-yellow-500/60" style={{ left: `${t.alert_low_percent}%` }} />
              )}
              {t.alert_high_percent < 100 && (
                <div className="absolute top-0 h-full w-0.5 bg-sky-500/60" style={{ left: `${t.alert_high_percent}%` }} />
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0</span>
              <span className="text-yellow-600">▲ {t.alert_low_percent}%</span>
              <span className="text-gray-500">Min {t.min_level_percent}% · Max {t.max_level_percent}%</span>
              <span className="text-sky-600">▲ {t.alert_high_percent}%</span>
              <span>{t.capacity_liters.toLocaleString()} L</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500">Remaining Space</p>
              <p className="text-base font-bold text-white">
                {(t.capacity_liters - t.current_level_liters).toLocaleString()} L
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500">Pump Speed</p>
              <p className={`text-base font-bold flex items-center gap-1 ${t.pump_speed_factor > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                <Zap size={14} />{Math.round((t.pump_speed_factor ?? 0) * 100)}%
                {t.pump_flow_rate_lph > 0 && <span className="text-xs text-gray-500 font-normal ml-1">{effectiveRate.toLocaleString()} L/hr</span>}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500">ETA to Full</p>
              <p className={`text-base font-bold ${etaLabel ? 'text-emerald-400' : 'text-gray-500'}`}>
                {etaLabel ?? '—'}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500">Fill Events (total)</p>
              <p className="text-base font-bold text-white">{fillEvents?.length ?? 0}</p>
            </div>
          </div>
        </div>

        {/* ── flow & connections ── */}
        <Section icon={<ArrowLeftRight size={15} />} title="Flow & Connections">
          <FlowConnections
            tankId={id}
            tankName={t.name}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            connections={(connections ?? []) as any}
            allTanks={(allTanks ?? []) as { id: string; name: string; code: string }[]}
            allPlants={(allPlants ?? []) as { id: string; name: string; code: string }[]}
            canManage={canManage}
          />
        </Section>

        {/* ── level history ── */}
        <Section icon={<Activity size={15} />} title="Level History">
          <TankLevelChart
            readings={chartReadings}
            capacity={t.capacity_liters}
            minLevelPercent={t.min_level_percent}
            maxLevelPercent={t.max_level_percent}
          />
        </Section>

        {/* ── fill events ── */}
        <Section icon={<Fuel size={15} />} title="Fill History">
          {!fillEvents || fillEvents.length === 0 ? (
            <p className="text-sm text-gray-500">No fill events recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-medium">
                    <th className="text-left pb-2">Date & Time</th>
                    <th className="text-right pb-2">Volume Added</th>
                    <th className="text-left pb-2 pl-4">Product</th>
                    <th className="text-left pb-2">Tanker Ref</th>
                    <th className="text-left pb-2">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(fillEvents as any[]).map(e => (
                    <tr key={e.id}>
                      <td className="py-2.5 text-gray-300">{fmtDateTime(e.started_at)}</td>
                      <td className="py-2.5 text-right font-medium text-emerald-400">
                        +{e.volume_added_liters.toLocaleString()} L
                      </td>
                      <td className="py-2.5 pl-4 text-gray-400">{e.product_type ?? '—'}</td>
                      <td className="py-2.5 text-gray-400">{e.tanker_reference ?? '—'}</td>
                      <td className="py-2.5 text-gray-400">{e.operator?.full_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── reading history ── */}
        {readings && readings.length > 0 && (
          <Section icon={<Droplets size={15} />} title="Reading History">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-medium">
                    <th className="text-left pb-2">Date & Time</th>
                    <th className="text-right pb-2">Reading</th>
                    <th className="text-right pb-2">Level</th>
                    <th className="text-left pb-2 pl-4">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(readings as any[]).slice(0, 20).map((r, i) => (
                    <tr key={i}>
                      <td className="py-2.5 text-gray-300">{fmtDateTime(r.created_at)}</td>
                      <td className="py-2.5 text-right font-medium text-white font-mono">
                        {r.level_liters.toLocaleString()} L
                      </td>
                      <td className="py-2.5 text-right text-gray-400">
                        {t.capacity_liters ? `${pct(r.level_liters, t.capacity_liters)}%` : '—'}
                      </td>
                      <td className="py-2.5 pl-4 text-gray-400">{r.reader?.full_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ── cleaning ── */}
        <Section icon={<ShowerHead size={15} />} title="Cleaning Schedule & Maintenance">
          <CleaningPanel
            tankId={id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            schedule={(cleaningSchedule as any) ?? null}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logs={(cleaningLogs ?? []) as any}
            canManage={canManage}
          />
        </Section>

        {/* ── alerts summary ── */}
        {(status === 'critical' || status === 'low' || status === 'almost_empty') && (
          <div className={`flex items-start gap-3 rounded-xl p-4 border ${
            status === 'critical'
              ? 'bg-red-500/10 border-red-500/30'
              : status === 'low'
              ? 'bg-orange-500/10 border-orange-500/30'
              : 'bg-yellow-500/10 border-yellow-500/20'
          }`}>
            <AlertTriangle size={16} className={
              status === 'critical' ? 'text-red-400' : status === 'low' ? 'text-orange-400' : 'text-yellow-400'
            } />
            <div className="text-sm">
              <p className={`font-medium ${
                status === 'critical' ? 'text-red-400' : status === 'low' ? 'text-orange-400' : 'text-yellow-400'
              }`}>
                {status === 'critical' ? 'Critical Level — Immediate Fill Required' :
                 status === 'low'      ? 'Below Minimum — Schedule Fill' :
                                         'Approaching Minimum — Plan Fill Soon'}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                Current level: {levelPct}% ({t.current_level_liters.toLocaleString()} L) ·
                Minimum: {t.min_level_percent}% ({Math.round(t.capacity_liters * t.min_level_percent / 100).toLocaleString()} L)
              </p>
            </div>
          </div>
        )}

        {status === 'high' || status === 'almost_full' ? (
          <div className={`flex items-start gap-3 rounded-xl p-4 border ${
            status === 'high' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-sky-500/10 border-sky-500/20'
          }`}>
            <CheckCircle2 size={16} className={status === 'high' ? 'text-blue-400' : 'text-sky-400'} />
            <div className="text-sm">
              <p className={`font-medium ${status === 'high' ? 'text-blue-400' : 'text-sky-400'}`}>
                {status === 'high' ? 'Above Maximum — Stop Fill' : 'Approaching Capacity — Monitor Fill'}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                Current: {levelPct}% · Maximum: {t.max_level_percent}%
              </p>
            </div>
          </div>
        ) : null}

      </main>
    </AppShell>
  )
}
