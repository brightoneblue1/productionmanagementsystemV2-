import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'
import { Wrench, CheckCircle2, AlertTriangle, XCircle, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import EquipmentReportForm from './EquipmentReportForm'

interface EquipReport {
  id: string
  report_date: string
  equipment_name: string
  equipment_type: string
  status: string
  uptime_hours: number | null
  downtime_hours: number | null
  fault_description: string | null
  action_taken: string | null
  plants: { name: string } | null
  reporter: { full_name: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  operational: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  degraded:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  fault:       'bg-red-500/20 text-red-400 border-red-500/30',
  offline:     'bg-red-500/20 text-red-400 border-red-500/30',
  maintenance: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  operational: <CheckCircle2 size={11} />,
  degraded:    <AlertTriangle size={11} />,
  fault:       <XCircle size={11} />,
  offline:     <XCircle size={11} />,
  maintenance: <Clock size={11} />,
}

export default async function EquipmentReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: plants }, { data: reports }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase.from('plants').select('id, name, code').eq('is_active', true).order('code'),
    supabase.from('equipment_reports')
      .select(`
        id, report_date, equipment_name, equipment_type, status,
        uptime_hours, downtime_hours, fault_description, action_taken,
        plants ( name ),
        reporter:profiles!equipment_reports_reported_by_fkey ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  if (!profile) redirect('/login')

  const canSubmit = ['admin', 'supervisor', 'operator'].includes(profile.role)

  const today = new Date().toISOString().split('T')[0]
  const todayReports = (reports as unknown as EquipReport[])?.filter(r => r.report_date === today) ?? []
  const faultCount   = todayReports.filter(r => ['fault','offline'].includes(r.status)).length

  return (
    <AppShell profile={profile}>
      <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
        <Link href="/reports" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-lg text-white">Machine & Equipment</h1>
          <p className="text-sm text-gray-400 mt-0.5">Uptime, maintenance logs, fault reports</p>
        </div>
        {faultCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full">
            <XCircle size={11} /> {faultCount} fault today
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {canSubmit && <EquipmentReportForm userId={user.id} plants={plants ?? []} />}

        {/* Summary strip — today */}
        {todayReports.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['operational','maintenance','degraded','fault','offline'] as const).map(s => {
              const n = todayReports.filter(r => r.status === s).length
              return (
                <div key={s} className={`rounded-lg border px-3 py-2 text-center ${n > 0 ? STATUS_STYLES[s] : 'border-gray-800 bg-gray-900'}`}>
                  <p className="text-lg font-bold">{n}</p>
                  <p className="text-xs capitalize opacity-80">{s}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Report list */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">All Reports</h2>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <Wrench size={36} className="mx-auto mb-2 opacity-30" />
              <p>No equipment reports yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(reports as unknown as EquipReport[]).map(r => (
                <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-white">{r.equipment_name}</span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? 'border-gray-700 text-gray-400'}`}>
                          {STATUS_ICON[r.status]} {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {r.equipment_type}
                        {r.plants?.name && ` · ${r.plants.name}`}
                        {` · ${r.report_date}`}
                        {r.reporter?.full_name && ` · ${r.reporter.full_name}`}
                      </p>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 shrink-0">
                      {r.uptime_hours != null && <span>{r.uptime_hours}h up</span>}
                      {r.downtime_hours != null && <span className="text-red-400">{r.downtime_hours}h down</span>}
                    </div>
                  </div>
                  {r.fault_description && (
                    <p className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                      <strong>Fault:</strong> {r.fault_description}
                    </p>
                  )}
                  {r.action_taken && (
                    <p className="mt-2 text-xs text-gray-400 border-t border-gray-800 pt-2">
                      <strong>Action:</strong> {r.action_taken}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
