'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlusCircle, X } from 'lucide-react'

interface Props {
  tank: {
    id: string
    name: string
    code: string
    capacity_liters: number
    current_level_liters: number
  }
  userId: string
}

export default function LogReadingButton({ tank, userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [liters, setLiters] = useState(String(tank.current_level_liters))
  const [temp, setTemp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pct = Math.min(100, Math.round((parseFloat(liters) || 0) / tank.capacity_liters * 100))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(liters)
    if (isNaN(val) || val < 0 || val > tank.capacity_liters) {
      setError(`Enter a value between 0 and ${tank.capacity_liters.toLocaleString()}`)
      return
    }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('tank_readings').insert({
      tank_id: tank.id,
      level_liters: val,
      level_percent: pct,
      temperature_celsius: temp ? parseFloat(temp) : null,
      recorded_by: userId,
    })
    if (err) {
      setError('Failed to save reading.')
      setLoading(false)
      return
    }
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 border border-gray-800 hover:border-blue-500/40 rounded-lg py-1.5 transition-colors"
      >
        <PlusCircle size={12} /> Log Reading
      </button>
    )
  }

  return (
    <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-blue-400">Log Reading — {tank.code}</span>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
          <X size={13} />
        </button>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Level (liters) — {pct}% of {tank.capacity_liters.toLocaleString()} L
          </label>
          <input
            type="number"
            required
            min={0}
            max={tank.capacity_liters}
            step="any"
            value={liters}
            onChange={e => setLiters(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {/* Mini level preview */}
          <div className="mt-1.5 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Temp °C (optional)</label>
          <input
            type="number"
            step="any"
            value={temp}
            onChange={e => setTemp(e.target.value)}
            placeholder="e.g. 42"
            className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded transition-colors"
        >
          {loading ? 'Saving…' : 'Save Reading'}
        </button>
      </form>
    </div>
  )
}
