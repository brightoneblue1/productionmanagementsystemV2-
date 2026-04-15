'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'

const PRESETS = [
  { label: 'Off',  value: 0 },
  { label: '25%',  value: 0.25 },
  { label: '50%',  value: 0.50 },
  { label: '75%',  value: 0.75 },
  { label: '100%', value: 1.00 },
]

interface Props {
  tankId: string
  currentFactor: number
  flowRateLph: number
}

export default function PumpSpeedControl({ tankId, currentFactor, flowRateLph }: Props) {
  const router = useRouter()
  const [factor, setFactor] = useState(currentFactor)
  const [saving, setSaving] = useState(false)

  async function setSpeed(value: number) {
    if (value === factor) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('tanks').update({ pump_speed_factor: value }).eq('id', tankId)
    setFactor(value)
    setSaving(false)
    router.refresh()
  }

  const effectiveRate = flowRateLph * factor

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-gray-400">
          <Zap size={11} className={factor > 0 ? 'text-yellow-400' : 'text-gray-600'} />
          Pump
          {flowRateLph > 0 && effectiveRate > 0 && (
            <span className="text-gray-600 ml-1">· {effectiveRate.toLocaleString()} L/hr</span>
          )}
        </span>
        <span className="font-medium text-white">{Math.round(factor * 100)}%</span>
      </div>
      <div className="flex gap-1">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => setSpeed(p.value)}
            disabled={saving}
            className={`flex-1 text-xs py-1 rounded transition-colors disabled:opacity-50 ${
              factor === p.value
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
