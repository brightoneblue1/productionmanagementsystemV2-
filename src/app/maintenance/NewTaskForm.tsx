'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'
import type { Equipment } from './page'

interface Plant { id: string; name: string; code: string }

const TASK_TYPES = [
  { value: 'preventive',  label: 'Preventive Maintenance' },
  { value: 'corrective',  label: 'Corrective Maintenance' },
  { value: 'inspection',  label: 'Inspection' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'cleaning',    label: 'Cleaning' },
]

const PRIORITIES = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export default function NewTaskForm({
  userId, plants, equipment,
}: {
  userId: string
  plants: Plant[]
  equipment: Equipment[]
}) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    plant_id:        '',
    equipment_id:    '',
    title:           '',
    description:     '',
    task_type:       'preventive',
    priority:        'medium',
    scheduled_date:  '',
    estimated_hours: '',
    notes:           '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Filter equipment by selected plant
  const filteredEquipment = form.plant_id
    ? equipment.filter(e => e.plant_id === form.plant_id)
    : equipment

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const { error: err } = await createClient().from('maintenance_tasks').insert({
      plant_id:        form.plant_id        || null,
      equipment_id:    form.equipment_id    || null,
      title:           form.title,
      description:     form.description     || null,
      task_type:       form.task_type,
      priority:        form.priority,
      status:          'pending',
      scheduled_date:  form.scheduled_date  || null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      notes:           form.notes           || null,
      created_by:      userId,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    window.location.reload()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm bg-orange-500 hover:bg-orange-400 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors">
      <Plus size={15} /> New Task
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <p className="font-bold text-white">New Maintenance Task</p>
          <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Task Type *</label>
              <select required value={form.task_type} onChange={e => set('task_type', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Priority *</label>
              <select required value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Task Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Brief description of the task"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Plant</label>
              <select value={form.plant_id} onChange={e => { set('plant_id', e.target.value); set('equipment_id', '') }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                <option value="">All / General</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Equipment</label>
              <select value={form.equipment_id} onChange={e => set('equipment_id', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
                <option value="">— Select equipment —</option>
                {filteredEquipment.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.code ? `${eq.code} · ` : ''}{eq.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Detailed description of the work to be done…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Scheduled Date</label>
              <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Estimated Hours</label>
              <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)}
                placeholder="e.g. 4"
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
            {saving ? 'Saving…' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
