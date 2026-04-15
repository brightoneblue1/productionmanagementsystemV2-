'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

export interface TrendDay {
  date: string          // "14 Apr"
  gross: number
  spillage: number
  nonConforming: number
  net: number
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-medium">{p.value.toLocaleString()} L</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendGraph({ data }: { data: TrendDay[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
        No shift report data yet — submit your first shift report to see trends.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
        />
        <Line
          type="monotone"
          dataKey="gross"
          name="Gross Production"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#f97316' }}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net Production"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#10b981' }}
        />
        <Line
          type="monotone"
          dataKey="spillage"
          name="Spillage"
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, fill: '#ef4444' }}
        />
        <Line
          type="monotone"
          dataKey="nonConforming"
          name="Non-Conforming"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, fill: '#f59e0b' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
