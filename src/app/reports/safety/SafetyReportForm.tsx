'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface Plant { id: string; name: string; code: string }

export default function SafetyReportForm({
  userId, plants, canReview,
}: { userId: string; plants: Plant[]; canReview: boolean }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    plant_id:          '',
    report_type:       'daily_safety',
    title:             '',
    description:       '',
    severity:          '',
    workers_count:     '',
    ppe_compliant:     '',
    corrective_action: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const { error: err } = await createClient().from('safety_reports').insert({
      plant_id:          form.plant_id || null,
      report_type:       form.report_type,
      title:             form.title,
      description:       form.description,
      severity:          form.severity   || null,
      workers_count:     form.workers_count ? parseInt(form.workers_count) : null,
      ppe_compliant:     form.ppe_compliant === '' ? null : form.ppe_compliant === 'true',
      corrective_action: form.corrective_action || null,
      submitted_by:      userId,
      status:            'open',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    window.location.reload()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg px-4 py-2.5 transition-colors">
      <Plus size={15} /> Log Safety Report
    </button>
  )

  return (
    <form onSubmit={submit} className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-white">New Safety Report</p>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Report Type *</label>
          <select value={form.report_type} onChange={e => set('report_type', e.target.value)} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="daily_safety">Daily Safety Check</option>
            <option value="incident">Incident</option>
            <option value="near_miss">Near Miss</option>
            <option value="ppe_audit">PPE Audit</option>
            <option value="inspection">Inspection</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Plant</label>
          <select value={form.plant_id} onChange={e => set('plant_id', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">All / General</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-gray-400 block mb-1">Title *</label>
          <input required value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Brief title..." maxLength={150}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Severity</label>
          <select value={form.severity} onChange={e => set('severity', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">— None —</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">PPE Compliant</label>
          <select value={form.ppe_compliant} onChange={e => set('ppe_compliant', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">— N/A —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Workers Involved</label>
          <input type="number" min="0" max="500" value={form.workers_count} onChange={e => set('workers_count', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Description *</label>
        <textarea required value={form.description} onChange={e => set('description', e.target.value)}
          rows={3} placeholder="Describe what happened or was observed..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Corrective Action</label>
        <textarea value={form.corrective_action} onChange={e => set('corrective_action', e.target.value)}
          rows={2} placeholder="Steps taken or planned to address this..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none" />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Cancel</button>
        <button type="submit" disabled={saving}
          className="text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition-colors">
          {saving ? 'Saving…' : 'Submit Report'}
        </button>
      </div>
    </form>
  )
}
