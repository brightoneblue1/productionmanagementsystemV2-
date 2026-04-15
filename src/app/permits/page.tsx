import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'
import { FileText, Clock, CheckCircle2, ShieldCheck, XCircle, AlertTriangle, MinusCircle } from 'lucide-react'
import Link from 'next/link'
import NewPermitForm from './NewPermitForm'
import PermitActions from './PermitActions'
import PermitFilters from './PermitFilters'

interface WorkPermit {
  id: string
  permit_number: string
  permit_type: string
  title: string
  work_description: string
  location: string | null
  hazards: string | null
  precautions: string | null
  ppe_required: string[] | null
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'expired' | 'closed'
  valid_from: string | null
  valid_until: string | null
  rejection_reason: string | null
  created_at: string
  plants: { name: string; code: string } | null
  requester: { full_name: string } | null
  approver:  { full_name: string } | null
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; card: string; badge: string }> = {
  pending:  { label: 'Pending',  icon: <Clock size={16} className="text-amber-400" />,    card: 'border-amber-500/30 bg-amber-500/5',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  approved: { label: 'Approved', icon: <CheckCircle2 size={16} className="text-emerald-400" />, card: 'border-emerald-500/30 bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  active:   { label: 'Active',   icon: <ShieldCheck size={16} className="text-blue-400" />,  card: 'border-blue-500/30 bg-blue-500/5',     badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  rejected: { label: 'Rejected', icon: <XCircle size={16} className="text-red-400" />,       card: 'border-red-500/30 bg-red-500/5',       badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
  expired:  { label: 'Expired',  icon: <AlertTriangle size={16} className="text-gray-500" />, card: 'border-gray-700',                      badge: 'bg-gray-700/60 text-gray-400 border-gray-600' },
  closed:   { label: 'Closed',   icon: <MinusCircle size={16} className="text-gray-500" />,   card: 'border-gray-700',                      badge: 'bg-gray-700/60 text-gray-400 border-gray-600' },
}

const TYPE_LABELS: Record<string, string> = {
  hot_work:       'Hot Work',
  cold_work:      'Cold Work',
  confined_space: 'Confined Space',
  electrical:     'Electrical',
  height:         'Working at Height',
  chemical:       'Chemical Handling',
  general:        'General',
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function PermitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>
}) {
  const { status: filterStatus, type: filterType, q } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: plants }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase.from('plants').select('id, name, code').eq('is_active', true).order('code'),
  ])
  if (!profile) redirect('/login')

  // Fetch all permits (client will filter by search query; server filters by status/type)
  let query = supabase
    .from('work_permits')
    .select(`
      id, permit_number, permit_type, title, work_description,
      location, hazards, precautions, ppe_required,
      status, valid_from, valid_until, rejection_reason, created_at,
      plants ( name, code ),
      requester:profiles!work_permits_requested_by_fkey ( full_name ),
      approver:profiles!work_permits_approved_by_fkey  ( full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filterStatus) query = query.eq('status', filterStatus)
  if (filterType)   query = query.eq('permit_type', filterType)

  const { data: permits } = await query

  const all = (permits as unknown as WorkPermit[]) ?? []

  // Apply text search
  const filtered = q
    ? all.filter(p =>
        p.permit_number.toLowerCase().includes(q.toLowerCase()) ||
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.location?.toLowerCase().includes(q.toLowerCase()) ||
        p.requester?.full_name.toLowerCase().includes(q.toLowerCase())
      )
    : all

  // Count by status (always from full unfiltered set for the stat cards)
  const { data: allForCount } = await supabase.from('work_permits').select('status')
  const counts: Record<string, number> = {}
  for (const s of Object.keys(STATUS_META)) counts[s] = 0
  for (const row of (allForCount ?? [])) counts[row.status] = (counts[row.status] ?? 0) + 1

  const canApprove = ['admin', 'supervisor'].includes(profile.role)
  const canCreate  = ['admin', 'supervisor', 'operator'].includes(profile.role)

  return (
    <AppShell profile={profile}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-lg text-white flex items-center gap-2">
            <FileText size={18} className="text-orange-400" /> Work Permits
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Work permits and HSE compliance</p>
        </div>
        {canCreate && <NewPermitForm userId={user.id} plants={plants ?? []} />}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* Status summary cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Object.entries(STATUS_META).map(([status, meta]) => (
            <Link key={status}
              href={filterStatus === status ? '/permits' : `/permits?status=${status}`}
              className={`rounded-xl border p-4 transition-all hover:opacity-90 ${
                filterStatus === status ? meta.card : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium">{meta.label}</span>
                {meta.icon}
              </div>
              <p className={`text-2xl font-bold font-mono ${filterStatus === status ? '' : 'text-white'}`}>
                {counts[status] ?? 0}
              </p>
            </Link>
          ))}
        </div>

        {/* Search + filter bar */}
        <PermitFilters totalAll={all.length} counts={counts} />

        {/* Permits list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400">
              Permits {filtered.length !== all.length ? `(${filtered.length} of ${all.length})` : `(${all.length})`}
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-600 bg-gray-900 border border-gray-800 rounded-xl">
              <FileText size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No permits found.</p>
              {(filterStatus || filterType || q) && (
                <p className="text-xs mt-1 text-gray-700">Try clearing the filters.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(permit => {
                const meta = STATUS_META[permit.status]
                return (
                  <div key={permit.id} className={`bg-gray-900 border rounded-xl p-5 ${meta?.card ?? 'border-gray-800'}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Left: main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-mono text-xs text-gray-500 shrink-0">{permit.permit_number}</span>
                          <span className="text-xs bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded-full">
                            {TYPE_LABELS[permit.permit_type] ?? permit.permit_type}
                          </span>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${meta?.badge}`}>
                            {meta?.icon}
                            {meta?.label}
                          </span>
                        </div>
                        <p className="font-semibold text-white">{permit.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {permit.plants?.code && <span>{permit.plants.code} · </span>}
                          {permit.location && <span>{permit.location} · </span>}
                          {permit.requester?.full_name && <span>Requested by {permit.requester.full_name} · </span>}
                          {fmt(permit.created_at)}
                        </p>
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{permit.work_description}</p>

                        {/* Validity */}
                        {(permit.valid_from || permit.valid_until) && (
                          <p className="text-xs text-gray-500 mt-2">
                            Valid: {permit.valid_from ? fmt(permit.valid_from) : '—'} → {permit.valid_until ? fmt(permit.valid_until) : '—'}
                          </p>
                        )}

                        {/* PPE */}
                        {permit.ppe_required && permit.ppe_required.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {permit.ppe_required.map((p, i) => (
                              <span key={i} className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rejection reason */}
                        {permit.rejection_reason && (
                          <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                            <strong>Rejection reason:</strong> {permit.rejection_reason}
                          </p>
                        )}

                        {/* Approver */}
                        {permit.approver?.full_name && (
                          <p className="text-xs text-gray-600 mt-1">Approved by {permit.approver.full_name}</p>
                        )}
                      </div>

                      {/* Right: actions */}
                      {canApprove && (
                        <PermitActions
                          permitId={permit.id}
                          status={permit.status}
                          userId={user.id}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
