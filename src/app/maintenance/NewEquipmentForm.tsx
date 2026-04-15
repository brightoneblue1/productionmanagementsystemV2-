'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface Plant { id: string; name: string; code: string }

const EQUIPMENT_TYPES = [
  'Heat Exchanger', 'Pump', 'Compressor', 'Centrifuge', 'Filter',
  'Reactor / Vessel', 'Tank', 'Boiler', 'Conveyor', 'Agitator',
  'Valve', 'Instrumentation', 'Electrical Panel', 'Motor', 'Other',
]

const CONDITIONS = [
  { value: 'good',     label: 'Good' },
  { value: 'fair',     label: 'Fair' },
  { value: 'poor',     label: 'Poor' },
  { value: 'critical', label: 'Critical' },
  { value: 'offline',  label: 'Offline' },
]

export default function NewEquipmentForm({ userId, plants }: { userId: string; plants: Plant[] }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    plant_id:               '',
    name:                   '',
    code:                   '',
    equipment_type:         EQUIPMENT_TYPES[0],
    manufacturer:           '',
    model:                  '',
    serial_number:          '',
    install_date:           '',
    last_service_date:      '',
    next_service_date:      '',
    condition:              'good',
    runtime_hours:          '',
    service_interval_hours: '',
    notes:                  '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const { error: err } = await createClient().from('equipment_registry').insert({
      plant_id:               form.plant_id               || null,
      name:                   form.name,
      code:                   form.code                   || null,
      equipment_type:         form.equipment_type,
      manufacturer:           form.manufacturer           || null,
      model:                  form.model                  || null,
      serial_number:          form.serial_number          || null,
      install_date:           form.install_date           || null,
      last_service_date:      form.last_service_date      || null,
      next_service_date:      form.next_service_date      || null,
      condition:              form.condition,
      runtime_hours:          form.runtime_hours          ? parseFloat(form.runtime_hours) : 0,
      service_interval_hours: form.service_interval_hours ? parseFloat(form.service_interval_hours) : null,
      notes:                  form.notes                  || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    window.location.reload()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors">
      <Plus size={15} /> Add Equipment
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <p className="font-bold text-white">Register Equipment</p>
          <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Equipment Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Feed Pump P1-A"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Asset Code</label>
              <input value={form.code} onChange={e => set('code', e.target.value)}
                placeholder="e.g. P1-PUMP-001"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Equipment Type *</label>
              <select required value={form.equipment_type} onChange={e => set('equipment_type', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Plant</label>
              <select value={form.plant_id} onChange={e => set('plant_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                <option value="">All / General</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Manufacturer</label>
              <input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)}
                placeholder="e.g. Alfa Laval"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Model</label>
              <input value={form.model} onChange={e => set('model', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Serial Number</label>
            <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Install Date</label>
              <input type="date" value={form.install_date} onChange={e => set('install_date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Last Service</label>
              <input type="date" value={form.last_service_date} onChange={e => set('last_service_date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Next Service</label>
              <input type="date" value={form.next_service_date} onChange={e => set('next_service_date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Condition</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Runtime Hours</label>
              <input type="number" min="0" value={form.runtime_hours} onChange={e => set('runtime_hours', e.target.value)}
                placeholder="0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Service Interval (h)</label>
              <input type="number" min="0" value={form.service_interval_hours} onChange={e => set('service_interval_hours', e.target.value)}
                placeholder="e.g. 2000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none" />
          </div>
        </div>

        {error && <p className="px-6 text-xs text-red-400">{error}</p>}

        <div className="px-6 py-4 border-t border-gray-800 flex gap-2 justify-end sticky bottom-0 bg-gray-900">
          <button type="button" onClick={() => setOpen(false)}
            className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">Cancel</button>
          <button type="submit" disabled={saving}
            className="text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-2 transition-colors">
            {saving ? 'Saving…' : 'Register Equipment'}
          </button>
        </div>
      </form>
    </div>
  )
}
