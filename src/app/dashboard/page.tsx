import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Profile } from '@/types'
import AppShell from '@/components/ui/AppShell'
import LiveStats from './LiveStats'
import TrendGraph from './TrendGraph'
import type { TrendDay } from './TrendGraph'


export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold mb-2">Profile not set up</h2>
          <p className="text-gray-400 text-sm mb-4">
            Your account exists but has no profile record.<br />
            Run this in Supabase SQL Editor:
          </p>
          <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-left text-xs text-green-400 whitespace-pre-wrap">
{`insert into profiles (id, full_name, role)
values (
  '${user.id}',
  '${user.email}',
  'admin'
);`}
          </pre>
          <p className="text-gray-500 text-xs mt-4">Then refresh this page.</p>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch all stats in parallel — single round trip
  const [
    { count: openProblems },
    { count: criticalProblems },
    { data: tanks },
    { count: todayShifts },
    { count: pendingReports },
    { count: myOpenProblems },
    { data: shiftReports },
  ] = await Promise.all([
    supabase.from('problems').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('problems').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('severity', 'critical'),
    supabase.from('tanks').select('current_level_liters, capacity_liters, min_level_percent, max_level_percent').eq('is_active', true),
    supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('shift_date', today),
    supabase.from('lab_reports').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('problems').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'open'),
    supabase
      .from('shift_reports')
      .select('total_produced_liters, spillage_liters, non_conforming_liters, net_production_liters, shifts!inner(shift_date)')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
  ])

  // Compute tank alerts client-side (no extra query)
  const tanksAtRisk = (tanks ?? []).filter(t => {
    if (!t.capacity_liters) return false
    const pct = (t.current_level_liters / t.capacity_liters) * 100
    return pct < t.min_level_percent || pct > t.max_level_percent
  }).length


  const stats = [
    {
      label: 'Open Problems',
      value: openProblems ?? 0,
      sub: criticalProblems ? `${criticalProblems} critical` : null,
      href: '/problems',
      color: (openProblems ?? 0) > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-gray-800',
      valueColor: (openProblems ?? 0) > 0 ? 'text-red-400' : 'text-white',
      roles: ['admin','supervisor','operator','tank_filler'],
    },
    {
      label: 'Tanks at Risk',
      value: tanksAtRisk,
      sub: tanksAtRisk > 0 ? 'outside safe range' : 'all within range',
      href: '/tanks',
      color: tanksAtRisk > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-gray-800',
      valueColor: tanksAtRisk > 0 ? 'text-orange-400' : 'text-white',
      roles: ['admin','supervisor','operator','tank_filler','kapa'],
    },
    {
      label: "Today's Shifts",
      value: todayShifts ?? 0,
      sub: todayShifts ? 'scheduled today' : 'none scheduled',
      href: '/jobs',
      color: 'border-gray-800',
      valueColor: 'text-white',
      roles: ['admin','supervisor','operator'],
    },
    {
      label: 'Pending Reports',
      value: pendingReports ?? 0,
      sub: pendingReports ? 'awaiting approval' : 'none pending',
      href: '/reports',
      color: (pendingReports ?? 0) > 0 ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-gray-800',
      valueColor: (pendingReports ?? 0) > 0 ? 'text-yellow-400' : 'text-white',
      roles: ['admin','supervisor'],
    },
    {
      label: 'Assigned to Me',
      value: myOpenProblems ?? 0,
      sub: myOpenProblems ? 'open problems' : 'nothing assigned',
      href: '/problems',
      color: (myOpenProblems ?? 0) > 0 ? 'border-blue-500/40 bg-blue-500/5' : 'border-gray-800',
      valueColor: (myOpenProblems ?? 0) > 0 ? 'text-blue-400' : 'text-white',
      roles: ['admin','supervisor','operator','tank_filler'],
    },
  ].filter(s => s.roles.includes(profile.role))

  // Aggregate shift reports by date for trend graph
  const dayMap = new Map<string, { gross: number; spillage: number; nonConforming: number; net: number }>()
  for (const r of (shiftReports ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const date: string = (r as any).shifts?.shift_date ?? ''
    if (!date) continue
    const existing = dayMap.get(date) ?? { gross: 0, spillage: 0, nonConforming: 0, net: 0 }
    dayMap.set(date, {
      gross:         existing.gross         + (r.total_produced_liters    ?? 0),
      spillage:      existing.spillage      + (r.spillage_liters          ?? 0),
      nonConforming: existing.nonConforming + (r.non_conforming_liters    ?? 0),
      net:           existing.net           + (r.net_production_liters    ?? 0),
    })
  }
  const trendData: TrendDay[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      ...vals,
    }))

  return (
    <AppShell profile={profile}>
      {/* Page title bar */}
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="font-bold text-lg text-white">Monitoring</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Real-time operations dashboard · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats row — live via Supabase Realtime */}
        <LiveStats initial={stats} />

        {/* Production trend graph */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="font-semibold text-sm text-white mb-0.5">Production Trend — Last 14 Days</p>
          <p className="text-xs text-gray-500 mb-4">Gross vs net output with spillage and non-conforming losses</p>
          <TrendGraph data={trendData} />
        </div>

        {/* Quick info panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="font-semibold text-sm text-white mb-1">Personnel on Shift Today</p>
            <p className="text-xs text-gray-500">Active shift assignments for today</p>
            <Link href="/jobs" className="mt-3 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
              View Job Board →
            </Link>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="font-semibold text-sm text-white mb-1">Attention Required</p>
            <p className="text-xs text-gray-500">
              {(openProblems ?? 0) > 0
                ? `${openProblems} open problem${(openProblems ?? 0) > 1 ? 's' : ''} need attention`
                : 'No critical issues at this time'}
            </p>
            <Link href="/problems" className="mt-3 inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300">
              View Problems →
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
