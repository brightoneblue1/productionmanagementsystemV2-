import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import InviteForm from './InviteForm'
import UserRow from './UserRow'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, employee_id, is_active')
    .order('full_name')

  const active   = profiles?.filter(p => p.is_active).length ?? 0
  const inactive = profiles?.filter(p => !p.is_active).length ?? 0

  return (
    <AppShell profile={profile!}>
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-lg text-white">Personnel</h1>
          <span className="text-xs text-gray-500">{active} active{inactive > 0 ? `, ${inactive} inactive` : ''}</span>
        </div>
        <InviteForm />
      </div>
      <main className="max-w-3xl mx-auto px-6 py-8">
        {!profiles || profiles.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p>No users yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 text-left">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <UserRow key={p.id} profile={p} currentUserId={user.id} />
              ))}
            </tbody>
          </table>
        )}
      </main>
    </AppShell>
  )
}
