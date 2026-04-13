import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Waves, Briefcase, AlertTriangle, FlaskConical, Users } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'
import AppShell from '@/components/ui/AppShell'

const ROLE_LABELS: Record<string, string> = {
  admin:       'Administrator',
  supervisor:  'Supervisor',
  operator:    'Operator',
  tank_filler: 'Tank Filler',
  kapa:        'Kapa (Read-only)',
}

const NAV_ITEMS = [
  { href: '/tanks',    label: 'Tank Farm',       icon: Waves,        roles: ['admin','supervisor','operator','tank_filler','kapa'] },
  { href: '/jobs',     label: 'Job Board',       icon: Briefcase,    roles: ['admin','supervisor','operator'] },
  { href: '/problems', label: 'Problems',        icon: AlertTriangle,roles: ['admin','supervisor','operator','tank_filler'] },
  { href: '/reports',  label: 'Lab Reports',     icon: FlaskConical, roles: ['admin','supervisor','operator','kapa'] },
  { href: '/admin',    label: 'User Management', icon: Users,        roles: ['admin'] },
]

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

  // Fetch all stats in parallel — single round trip
  const [
    { count: openProblems },
    { count: criticalProblems },
    { data: tanks },
    { count: todayShifts },
    { count: pendingReports },
    { count: myOpenProblems },
  ] = await Promise.all([
    supabase.from('problems').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('problems').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('severity', 'critical'),
    supabase.from('tanks').select('current_level_liters, capacity_liters, min_level_percent, max_level_percent').eq('is_active', true),
    supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('shift_date', today),
    supabase.from('lab_reports').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('problems').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'open'),
  ])

  // Compute tank alerts client-side (no extra query)
  const tanksAtRisk = (tanks ?? []).filter(t => {
    if (!t.capacity_liters) return false
    const pct = (t.current_level_liters / t.capacity_liters) * 100
    return pct < t.min_level_percent || pct > t.max_level_percent
  }).length

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(profile.role))

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

  return (
    <AppShell profile={profile}>
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h2 className="text-xl font-semibold mb-1">
            Welcome, {profile.full_name.split(' ')[0]}
          </h2>
          <p className="text-gray-400 text-sm">
            {ROLE_LABELS[profile.role]} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map(stat => (
            <Link
              key={stat.label}
              href={stat.href}
              className={`border rounded-xl p-4 flex flex-col gap-1 hover:brightness-110 transition-all ${stat.color}`}
            >
              <span className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</span>
              <span className="text-xs font-medium text-white leading-tight">{stat.label}</span>
              {stat.sub && <span className="text-xs text-gray-500">{stat.sub}</span>}
            </Link>
          ))}
        </div>

        {/* Module nav */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Modules</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visibleNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="bg-gray-900 border border-gray-800 hover:border-blue-500 rounded-xl p-5 flex flex-col gap-3 transition-colors group"
              >
                <Icon size={22} className="text-blue-400 group-hover:text-blue-300" />
                <span className="font-medium text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  )
}
