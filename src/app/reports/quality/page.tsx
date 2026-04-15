import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlaskConical, CheckCircle2, XCircle, Clock, AlertCircle, Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import NewReportForm from './NewReportForm'
import ReportActions from './ReportActions'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'

interface QualityValue {
  id: string
  parameter_name: string
  value: number
  unit: string
  min_spec: number | null
  max_spec: number | null
  is_within_spec: boolean | null
}

interface LabReport {
  id: string
  report_number: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  sample_taken_at: string
  notes: string | null
  plants: { name: string } | null
  submitter: { full_name: string } | null
  quality_values: QualityValue[]
}

const STATUS_STYLES = {
  draft:     'bg-gray-500/20 text-gray-400 border-gray-500/30',
  submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  approved:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected:  'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_ICON = {
  draft:     <Clock size={11} />,
  submitted: <AlertCircle size={11} />,
  approved:  <CheckCircle2 size={11} />,
  rejected:  <XCircle size={11} />,
}

function formatDateTime(str: string) {
  return new Date(str).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: reports }, { data: plants }, { data: profile }] = await Promise.all([
    supabase
      .from('lab_reports')
      .select(`
        id, report_number, status, sample_taken_at, notes,
        plants ( name ),
        submitter:profiles!lab_reports_submitted_by_fkey ( full_name ),
        quality_values ( id, parameter_name, value, unit, min_spec, max_spec, is_within_spec )
      `)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('plants').select('id, name').eq('is_active', true),
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
  ])

  if (!profile) redirect('/login')
  const canSubmit  = ['admin', 'supervisor', 'operator'].includes(profile.role)
  const canApprove = ['admin', 'supervisor'].includes(profile.role)

  return (
    <AppShell profile={profile as unknown as Profile}>
      <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
        <Link href="/reports" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-bold text-lg text-white">Oil Quality</h1>
          <p className="text-sm text-gray-400 mt-0.5">Lab reports, quality analysis and batch testing</p>
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {canSubmit && <NewReportForm userId={user.id} plants={plants ?? []} />}

        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Recent Reports</h2>

          {!reports || reports.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <FlaskConical size={36} className="mx-auto mb-2 opacity-30" />
              <p>No lab reports submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(reports as unknown as LabReport[]).map(report => {
                const failCount = report.quality_values.filter(q => q.is_within_spec === false).length
                const passCount = report.quality_values.filter(q => q.is_within_spec === true).length

                return (
                  <div key={report.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    {/* Report header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{report.report_number}</span>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[report.status]}`}>
                            {STATUS_ICON[report.status]}
                            {report.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Sample: {formatDateTime(report.sample_taken_at)}
                          {report.plants?.name && ` · ${report.plants.name}`}
                          {report.submitter?.full_name && ` · ${report.submitter.full_name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/reports/${report.id}`}
                          target="_blank"
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                          title="Print / Export PDF"
                        >
                          <Printer size={13} /> Export
                        </Link>
                        {report.quality_values.length > 0 && (
                          <div className="flex gap-2 text-xs">
                            {passCount > 0 && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 size={12} /> {passCount} pass
                              </span>
                            )}
                            {failCount > 0 && (
                              <span className="flex items-center gap-1 text-red-400">
                                <XCircle size={12} /> {failCount} fail
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quality values table */}
                    {report.quality_values.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-gray-800">
                              <th className="text-left pb-2 font-medium">Parameter</th>
                              <th className="text-right pb-2 font-medium">Value</th>
                              <th className="text-right pb-2 font-medium">Unit</th>
                              <th className="text-right pb-2 font-medium">Spec</th>
                              <th className="text-right pb-2 font-medium">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {report.quality_values.map(q => (
                              <tr key={q.id}>
                                <td className="py-2 text-gray-300">{q.parameter_name}</td>
                                <td className="py-2 text-right text-white font-medium">{q.value}</td>
                                <td className="py-2 text-right text-gray-400">{q.unit}</td>
                                <td className="py-2 text-right text-gray-500">
                                  {q.min_spec !== null || q.max_spec !== null
                                    ? `${q.min_spec ?? '–'} – ${q.max_spec ?? '–'}`
                                    : '—'}
                                </td>
                                <td className="py-2 text-right">
                                  {q.is_within_spec === null ? (
                                    <span className="text-gray-500">—</span>
                                  ) : q.is_within_spec ? (
                                    <span className="text-emerald-400 flex items-center gap-1 justify-end">
                                      <CheckCircle2 size={12} /> Pass
                                    </span>
                                  ) : (
                                    <span className="text-red-400 flex items-center gap-1 justify-end">
                                      <XCircle size={12} /> Fail
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {report.notes && (
                      <p className="mt-3 text-xs text-gray-500 border-t border-gray-800 pt-3">{report.notes}</p>
                    )}

                    <ReportActions
                      reportId={report.id}
                      currentStatus={report.status}
                      canApprove={canApprove}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
