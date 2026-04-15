import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'
import ProceduresModule from './ProceduresModule'

export default async function ProceduresPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: plants }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single<Profile>(),
    supabase.from('plants').select('id, name, code').eq('is_active', true).order('code'),
  ])

  if (!profile) redirect('/login')

  return (
    <AppShell profile={profile}>
      <ProceduresModule plants={plants ?? []} userId={user.id} />
    </AppShell>
  )
}
