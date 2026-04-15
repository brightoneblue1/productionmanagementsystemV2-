import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import FacilityManager from './FacilityManager'
import type { Profile } from '@/types'
import type { Farm, Plant } from './FacilityManager'

export default async function FacilityPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')
  if (!['admin', 'supervisor'].includes(profile.role)) redirect('/dashboard')

  const [{ data: farms }, { data: plants }] = await Promise.all([
    supabase
      .from('tank_farms')
      .select(`
        id, name, code,
        tanks (
          id, name, code, capacity_liters, current_level_liters,
          product_type, is_active, pump_flow_rate_lph,
          min_level_percent, max_level_percent,
          alert_low_percent, alert_high_percent
        )
      `)
      .order('code'),
    supabase
      .from('plants')
      .select('id, name, code, is_active')
      .order('name'),
  ])

  return (
    <AppShell profile={profile}>
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="font-bold text-lg text-white">Facility Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage tank farms, tanks, plants and sections — create, edit, merge or split
        </p>
      </div>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <FacilityManager
          farms={(farms ?? []) as unknown as Farm[]}
          plants={(plants ?? []) as unknown as Plant[]}
        />
      </main>
    </AppShell>
  )
}
