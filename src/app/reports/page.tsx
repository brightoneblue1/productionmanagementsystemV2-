import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'
import {
  Users, Wrench, ShieldCheck, FlaskConical,
  Boxes, Factory, ArrowRight, Clock, CheckCircle2,
  AlertCircle, XCircle, BarChart2,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────
function statusDot(v: number, warn = 0) {
  if (v === 0) return 'text-gray-600'
  if (v > warn) return 'text-red-400'
  return 'text-orange-400'
}

export default async function ReportsHubPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Fetch counts for each module — today only
  const [
    { count: shiftCount },
    { count: shiftPending },
    { count: equipFaults },
    { count: equipTotal },
    { count: safetyOpen },
    { count: safetyTotal },
    { count: labPending },
    { count: labTotal },
    { count: prodDraft },
    { count: prodTotal },
    { count: tankAlerts },
    { count: tankTotal },
  ] = await Promise.all([
    supabase.from('shift_reports').select('*', { count: 'exact', head: true }),
    supabase.from('shift_reports').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('equipment_reports').select('*', { count: 'exact', head: true }).eq('report_date', today).in('status', ['fault', 'offline']),
    supabase.from('equipment_reports').select('*', { count: 'exact', head: true }).eq('report_date', today),
    supabase.from('safety_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('safety_reports').select('*', { count: 'exact', head: true }),
    supabase.from('lab_reports').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('lab_reports').select('*', { count: 'exact', head: true }),
    supabase.from('plant_daily_reports').select('*', { count: 'exact', head: true }).eq('report_date', today).eq('status', 'draft'),
    supabase.from('plant_daily_reports').select('*', { count: 'exact', head: true }).eq('report_date', today),
    supabase.from('tanks').select('*', { count: 'exact', head: true })
      .or('current_level_liters.lt.alert_low_percent,current_level_liters.gt.alert_high_percent'),
    supabase.from('tanks').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const modules = [
    {
      key: 'personnel',
      label: 'Personnel & Supervision',
      desc: 'Attendance, shifts, incidents',
      icon: Users,
      href: '/jobs',
      color: 'border-blue-500/30 bg-blue-500/5',
      iconColor: 'text-blue-400',
      stat: `${shiftCount ?? 0} shift reports`,
      alert: shiftPending ? `${shiftPending} pending sign-off` : null,
      alertColor: 'text-yellow-400',
      roles: ['admin','supervisor','operator'],
    },
    {
      key: 'equipment',
      label: 'Machine & Equipment',
      desc: 'Uptime, maintenance, faults',
      icon: Wrench,
      href: '/reports/equipment',
      color: 'border-purple-500/30 bg-purple-500/5',
      iconColor: 'text-purple-400',
      stat: `${equipTotal ?? 0} logged today`,
      alert: (equipFaults ?? 0) > 0 ? `${equipFaults} fault/offline` : null,
      alertColor: 'text-red-400',
      roles: ['admin','supervisor','operator'],
    },
    {
      key: 'safety',
      label: 'Safety & Audit',
      desc: 'Compliance, incidents, PPE',
      icon: ShieldCheck,
      href: '/reports/safety',
      color: 'border-red-500/30 bg-red-500/5',
      iconColor: 'text-red-400',
      stat: `${safetyTotal ?? 0} total reports`,
      alert: (safetyOpen ?? 0) > 0 ? `${safetyOpen} open` : null,
      alertColor: 'text-red-400',
      roles: ['admin','supervisor','operator','tank_filler'],
    },
    {
      key: 'quality',
      label: 'Oil Quality & Quantity',
      desc: 'FFA, moisture, yield, volume',
      icon: FlaskConical,
      href: '/reports/quality',
      color: 'border-emerald-500/30 bg-emerald-500/5',
      iconColor: 'text-emerald-400',
      stat: `${labTotal ?? 0} lab reports`,
      alert: (labPending ?? 0) > 0 ? `${labPending} awaiting approval` : null,
      alertColor: 'text-yellow-400',
      roles: ['admin','supervisor','operator','kapa'],
    },
    {
      key: 'inventory',
      label: 'Stock & Inventory',
      desc: 'Inputs, outputs, tank levels',
      icon: Boxes,
      href: '/tanks',
      color: 'border-orange-500/30 bg-orange-500/5',
      iconColor: 'text-orange-400',
      stat: `${tankTotal ?? 0} active tanks`,
      alert: (tankAlerts ?? 0) > 0 ? `${tankAlerts} level alerts` : null,
      alertColor: 'text-orange-400',
      roles: ['admin','supervisor','operator','tank_filler','kapa'],
    },
    {
      key: 'production',
      label: 'Plant Area Reports',
      desc: 'Per-plant production data',
      icon: Factory,
      href: '/reports/production',
      color: 'border-yellow-500/30 bg-yellow-500/5',
      iconColor: 'text-yellow-400',
      stat: `${prodTotal ?? 0} filed today`,
      alert: (prodDraft ?? 0) > 0 ? `${prodDraft} drafts` : null,
      alertColor: 'text-gray-400',
      roles: ['admin','supervisor','operator'],
    },
  ].filter(m => m.roles.includes(profile.role))

  // Recent activity across all report types
  const [
    { data: recentShifts },
    { data: recentEquip },
    { data: recentSafety },
    { data: recentLab },
    { data: recentProd },
  ] = await Promise.all([
    supabase.from('shift_reports').select('id, status, created_at, shifts!inner(shift_date, shift_type)').order('created_at', { ascending: false }).limit(3),
    supabase.from('equipment_reports').select('id, equipment_name, status, report_date').order('created_at', { ascending: false }).limit(3),
    supabase.from('safety_reports').select('id, title, report_type, status, created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('lab_reports').select('id, report_number, status, created_at').order('created_at', { ascending: false }).limit(3),
    supabase.from('plant_daily_reports').select('id, report_date, product_type, status, plants(name)').order('created_at', { ascending: false }).limit(3),
  ])

  return (
    <AppShell profile={profile}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-white">Reports</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Link href="/reports/analytics" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-2 transition-colors">
            <BarChart2 size={13} /> Analytics
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Module grid */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Report Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(m => (
              <Link
                key={m.key}
                href={m.href}
                className={`group border rounded-xl p-5 transition-all hover:border-gray-600 ${m.color}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gray-800/80 ${m.iconColor}`}>
                    <m.icon size={18} />
                  </div>
                  <ArrowRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors mt-1" />
                </div>
                <p className="font-semibold text-sm text-white mb-0.5">{m.label}</p>
                <p className="text-xs text-gray-500 mb-3">{m.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{m.stat}</span>
                  {m.alert && (
                    <span className={`text-xs font-medium ${m.alertColor}`}>{m.alert}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Recent Activity</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">

            {recentLab?.map(r => (
              <ActivityRow
                key={'lab-'+r.id}
                icon={<FlaskConical size={13} className="text-emerald-400" />}
                label={`Lab Report ${(r as unknown as {report_number:string}).report_number}`}
                meta="Oil Quality"
                status={(r as unknown as {status:string}).status}
                time={(r as unknown as {created_at:string}).created_at}
                href={`/reports/${r.id}`}
              />
            ))}

            {recentEquip?.map(r => (
              <ActivityRow
                key={'eq-'+r.id}
                icon={<Wrench size={13} className="text-purple-400" />}
                label={`${(r as unknown as {equipment_name:string}).equipment_name}`}
                meta="Equipment"
                status={(r as unknown as {status:string}).status}
                time={(r as unknown as {report_date:string}).report_date}
                href="/reports/equipment"
              />
            ))}

            {recentSafety?.map(r => (
              <ActivityRow
                key={'sf-'+r.id}
                icon={<ShieldCheck size={13} className="text-red-400" />}
                label={`${(r as unknown as {title:string}).title}`}
                meta="Safety"
                status={(r as unknown as {status:string}).status}
                time={(r as unknown as {created_at:string}).created_at}
                href="/reports/safety"
              />
            ))}

            {recentProd?.map(r => (
              <ActivityRow
                key={'pd-'+r.id}
                icon={<Factory size={13} className="text-yellow-400" />}
                label={`${(r as unknown as {product_type:string|null}).product_type ?? 'Production'} — ${(r as unknown as {plants:{name:string}|null}).plants?.name ?? ''}`}
                meta="Production"
                status={(r as unknown as {status:string}).status}
                time={(r as unknown as {report_date:string}).report_date}
                href="/reports/production"
              />
            ))}

            {[...( recentLab ?? []), ...(recentEquip ?? []), ...(recentSafety ?? []), ...(recentProd ?? [])].length === 0 && (
              <div className="px-5 py-8 text-center text-gray-600 text-sm">No reports submitted yet.</div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  )
}

function ActivityRow({
  icon, label, meta, status, time, href,
}: {
  icon: React.ReactNode; label: string; meta: string
  status: string; time: string; href: string
}) {
  const statusStyle: Record<string, string> = {
    operational: 'text-emerald-400', signed_off: 'text-emerald-400', approved: 'text-emerald-400', closed: 'text-emerald-400',
    submitted: 'text-blue-400', under_review: 'text-blue-400',
    draft: 'text-gray-500',
    fault: 'text-red-400', offline: 'text-red-400', open: 'text-red-400',
    degraded: 'text-orange-400', maintenance: 'text-yellow-400',
  }
  const StatusIcon = ['operational','signed_off','approved','closed'].includes(status)
    ? CheckCircle2
    : ['fault','offline','open'].includes(status)
      ? XCircle
      : AlertCircle

  return (
    <Link href={href} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-800/50 transition-colors">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{label}</p>
        <p className="text-xs text-gray-500">{meta} · {time.split('T')[0]}</p>
      </div>
      <span className={`flex items-center gap-1 text-xs shrink-0 ${statusStyle[status] ?? 'text-gray-400'}`}>
        <StatusIcon size={11} /> {status}
      </span>
    </Link>
  )
}
