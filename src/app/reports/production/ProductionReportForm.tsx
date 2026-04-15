'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface Plant { id: string; name: string; code: string }

const PRODUCT_TYPES: Record<string, string[]> = {
  P1: ['Degummed Soya Bean Oil'],
  P2: ['Sunflower Oil'],
  P3: ['RBD Palm Oil'],
  P4: ['Neutralised Soya Bean Oil'],
  P5: ['Palm Olein', 'Palm Stearin'],
  P6: ['Palm Olein', 'Palm Stearin'],
}

export default function ProductionReportForm({ userId, plants }: { userId: string; plants: Plant[] }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    plant_id:                '',
    product_type:            '',
    crude_type:              '',
    crude_received_liters:   '',
    product_produced_liters: '',
    olein_yield_percent:     '',
    stearin_yield_percent:   '',
    ffa_percent:             '',
    moisture_percent:        '',
    capacity_utilization:    '',
    operating_hours:         '',
    notes:                   '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const selectedPlant = plants.find(p => p.id === form.plant_id)
  const productOptions = selectedPlant ? (PRODUCT_TYPES[selectedPlant.code] ?? []) : []

  const isFrac = selectedPlant?.code === 'P5' || selectedPlant?.code === 'P6'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const num = (v: string) => v ? parseFloat(v) : null
    const { error: err } = await createClient().from('plant_daily_reports').insert({
      plant_id:                form.plant_id || null,
      product_type:            form.product_type || null,
      crude_type:              form.crude_type || null,
      crude_received_liters:   num(form.crude_received_liters),
      product_produced_liters: num(form.product_produced_liters),
      olein_yield_percent:     num(form.olein_yield_percent),
      stearin_yield_percent:   num(form.stearin_yield_percent),
      ffa_percent:             num(form.ffa_percent),
      moisture_percent:        num(form.moisture_percent),
      capacity_utilization:    num(form.capacity_utilization),
      operating_hours:         num(form.operating_hours),
      notes:                   form.notes || null,
      status:                  'submitted',
      submitted_by:            userId,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    window.location.reload()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 rounded-lg px-4 py-2.5 transition-colors">
      <Plus size={15} /> Submit Production Report
    </button>
  )

  return (
    <form onSubmit={submit} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-white">Production Report</p>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Plant *</label>
          <select required value={form.plant_id} onChange={e => { set('plant_id', e.target.value); set('product_type', '') }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">Select plant…</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Product Type *</label>
          {productOptions.length > 0 ? (
            <select required value={form.product_type} onChange={e => set('product_type', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Select…</option>
              {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input value={form.product_type} onChange={e => set('product_type', e.target.value)}
              placeholder="e.g. RBD Palm Oil" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
          )}
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Crude Feedstock Type</label>
          <input value={form.crude_type} onChange={e => set('crude_type', e.target.value)}
            placeholder="e.g. CPO, Crude Soya Bean Oil"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Crude Received (L)</label>
          <input type="number" min="0" step="100" value={form.crude_received_liters} onChange={e => set('crude_received_liters', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Product Output (L)</label>
          <input type="number" min="0" step="100" value={form.product_produced_liters} onChange={e => set('product_produced_liters', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Operating Hours</label>
          <input type="number" min="0" max="24" step="0.5" value={form.operating_hours} onChange={e => set('operating_hours', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Capacity Utilisation (%)</label>
          <input type="number" min="0" max="100" step="0.1" value={form.capacity_utilization} onChange={e => set('capacity_utilization', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">FFA (%)</label>
          <input type="number" min="0" max="100" step="0.01" value={form.ffa_percent} onChange={e => set('ffa_percent', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        {isFrac && (
          <>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Olein Yield (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.olein_yield_percent} onChange={e => set('olein_yield_percent', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Stearin Yield (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.stearin_yield_percent} onChange={e => set('stearin_yield_percent', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={2} placeholder="Any notable observations..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
        <button type="submit" disabled={saving}
          className="text-sm bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition-colors">
          {saving ? 'Saving…' : 'Submit Report'}
        </button>
      </div>
    </form>
  )
}
