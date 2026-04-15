import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'
import { Factory, ArrowLeft, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ProductionReportForm from './ProductionReportForm'

interface ProdReport {
  id: string
  report_date: string
  crude_received_liters: number | null
  crude_type: string | null
  product_produced_liters: number | null
  product_type: string | null
  olein_yield_percent: number | null
  stearin_yield_percent: number | null
  ffa_percent: number | null
  moisture_percent: number | null
  capacity_utilization: number | null
  operating_hours: number | null
  notes: string | null
  status: string
  plants: { name: string; code: string } | null
  submitter: { full_name: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-500/20 text-gray-400 border-gray-500/30',
  submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  approved:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

export default async function ProductionReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: plants }, { data: reports }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase.from('plants').select('id, name, code').eq('is_active', true).order('code'),
    supabase.from('plant_daily_reports')
      .select(`
        id, report_date, crude_received_liters, crude_type,
        product_produced_liters, product_type,
        olein_yield_percent, stearin_yield_percent,
        ffa_percent, moisture_percent, capacity_utilization,
        operating_hours, notes, status,
        plants ( name, code ),
        submitter:profiles!plant_daily_reports_submitted_by_fkey ( full_name )
      `)
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  if (!profile) redirect('/login')

  const canSubmit  = ['admin','supervisor','operator'].includes(profile.role)
  const canApprove = ['admin','supervisor'].includes(profile.role)

  const today = new Date().toISOString().split('T')[0]
  const todayReports = (reports as unknown as ProdReport[])?.filter(r => r.report_date === today) ?? []

  return (
    <AppShell profile={profile}>
      <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
        <Link href="/reports" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-lg text-white">Plant Area Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Per-plant production data — inputs, outputs, yields</p>
        </div>
        <span className="text-xs text-gray-500">{todayReports.length} filed today</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {canSubmit && <ProductionReportForm userId={user.id} plants={plants ?? []} />}

        {/* Today's snapshot */}
        {todayReports.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Today's Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayReports.map(r => (
                <TodayCard key={r.id} r={r} canApprove={canApprove} />
              ))}
            </div>
          </div>
        )}

        {/* Full history */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">History</h2>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <Factory size={36} className="mx-auto mb-2 opacity-30" />
              <p>No production reports yet.</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b border-gray-800">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Plant</th>
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-right px-4 py-3 font-medium">Crude In (L)</th>
                    <th className="text-right px-4 py-3 font-medium">Output (L)</th>
                    <th className="text-right px-4 py-3 font-medium">Util %</th>
                    <th className="text-right px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(reports as unknown as ProdReport[]).map(r => (
                    <tr key={r.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 text-gray-300">{r.report_date}</td>
                      <td className="px-4 py-3 text-gray-400">{r.plants?.code ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-300 truncate max-w-[140px]">{r.product_type ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {r.crude_received_liters != null ? r.crude_received_liters.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {r.product_produced_liters != null ? r.product_produced_liters.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {r.capacity_utilization != null ? `${r.capacity_utilization}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[r.status] ?? 'border-gray-700 text-gray-400'}`}>
                          {r.status === 'approved' ? <CheckCircle2 size={10} /> : r.status === 'submitted' ? <AlertCircle size={10} /> : <Clock size={10} />}
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function TodayCard({ r, canApprove }: { r: ProdReport; canApprove: boolean }) {
  const STATUS_STYLES: Record<string, string> = {
    draft:     'border-gray-700',
    submitted: 'border-blue-500/40 bg-blue-500/5',
    approved:  'border-emerald-500/40 bg-emerald-500/5',
  }
  return (
    <div className={`border rounded-xl p-4 ${STATUS_STYLES[r.status] ?? 'border-gray-800'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-white">{r.plants?.code} — {r.plants?.name}</span>
        <span className="text-xs text-gray-500">{r.status}</span>
      </div>
      <div className="space-y-1 text-xs text-gray-400">
        {r.product_type && <p>Product: <span className="text-white">{r.product_type}</span></p>}
        {r.crude_received_liters != null && <p>Crude in: <span className="text-white">{r.crude_received_liters.toLocaleString()} L</span></p>}
        {r.product_produced_liters != null && <p>Output: <span className="text-white">{r.product_produced_liters.toLocaleString()} L</span></p>}
        {r.olein_yield_percent != null && <p>Olein yield: <span className="text-white">{r.olein_yield_percent}%</span></p>}
        {r.stearin_yield_percent != null && <p>Stearin yield: <span className="text-white">{r.stearin_yield_percent}%</span></p>}
        {r.capacity_utilization != null && <p>Capacity: <span className="text-white">{r.capacity_utilization}%</span></p>}
        {r.submitter?.full_name && <p className="text-gray-600 mt-1">{r.submitter.full_name}</p>}
      </div>
      {r.notes && <p className="mt-2 text-xs text-gray-500 border-t border-gray-800 pt-2">{r.notes}</p>}
    </div>
  )
}
