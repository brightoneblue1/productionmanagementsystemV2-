'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface Plant { id: string; name: string; code: string }

export default function EquipmentReportForm({ userId, plants }: { userId: string; plants: Plant[] }) {
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    plant_id:          '',
    equipment_name:    '',
    equipment_type:    '',
    status:            'operational',
    uptime_hours:      '',
    downtime_hours:    '',
    fault_description: '',
    action_taken:      '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('equipment_reports').insert({
      plant_id:          form.plant_id   || null,
      equipment_name:    form.equipment_name,
      equipment_type:    form.equipment_type,
      status:            form.status,
      uptime_hours:      form.uptime_hours   ? parseFloat(form.uptime_hours)   : null,
      downtime_hours:    form.downtime_hours ? parseFloat(form.downtime_hours) : null,
      fault_description: form.fault_description || null,
      action_taken:      form.action_taken      || null,
      reported_by:       userId,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    setForm({ plant_id:'', equipment_name:'', equipment_type:'', status:'operational', uptime_hours:'', downtime_hours:'', fault_description:'', action_taken:'' })
    window.location.reload()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg px-4 py-2.5 transition-colors">
      <Plus size={15} /> Log Equipment Status
    </button>
  )

  return (
    <form onSubmit={submit} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-white">Log Equipment Status</p>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Plant</label>
          <select value={form.plant_id} onChange={e => set('plant_id', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">All / Unspecified</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Status *</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="degraded">Degraded</option>
            <option value="fault">Fault</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Equipment Name *</label>
          <input required value={form.equipment_name} onChange={e => set('equipment_name', e.target.value)}
            placeholder="e.g. CPO Transfer Pump 1" maxLength={100}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Equipment Type *</label>
          <input required value={form.equipment_type} onChange={e => set('equipment_type', e.target.value)}
            placeholder="e.g. Pump, Heat Exchanger, Filter" maxLength={80}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Uptime (hours)</label>
          <input type="number" min="0" max="24" step="0.5" value={form.uptime_hours} onChange={e => set('uptime_hours', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Downtime (hours)</label>
          <input type="number" min="0" max="24" step="0.5" value={form.downtime_hours} onChange={e => set('downtime_hours', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
      </div>

      {['fault','offline','degraded'].includes(form.status) && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Fault Description *</label>
          <textarea value={form.fault_description} onChange={e => set('fault_description', e.target.value)}
            rows={2} placeholder="Describe the fault or issue..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
        </div>
      )}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Action Taken</label>
        <textarea value={form.action_taken} onChange={e => set('action_taken', e.target.value)}
          rows={2} placeholder="Steps taken or planned..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
        <button type="submit" disabled={saving}
          className="text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition-colors">
          {saving ? 'Saving…' : 'Submit Report'}
        </button>
      </div>
    </form>
  )
}
