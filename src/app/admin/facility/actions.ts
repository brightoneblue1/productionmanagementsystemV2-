'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', supabase: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'supervisor'].includes(profile.role)) return { error: 'Insufficient permissions', supabase: null }
  return { error: null, supabase }
}

function revalidate() { revalidatePath('/admin/facility'); revalidatePath('/tanks') }

// ─── Tank Farms ───────────────────────────────────────────────────────────────

export async function createTankFarm(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('tank_farms').insert({
    name: formData.get('name') as string,
    code: (formData.get('code') as string).toUpperCase(),
  })
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

export async function updateTankFarm(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('tank_farms').update({
    name: formData.get('name') as string,
    code: (formData.get('code') as string).toUpperCase(),
  }).eq('id', formData.get('id') as string)
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

export async function deleteTankFarm(farmId: string) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  // Check for tanks
  const { count } = await supabase.from('tanks').select('*', { count: 'exact', head: true }).eq('tank_farm_id', farmId)
  if ((count ?? 0) > 0) return { error: `Cannot delete: ${count} tank(s) still assigned to this farm. Move or delete them first.` }
  const { error: err } = await supabase.from('tank_farms').delete().eq('id', farmId)
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

export async function mergeTankFarms(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const sourceId = formData.get('source_id') as string
  const targetId = formData.get('target_id') as string
  if (sourceId === targetId) return { error: 'Source and target must be different farms.' }
  // Move all tanks from source → target
  const { error: moveErr } = await supabase.from('tanks').update({ tank_farm_id: targetId }).eq('tank_farm_id', sourceId)
  if (moveErr) return { error: moveErr.message }
  // Delete source farm
  const { error: delErr } = await supabase.from('tank_farms').delete().eq('id', sourceId)
  if (delErr) return { error: delErr.message }
  revalidate(); return { success: true }
}

export async function splitTankFarm(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const tankIds = (formData.get('tank_ids') as string).split(',').filter(Boolean)
  if (!tankIds.length) return { error: 'Select at least one tank to move.' }
  // Create new farm
  const { data: newFarm, error: createErr } = await supabase.from('tank_farms').insert({
    name: formData.get('new_farm_name') as string,
    code: (formData.get('new_farm_code') as string).toUpperCase(),
  }).select('id').single()
  if (createErr || !newFarm) return { error: createErr?.message ?? 'Failed to create farm.' }
  // Move selected tanks
  const { error: moveErr } = await supabase.from('tanks').update({ tank_farm_id: newFarm.id }).in('id', tankIds)
  if (moveErr) return { error: moveErr.message }
  revalidate(); return { success: true }
}

// ─── Tanks ────────────────────────────────────────────────────────────────────

export async function createTank(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('tanks').insert({
    tank_farm_id:       formData.get('farm_id') as string,
    name:               formData.get('name') as string,
    code:               (formData.get('code') as string).toUpperCase(),
    capacity_liters:    parseFloat(formData.get('capacity_liters') as string) || 0,
    current_level_liters: 0,
    product_type:       formData.get('product_type') as string || null,
    pump_flow_rate_lph: parseFloat(formData.get('pump_flow_rate_lph') as string) || 0,
    pump_speed_factor:  1.0,
    min_level_percent:  parseInt(formData.get('min_level_percent') as string) || 10,
    max_level_percent:  parseInt(formData.get('max_level_percent') as string) || 90,
    alert_low_percent:  parseInt(formData.get('alert_low_percent') as string) || 25,
    alert_high_percent: parseInt(formData.get('alert_high_percent') as string) || 80,
    is_active:          true,
  })
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

export async function updateTank(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('tanks').update({
    name:               formData.get('name') as string,
    code:               (formData.get('code') as string).toUpperCase(),
    capacity_liters:    parseFloat(formData.get('capacity_liters') as string) || 0,
    product_type:       formData.get('product_type') as string || null,
    pump_flow_rate_lph: parseFloat(formData.get('pump_flow_rate_lph') as string) || 0,
    min_level_percent:  parseInt(formData.get('min_level_percent') as string) || 10,
    max_level_percent:  parseInt(formData.get('max_level_percent') as string) || 90,
    alert_low_percent:  parseInt(formData.get('alert_low_percent') as string) || 25,
    alert_high_percent: parseInt(formData.get('alert_high_percent') as string) || 80,
    is_active:          formData.get('is_active') === 'true',
  }).eq('id', formData.get('id') as string)
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

export async function deleteTank(tankId: string) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('tanks').delete().eq('id', tankId)
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

export async function moveTankToFarm(tankId: string, targetFarmId: string) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('tanks').update({ tank_farm_id: targetFarmId }).eq('id', tankId)
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

// ─── Plants / Sections ────────────────────────────────────────────────────────

export async function createPlant(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('plants').insert({
    name:      formData.get('name') as string,
    code:      (formData.get('code') as string).toUpperCase(),
    is_active: true,
  })
  if (err) return { error: err.message }
  revalidate(); revalidatePath('/problems'); revalidatePath('/reports')
  return { success: true }
}

export async function updatePlant(formData: FormData) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('plants').update({
    name:      formData.get('name') as string,
    code:      (formData.get('code') as string).toUpperCase(),
    is_active: formData.get('is_active') === 'true',
  }).eq('id', formData.get('id') as string)
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}

export async function deletePlant(plantId: string) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error }
  const { error: err } = await supabase.from('plants').delete().eq('id', plantId)
  if (err) return { error: err.message }
  revalidate(); return { success: true }
}
