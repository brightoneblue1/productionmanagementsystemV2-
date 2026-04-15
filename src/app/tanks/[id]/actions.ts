'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function authed() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', supabase: null, role: '' }
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { error: null, supabase, role: p?.role ?? '', userId: user.id }
}

function rev(tankId: string) {
  revalidatePath(`/tanks/${tankId}`)
  revalidatePath('/tanks')
}

// ─── Connections ──────────────────────────────────────────────────────────────

export async function addConnection(formData: FormData) {
  const { error, supabase, role } = await authed()
  if (error || !supabase) return { error }
  if (!['admin', 'supervisor'].includes(role)) return { error: 'Insufficient permissions' }

  const tankId = formData.get('tank_id') as string
  const { error: err } = await supabase.from('tank_connections').insert({
    tank_id:            tankId,
    direction:          formData.get('direction') as string,
    connection_type:    formData.get('connection_type') as string,
    connected_tank_id:  (formData.get('connected_tank_id') as string) || null,
    connected_plant_id: (formData.get('connected_plant_id') as string) || null,
    pump_name:          (formData.get('pump_name') as string) || null,
    flow_rate_lph:      parseFloat(formData.get('flow_rate_lph') as string) || 0,
    notes:              (formData.get('notes') as string) || null,
  })
  if (err) return { error: err.message }
  rev(tankId); return { success: true }
}

export async function removeConnection(connectionId: string, tankId: string) {
  const { error, supabase, role } = await authed()
  if (error || !supabase) return { error }
  if (!['admin', 'supervisor'].includes(role)) return { error: 'Insufficient permissions' }
  const { error: err } = await supabase.from('tank_connections').delete().eq('id', connectionId)
  if (err) return { error: err.message }
  rev(tankId); return { success: true }
}

// ─── Cleaning Schedule ────────────────────────────────────────────────────────

export async function upsertCleaningSchedule(formData: FormData) {
  const { error, supabase, role } = await authed()
  if (error || !supabase) return { error }
  if (!['admin', 'supervisor'].includes(role)) return { error: 'Insufficient permissions' }

  const tankId     = formData.get('tank_id') as string
  const scheduleId = formData.get('schedule_id') as string | null
  const freqDays   = parseInt(formData.get('frequency_days') as string) || 90
  const lastCleaned = (formData.get('last_cleaned_at') as string) || null
  const nextDue = lastCleaned
    ? new Date(new Date(lastCleaned).getTime() + freqDays * 86400000).toISOString()
    : null

  const payload = {
    tank_id:         tankId,
    frequency_days:  freqDays,
    last_cleaned_at: lastCleaned || null,
    next_due_at:     nextDue,
    procedure:       (formData.get('procedure') as string) || null,
    notes:           (formData.get('notes') as string) || null,
    is_active:       true,
  }

  const { error: err } = scheduleId
    ? await supabase.from('tank_cleaning_schedules').update(payload).eq('id', scheduleId)
    : await supabase.from('tank_cleaning_schedules').insert(payload)

  if (err) return { error: err.message }
  rev(tankId); return { success: true }
}

// ─── Log Cleaning ─────────────────────────────────────────────────────────────

export async function logCleaning(formData: FormData) {
  const { error, supabase, userId } = await authed()
  if (error || !supabase) return { error }

  const tankId     = formData.get('tank_id') as string
  const scheduleId = (formData.get('schedule_id') as string) || null
  const cleanedAt  = (formData.get('cleaned_at') as string) || new Date().toISOString()

  const { error: err } = await supabase.from('tank_cleaning_logs').insert({
    tank_id:         tankId,
    schedule_id:     scheduleId,
    cleaned_at:      cleanedAt,
    cleaned_by:      userId,
    duration_hours:  parseFloat(formData.get('duration_hours') as string) || null,
    observations:    (formData.get('observations') as string) || null,
    procedure_notes: (formData.get('procedure_notes') as string) || null,
  })
  if (err) return { error: err.message }

  // Update schedule last_cleaned_at & next_due_at
  if (scheduleId) {
    const { data: sched } = await supabase
      .from('tank_cleaning_schedules').select('frequency_days').eq('id', scheduleId).single()
    if (sched) {
      const nextDue = new Date(new Date(cleanedAt).getTime() + sched.frequency_days * 86400000).toISOString()
      await supabase.from('tank_cleaning_schedules')
        .update({ last_cleaned_at: cleanedAt, next_due_at: nextDue })
        .eq('id', scheduleId)
    }
  }

  rev(tankId); return { success: true }
}
