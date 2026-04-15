'use client'

import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'

interface Reading {
  read_at: string
  reading_liters: number
}

interface Props {
  readings: Reading[]
  capacity: number
  minLevelPercent: number
  maxLevelPercent: number
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  const liters = payload[0].value
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-medium">{liters.toLocaleString()} L</p>
    </div>
  )
}

export default function TankLevelChart({ readings, capacity, minLevelPercent, maxLevelPercent }: Props) {
  if (!readings.length) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-600 text-sm">
        No readings recorded yet.
      </div>
    )
  }

  const data = [...readings].reverse().map(r => ({
    time: new Date(r.read_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    liters: r.reading_liters,
  }))

  const minLine = capacity ? Math.round((minLevelPercent / 100) * capacity) : null
  const maxLine = capacity ? Math.round((maxLevelPercent / 100) * capacity) : null

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="levelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={40}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          domain={[0, capacity || 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        {minLine !== null && (
          <ReferenceLine y={minLine} stroke="#f97316" strokeDasharray="4 3" strokeOpacity={0.5}
            label={{ value: 'Min', fontSize: 9, fill: '#f97316', position: 'insideTopRight' }} />
        )}
        {maxLine !== null && (
          <ReferenceLine y={maxLine} stroke="#60a5fa" strokeDasharray="4 3" strokeOpacity={0.5}
            label={{ value: 'Max', fontSize: 9, fill: '#60a5fa', position: 'insideTopRight' }} />
        )}
        <Area
          type="monotone" dataKey="liters" stroke="#f97316" strokeWidth={2}
          fill="url(#levelGrad)" dot={false} activeDot={{ r: 4, fill: '#f97316' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
