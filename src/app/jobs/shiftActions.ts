'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveShiftReport(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const shiftId  = formData.get('shift_id') as string
  const totalProd = parseFloat(formData.get('total_produced_liters') as string) || 0
  const spillage  = parseFloat(formData.get('spillage_liters') as string) || 0
  const nonConf   = parseFloat(formData.get('non_conforming_liters') as string) || 0

  const payload = {
    shift_id: shiftId,
    total_produced_liters: totalProd,
    spillage_liters: spillage,
    spillage_description: formData.get('spillage_description') as string || null,
    non_conforming_liters: nonConf,
    non_conforming_reason: formData.get('non_conforming_reason') as string || null,
    outstanding_issues: formData.get('outstanding_issues') as string || null,
    handover_notes: formData.get('handover_notes') as string || null,
    status: 'submitted',
  }

  const { error } = await supabase
    .from('shift_reports')
    .upsert(payload, { onConflict: 'shift_id' })

  if (error) return { error: error.message }
  revalidatePath('/jobs')
  return { success: true }
}

export async function signOffShiftReport(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shift_reports')
    .update({ status: 'signed_off', signed_off_by: user.id, signed_off_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath('/jobs')
  return { success: true }
}
