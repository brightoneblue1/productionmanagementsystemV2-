'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

interface Plant { id: string; name: string }

export default function NewProblemForm({ userId, plants }: { userId: string; plants: Plant[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    plant_id: '',
    priority: '3',
    due_date: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.from('problems').insert({
      title: form.title,
      description: form.description,
      severity: form.severity,
      plant_id: form.plant_id || null,
      priority: parseInt(form.priority),
      due_date: form.due_date || null,
      reported_by: userId,
    })

    if (err) {
      setError('Failed to submit. Try again.')
      setLoading(false)
      return
    }

    setForm({ title: '', description: '', severity: 'medium', plant_id: '', priority: '3', due_date: '' })
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        <Plus size={16} />
        Report a Problem
      </button>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">New Problem Report</h3>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Title</label>
          <input
            required
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Brief description of the problem"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Details</label>
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="What happened? Where? Any safety concerns?"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Severity</label>
            <select value={form.severity} onChange={e => set('severity', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Priority (1=highest)</label>
            <select value={form.priority} onChange={e => set('priority', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="1">1 — Critical</option>
              <option value="2">2 — High</option>
              <option value="3">3 — Medium</option>
              <option value="4">4 — Low</option>
              <option value="5">5 — Minimal</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Plant (optional)</label>
            <select value={form.plant_id} onChange={e => set('plant_id', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500">
              <option value="">— None —</option>
              {plants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Due Date (optional)</label>
            <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>
    </div>
  )
}
