'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserCog } from 'lucide-react'

interface Props {
  tankId: string
  currentFillerId: string | null
  fillers: { id: string; full_name: string }[]
}

export default function AssignFillerSelect({ tankId, currentFillerId, fillers }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function assign(fillerId: string) {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('tanks')
      .update({ assigned_filler_id: fillerId || null })
      .eq('id', tankId)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5">
      <UserCog size={11} className="text-gray-500 shrink-0" />
      <select
        defaultValue={currentFillerId ?? ''}
        disabled={saving}
        onChange={e => assign(e.target.value)}
        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
      >
        <option value="">— unassigned —</option>
        {fillers.map(f => (
          <option key={f.id} value={f.id}>{f.full_name}</option>
        ))}
      </select>
    </div>
  )
}
