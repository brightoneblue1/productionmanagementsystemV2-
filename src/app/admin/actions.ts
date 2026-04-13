'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Not authorized')
  return user
}

export async function inviteUser(formData: FormData) {
  await requireAdmin()
  const email    = formData.get('email') as string
  const fullName = formData.get('full_name') as string
  const role     = formData.get('role') as string
  const password = formData.get('password') as string

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (error) return { error: error.message }

  await admin.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    role,
  }, { onConflict: 'id' })

  revalidatePath('/admin')
  return { success: true }
}

export async function updateUserRole(formData: FormData) {
  await requireAdmin()
  const profileId = formData.get('profile_id') as string
  const role      = formData.get('role') as string

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles').update({ role }).eq('id', profileId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function toggleUserActive(formData: FormData) {
  await requireAdmin()
  const profileId = formData.get('profile_id') as string
  const isActive  = formData.get('is_active') === 'true'

  const supabase = await createClient()
  await supabase.from('profiles').update({ is_active: !isActive }).eq('id', profileId)

  revalidatePath('/admin')
}
