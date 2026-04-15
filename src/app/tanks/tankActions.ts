'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAuthedAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', supabase: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'supervisor'].includes(profile?.role ?? '')) return { error: 'Insufficient permissions', supabase: null }
  return { error: null, supabase }
}

export async function renameTank(tankId: string, name: string, code: string, productType: string) {
  const { error, supabase } = await getAuthedAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase
    .from('tanks')
    .update({
      name:         name.trim(),
      code:         code.trim().toUpperCase(),
      product_type: productType.trim() || null,
    })
    .eq('id', tankId)
  if (err) return { error: err.message }
  revalidatePath('/tanks')
  return { success: true }
}

export async function addTankToFarm(formData: FormData) {
  const { error, supabase } = await getAuthedAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('tanks').insert({
    tank_farm_id:         formData.get('farm_id') as string,
    name:                 formData.get('name') as string,
    code:                 (formData.get('code') as string).toUpperCase(),
    capacity_liters:      parseFloat(formData.get('capacity_liters') as string) || 0,
    current_level_liters: 0,
    product_type:         (formData.get('product_type') as string) || null,
    pump_flow_rate_lph:   0,
    pump_speed_factor:    1.0,
    min_level_percent:    10,
    max_level_percent:    90,
    alert_low_percent:    25,
    alert_high_percent:   80,
    is_active:            true,
  })
  if (err) return { error: err.message }
  revalidatePath('/tanks')
  return { success: true }
}
