'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Stat {
  label: string
  value: number
  sub: string | null
  href: string
  color: string
  valueColor: string
}

export default function LiveStats({ initial }: { initial: Stat[] }) {
  const [stats, setStats] = useState<Stat[]>(initial)

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      const [
        { count: openProblems },
        { count: criticalProblems },
        { data: tanks },
        { count: pendingReports },
      ] = await Promise.all([
        supabase.from('problems').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('problems').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('severity', 'critical'),
        supabase.from('tanks').select('current_level_liters, capacity_liters, min_level_percent, max_level_percent').eq('is_active', true),
        supabase.from('lab_reports').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      ])

      const tanksAtRisk = (tanks ?? []).filter(t => {
        if (!t.capacity_liters) return false
        const pct = (t.current_level_liters / t.capacity_liters) * 100
        return pct < t.min_level_percent || pct > t.max_level_percent
      }).length

      setStats(prev => prev.map(s => {
        if (s.label === 'Open Problems') return {
          ...s,
          value: openProblems ?? 0,
          sub: criticalProblems ? `${criticalProblems} critical` : 'none critical',
          color: (openProblems ?? 0) > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-gray-800',
          valueColor: (openProblems ?? 0) > 0 ? 'text-red-400' : 'text-white',
        }
        if (s.label === 'Tanks at Risk') return {
          ...s,
          value: tanksAtRisk,
          sub: tanksAtRisk > 0 ? 'outside safe range' : 'all within range',
          color: tanksAtRisk > 0 ? 'border-orange-500/40 bg-orange-500/5' : 'border-gray-800',
          valueColor: tanksAtRisk > 0 ? 'text-orange-400' : 'text-white',
        }
        if (s.label === 'Pending Reports') return {
          ...s,
          value: pendingReports ?? 0,
          sub: pendingReports ? 'awaiting approval' : 'none pending',
          color: (pendingReports ?? 0) > 0 ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-gray-800',
          valueColor: (pendingReports ?? 0) > 0 ? 'text-yellow-400' : 'text-white',
        }
        return s
      }))
    }

    // Subscribe to relevant table changes
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'problems' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tank_readings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_reports' }, refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map(stat => (
        <Link
          key={stat.label}
          href={stat.href}
          className={`border rounded-xl p-4 flex flex-col gap-1 hover:brightness-110 transition-all ${stat.color}`}
        >
          <span className={`text-2xl font-bold tabular-nums ${stat.valueColor}`}>{stat.value}</span>
          <span className="text-xs font-medium text-white leading-tight">{stat.label}</span>
          {stat.sub && <span className="text-xs text-gray-500">{stat.sub}</span>}
        </Link>
      ))}
    </div>
  )
}
