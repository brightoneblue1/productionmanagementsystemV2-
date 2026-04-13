import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AlertTriangle } from 'lucide-react'
import NewProblemForm from './NewProblemForm'
import ProblemCard from './ProblemCard'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'

export default async function ProblemsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: problems }, { data: plants }, { data: profiles }, { data: profile }] =
    await Promise.all([
      supabase
        .from('problems')
        .select(`
          id, title, description, severity, status, reported_at, plant_id,
          plants ( name ),
          reporter:profiles!problems_reported_by_fkey ( full_name ),
          assignee:profiles!problems_assigned_to_fkey ( full_name ),
          problem_updates (
            id, update_text, created_at,
            updater:profiles!problem_updates_updated_by_fkey ( full_name )
          )
        `)
        .order('reported_at', { ascending: false })
        .limit(50),
      supabase.from('plants').select('id, name').eq('is_active', true),
      supabase.from('profiles').select('id, full_name').eq('is_active', true),
      supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    ])

  if (!profile) redirect('/login')

  const openCount = problems?.filter(p => p.status === 'open').length ?? 0
  const canReport  = ['admin', 'supervisor', 'operator', 'tank_filler'].includes(profile.role)
  const canManage  = ['admin', 'supervisor'].includes(profile.role)

  return (
    <AppShell profile={profile as unknown as Profile}>
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <h1 className="font-semibold text-base">Problems</h1>
        {openCount > 0 && (
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full">
            {openCount} open
          </span>
        )}
      </div>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {canReport && <NewProblemForm userId={user.id} plants={plants ?? []} />}

        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Recent Reports</h2>
          {!problems || problems.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
              <p>No problems reported yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(problems as any[]).map(problem => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  userId={user.id}
                  profiles={profiles ?? []}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  )
}
