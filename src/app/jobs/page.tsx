import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sun, Sunset, Moon, Users, CalendarSearch } from 'lucide-react'
import NewShiftForm from './NewShiftForm'
import ShiftReportPanel from './ShiftReportPanel'
import ShiftDateSearch from './ShiftDateSearch'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'

interface Assignment {
  profile_id: string
  role_on_shift: string | null
  profiles: { full_name: string; role: string } | null
}

interface ShiftReport {
  id: string
  status: string
  total_produced_liters: number
  spillage_liters: number
  non_conforming_liters: number
  net_production_liters: number
  spillage_description: string | null
  non_conforming_reason: string | null
  outstanding_issues: string | null
  handover_notes: string | null
}

interface Shift {
  id: string
  shift_type: 'morning' | 'afternoon' | 'night'
  shift_date: string
  start_time: string
  end_time: string
  plants: { name: string } | null
  shift_assignments: Assignment[]
  shift_reports: ShiftReport[]
}

const SHIFT_ICON = {
  morning:   <Sun size={14} className="text-yellow-400" />,
  afternoon: <Sunset size={14} className="text-orange-400" />,
  night:     <Moon size={14} className="text-blue-400" />,
}

const SHIFT_COLORS = {
  morning:   'border-yellow-500/30 bg-yellow-500/5',
  afternoon: 'border-orange-500/30 bg-orange-500/5',
  night:     'border-blue-500/30 bg-blue-500/5',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmt(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m}${hr < 12 ? 'am' : 'pm'}`
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: searchDate } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // When a specific date is searched, fetch only that day.
  // Otherwise show the rolling window (yesterday → next 2 days).
  const defaultFrom = new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0]
  const defaultTo   = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]

  let shiftsQuery = supabase
    .from('shifts')
    .select(`
      id, shift_type, shift_date, start_time, end_time,
      plants ( name ),
      shift_assignments (
        profile_id, role_on_shift,
        profiles ( full_name, role )
      ),
      shift_reports (
        id, status, total_produced_liters, spillage_liters,
        non_conforming_liters, net_production_liters,
        spillage_description, non_conforming_reason,
        outstanding_issues, handover_notes
      )
    `)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (searchDate) {
    shiftsQuery = shiftsQuery.eq('shift_date', searchDate)
  } else {
    shiftsQuery = shiftsQuery.gte('shift_date', defaultFrom).lte('shift_date', defaultTo)
  }

  const [{ data: shifts }, { data: plants }, { data: profiles }, { data: profile }] =
    await Promise.all([
      shiftsQuery.limit(60),
      supabase.from('plants').select('id, name').eq('is_active', true),
      supabase.from('profiles').select('id, full_name, role').eq('is_active', true),
      supabase.from('profiles').select('role').eq('id', user.id).single(),
    ])

  const canCreate  = ['admin', 'supervisor'].includes(profile?.role ?? '')
  const canManage  = ['admin', 'supervisor'].includes(profile?.role ?? '')

  const { data: fullProfile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!fullProfile) redirect('/login')

  // Group shifts by date
  const grouped: Record<string, Shift[]> = {}
  for (const shift of (shifts as unknown as Shift[]) ?? []) {
    const key = shift.shift_date
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(shift)
  }

  return (
    <AppShell profile={fullProfile}>
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-bold text-lg text-white">Shift Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {searchDate
                ? `Shifts on ${new Date(searchDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Schedule and assign shifts to personnel'}
            </p>
          </div>
          <ShiftDateSearch />
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {canCreate && !searchDate && (
          <NewShiftForm
            userId={user.id}
            plants={plants ?? []}
            profiles={(profiles ?? []).filter(p => p.id !== user.id)}
          />
        )}

        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            {searchDate ? (
              <>
                <CalendarSearch size={36} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">No shifts found on this date.</p>
                <p className="text-xs mt-1 text-gray-700">Try a different date or clear the search.</p>
              </>
            ) : (
              <>
                <Users size={36} className="mx-auto mb-2 opacity-30" />
                <p>No shifts scheduled yet.</p>
              </>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayShifts]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {formatDate(date)} — {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
              <div className="space-y-3">
                {dayShifts.map(shift => (
                  <div
                    key={shift.id}
                    className={`border rounded-xl p-4 ${SHIFT_COLORS[shift.shift_type]}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {SHIFT_ICON[shift.shift_type]}
                        <span className="font-medium text-sm capitalize">{shift.shift_type} Shift</span>
                        <span className="text-xs text-gray-400">
                          {fmt(shift.start_time)} – {fmt(shift.end_time)}
                        </span>
                      </div>
                      {shift.plants?.name && (
                        <span className="text-xs text-gray-400">{shift.plants.name}</span>
                      )}
                    </div>

                    {shift.shift_assignments.length === 0 ? (
                      <p className="text-xs text-gray-600">No personnel assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {shift.shift_assignments.map(a => (
                          <div
                            key={a.profile_id}
                            className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2.5 py-1"
                          >
                            <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-xs font-medium">
                              {a.profiles?.full_name?.[0] ?? '?'}
                            </div>
                            <span className="text-xs text-white">{a.profiles?.full_name}</span>
                            <span className="text-xs text-gray-500">{a.profiles?.role}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <ShiftReportPanel
                      shiftId={shift.id}
                      canManage={canManage}
                      existingReport={shift.shift_reports?.[0] ?? null}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </AppShell>
  )
}
