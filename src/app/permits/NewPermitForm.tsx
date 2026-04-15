'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface Plant { id: string; name: string; code: string }

const PPE_OPTIONS = [
  'Hard hat', 'Safety glasses', 'Face shield', 'Hearing protection',
  'Heat-resistant gloves', 'Chemical-resistant gloves', 'Steel-capped boots',
  'Chemical apron', 'Respirator', 'Harness / fall arrest', 'Fire-retardant clothing',
]

const PERMIT_TYPES = [
  { value: 'hot_work',       label: 'Hot Work' },
  { value: 'cold_work',      label: 'Cold Work' },
  { value: 'confined_space', label: 'Confined Space Entry' },
  { value: 'electrical',     label: 'Electrical Isolation' },
  { value: 'height',         label: 'Working at Height' },
  { value: 'chemical',       label: 'Chemical Handling' },
  { value: 'general',        label: 'General Maintenance' },
]

export default function NewPermitForm({ userId, plants }: { userId: string; plants: Plant[] }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    plant_id:         '',
    permit_type:      'general',
    title:            '',
    work_description: '',
    location:         '',
    hazards:          '',
    precautions:      '',
    valid_from:       '',
    valid_until:      '',
  })
  const [ppe, setPpe] = useState<string[]>([])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const togglePpe = (item: string) =>
    setPpe(prev => prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const { error: err } = await createClient().from('work_permits').insert({
      plant_id:         form.plant_id         || null,
      permit_type:      form.permit_type,
      title:            form.title,
      work_description: form.work_description,
      location:         form.location         || null,
      hazards:          form.hazards          || null,
      precautions:      form.precautions      || null,
      ppe_required:     ppe.length > 0 ? ppe : null,
      valid_from:       form.valid_from       || null,
      valid_until:      form.valid_until      || null,
      requested_by:     userId,
      status:           'pending',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    setForm({ plant_id:'', permit_type:'general', title:'', work_description:'', location:'', hazards:'', precautions:'', valid_from:'', valid_until:'' })
    setPpe([])
    window.location.reload()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm bg-orange-500 hover:bg-orange-400 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors">
      <Plus size={15} /> New Permit
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <p className="font-bold text-white">New Work Permit</p>
          <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type + Plant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Permit Type *</label>
              <select required value={form.permit_type} onChange={e => set('permit_type', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                {PERMIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Plant / Section</label>
              <select value={form.plant_id} onChange={e => set('plant_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                <option value="">All / General</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Permit Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Brief title of the work to be performed"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="e.g. P3 Heat Exchanger Bay, Tank Farm P1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          </div>

          {/* Work description */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Work Description *</label>
            <textarea required rows={3} value={form.work_description} onChange={e => set('work_description', e.target.value)}
              placeholder="Describe in detail the work to be performed…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none" />
          </div>

          {/* Hazards + Precautions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Identified Hazards</label>
              <textarea rows={3} value={form.hazards} onChange={e => set('hazards', e.target.value)}
                placeholder="List hazards identified…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Precautions / Controls</label>
              <textarea rows={3} value={form.precautions} onChange={e => set('precautions', e.target.value)}
                placeholder="Measures to control each hazard…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none" />
            </div>
          </div>

          {/* Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Valid From</label>
              <input type="datetime-local" value={form.valid_from} onChange={e => set('valid_from', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Valid Until</label>
              <input type="datetime-local" value={form.valid_until} onChange={e => set('valid_until', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-gray-500" />
            </div>
          </div>

          {/* PPE */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">PPE Required</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PPE_OPTIONS.map(item => {
                const checked = ppe.includes(item)
                return (
                  <button key={item} type="button" onClick={() => togglePpe(item)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                      checked
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}>
                    <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                      checked ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
                    }`}>
                      {checked && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                    </span>
                    {item}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {error && <p className="px-6 text-xs text-red-400">{error}</p>}

        <div className="px-6 py-4 border-t border-gray-800 flex gap-2 justify-end sticky bottom-0 bg-gray-900">
          <button type="button" onClick={() => setOpen(false)}
            className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-2 transition-colors">
            {saving ? 'Submitting…' : 'Submit Permit'}
          </button>
        </div>
      </form>
    </div>
  )
}
