'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Fuel, X } from 'lucide-react'

interface Props {
  tank: { id: string; name: string; code: string }
  userId: string
}

export default function LogFillButton({ tank, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    volume_added_liters: '',
    tanker_reference: '',
    product_type: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('tank_fill_events').insert({
      tank_id: tank.id,
      volume_added_liters: parseFloat(form.volume_added_liters),
      tanker_reference: form.tanker_reference || null,
      product_type: form.product_type || null,
      notes: form.notes || null,
      operator_id: userId,
      started_at: new Date().toISOString(),
    })
    if (err) { setError('Failed to save.'); setLoading(false); return }
    setOpen(false)
    setLoading(false)
    setForm({ volume_added_liters: '', tanker_reference: '', product_type: '', notes: '' })
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-orange-400 border border-gray-800 hover:border-orange-500/40 rounded-lg py-1.5 transition-colors"
      >
        <Fuel size={12} /> Log Fill
      </button>
    )
  }

  return (
    <div className="border border-orange-500/30 bg-orange-500/5 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-orange-400">Log Fill — {tank.code}</span>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
      </div>
      <form onSubmit={submit} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Volume Added (L)</label>
            <input required type="number" step="any" min={0} value={form.volume_added_liters}
              onChange={e => set('volume_added_liters', e.target.value)}
              placeholder="e.g. 12000"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tanker Ref (optional)</label>
            <input type="text" value={form.tanker_reference}
              onChange={e => set('tanker_reference', e.target.value)}
              placeholder="e.g. TK-2024-001"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Product Type (optional)</label>
          <input type="text" value={form.product_type}
            onChange={e => set('product_type', e.target.value)}
            placeholder="e.g. RBD, Crude Sunflower, Olein"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
          <input type="text" value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any remarks"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded transition-colors">
          {loading ? 'Saving…' : 'Log Fill Event'}
        </button>
      </form>
    </div>
  )
}
