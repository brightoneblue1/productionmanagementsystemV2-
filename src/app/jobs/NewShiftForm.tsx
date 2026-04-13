'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Plant { id: string; name: string }
interface Profile { id: string; full_name: string; role: string }

export default function NewShiftForm({
  userId,
  plants,
  profiles,
}: {
  userId: string
  plants: Plant[]
  profiles: Profile[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState({
    plant_id: plants[0]?.id ?? '',
    shift_type: 'morning',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '06:00',
    end_time: '14:00',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function togglePerson(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data: shift, error: shiftErr } = await supabase
      .from('shifts')
      .insert({ ...form, created_by: userId })
      .select('id')
      .single()

    if (shiftErr || !shift) {
      setError('Failed to create shift.')
      setLoading(false)
      return
    }

    if (selected.length > 0) {
      const assignments = selected.map(profile_id => ({
        shift_id: shift.id,
        profile_id,
      }))
      await supabase.from('shift_assignments').insert(assignments)
    }

    setOpen(false)
    setLoading(false)
    setSelected([])
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        + Create Shift
      </button>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">New Shift</h3>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Plant</label>
            <select
              value={form.plant_id}
              onChange={e => set('plant_id', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Shift Type</label>
            <select
              value={form.shift_type}
              onChange={e => set('shift_type', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={form.shift_date}
              onChange={e => set('shift_date', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start</label>
            <input
              type="time"
              value={form.start_time}
              onChange={e => set('start_time', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End</label>
            <input
              type="time"
              value={form.end_time}
              onChange={e => set('end_time', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Assign people */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Assign Personnel</label>
          <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
            {profiles.map(p => (
              <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => togglePerson(p.id)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-white">{p.full_name}</span>
                <span className="text-xs text-gray-500 ml-auto">{p.role}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Creating…' : 'Create Shift'}
        </button>
      </form>
    </div>
  )
}
