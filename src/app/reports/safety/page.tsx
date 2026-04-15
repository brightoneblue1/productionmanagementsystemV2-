import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import SafetyReportForm from './SafetyReportForm'

interface SafetyReport {
  id: string
  report_date: string
  report_type: string
  title: string
  description: string
  severity: string | null
  workers_count: number | null
  ppe_compliant: boolean | null
  corrective_action: string | null
  status: string
  created_at: string
  plants: { name: string } | null
  submitter: { full_name: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  daily_safety: 'Daily Safety',
  incident:     'Incident',
  near_miss:    'Near Miss',
  ppe_audit:    'PPE Audit',
  inspection:   'Inspection',
}

const SEV_STYLES: Record<string, string> = {
  low:      'bg-gray-500/20 text-gray-400 border-gray-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_STYLES: Record<string, string> = {
  open:         'bg-red-500/20 text-red-400 border-red-500/30',
  under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  closed:       'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

export default async function SafetyReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: plants }, { data: reports }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase.from('plants').select('id, name, code').eq('is_active', true).order('code'),
    supabase.from('safety_reports')
      .select(`
        id, report_date, report_type, title, description, severity,
        workers_count, ppe_compliant, corrective_action, status, created_at,
        plants ( name ),
        submitter:profiles!safety_reports_submitted_by_fkey ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!profile) redirect('/login')

  const openCount = (reports as unknown as SafetyReport[])?.filter(r => r.status === 'open').length ?? 0
  const canSubmit = ['admin','supervisor','operator','tank_filler'].includes(profile.role)
  const canReview = ['admin','supervisor'].includes(profile.role)

  return (
    <AppShell profile={profile}>
      <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
        <Link href="/reports" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-lg text-white">Safety & Audit</h1>
          <p className="text-sm text-gray-400 mt-0.5">Compliance, incidents, near-misses, PPE checks</p>
        </div>
        {openCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full">
            <XCircle size={11} /> {openCount} open
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {canSubmit && <SafetyReportForm userId={user.id} plants={plants ?? []} canReview={canReview} />}

        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">All Safety Reports</h2>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <ShieldCheck size={36} className="mx-auto mb-2 opacity-30" />
              <p>No safety reports yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(reports as unknown as SafetyReport[]).map(r => (
                <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded-full">
                          {TYPE_LABELS[r.report_type] ?? r.report_type}
                        </span>
                        {r.severity && (
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${SEV_STYLES[r.severity]}`}>
                            <AlertTriangle size={10} /> {r.severity}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? 'border-gray-700 text-gray-400'}`}>
                          {r.status === 'closed' ? <CheckCircle2 size={10} /> : r.status === 'open' ? <XCircle size={10} /> : <Clock size={10} />}
                          {r.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-white">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.report_date}
                        {r.plants?.name && ` · ${r.plants.name}`}
                        {r.submitter?.full_name && ` · ${r.submitter.full_name}`}
                        {r.workers_count != null && ` · ${r.workers_count} workers`}
                        {r.ppe_compliant != null && (r.ppe_compliant ? ' · PPE ✓' : ' · PPE ✗')}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mt-2">{r.description}</p>
                  {r.corrective_action && (
                    <p className="mt-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded px-3 py-2">
                      <strong>Corrective action:</strong> {r.corrective_action}
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
