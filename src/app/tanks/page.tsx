import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Droplets, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import LogReadingButton from './LogReadingButton'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'

interface Tank {
  id: string
  name: string
  code: string
  capacity_liters: number
  current_level_liters: number
  product_type: string | null
  min_level_percent: number
  max_level_percent: number
  is_active: boolean
}

interface TankFarm {
  id: string
  name: string
  code: string
  tanks: Tank[]
}

function getLevelPercent(tank: Tank): number {
  if (!tank.capacity_liters) return 0
  return Math.min(100, Math.round((tank.current_level_liters / tank.capacity_liters) * 100))
}

function getTankStatus(tank: Tank): 'critical' | 'low' | 'normal' | 'high' {
  const pct = getLevelPercent(tank)
  if (pct <= 5) return 'critical'
  if (pct < tank.min_level_percent) return 'low'
  if (pct > tank.max_level_percent) return 'high'
  return 'normal'
}

const STATUS_STYLES = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-500/20 text-red-400 border-red-500/30',    label: 'Critical' },
  low:      { bar: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Low' },
  normal:   { bar: 'bg-emerald-500',badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Normal' },
  high:     { bar: 'bg-blue-400',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   label: 'High' },
}

function TankCard({ tank, userId }: { tank: Tank; userId: string }) {
  const pct = getLevelPercent(tank)
  const status = getTankStatus(tank)
  const styles = STATUS_STYLES[status]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm text-white">{tank.name}</p>
          <p className="text-xs text-gray-500">{tank.code}{tank.product_type ? ` · ${tank.product_type}` : ''}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.badge}`}>
          {styles.label}
        </span>
      </div>

      {/* Level bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{pct}%</span>
          <span>{tank.current_level_liters.toLocaleString()} L</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${styles.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0</span>
          <span>{tank.capacity_liters.toLocaleString()} L</span>
        </div>
      </div>

      {/* Min/max markers info */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span>Min: {tank.min_level_percent}%</span>
        <span>Max: {tank.max_level_percent}%</span>
      </div>

      <LogReadingButton tank={tank} userId={userId} />
    </div>
  )
}

function FarmSection({ farm, userId }: { farm: TankFarm; userId: string }) {
  const alerts = farm.tanks.filter(t => getTankStatus(t) !== 'normal').length
  const activeTanks = farm.tanks.filter(t => t.is_active)

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Droplets size={16} className="text-blue-400" />
          <h2 className="font-semibold text-white">{farm.name}</h2>
          <span className="text-xs text-gray-500">({farm.code})</span>
        </div>
        {alerts > 0 && (
          <span className="flex items-center gap-1 text-xs text-orange-400">
            <AlertTriangle size={12} />
            {alerts} alert{alerts > 1 ? 's' : ''}
          </span>
        )}
        {alerts === 0 && activeTanks.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle size={12} />
            All normal
          </span>
        )}
      </div>

      {activeTanks.length === 0 ? (
        <p className="text-gray-600 text-sm">No tanks configured.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {activeTanks.map(tank => (
            <TankCard key={tank.id} tank={tank} userId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}

export default async function TanksPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')

  const { data: farms, error } = await supabase
    .from('tank_farms')
    .select(`
      id, name, code,
      tanks (
        id, name, code, capacity_liters, current_level_liters,
        product_type, min_level_percent, max_level_percent, is_active
      )
    `)
    .order('code')

  const totalTanks = farms?.flatMap(f => (f as unknown as TankFarm).tanks) ?? []
  const alertCount = totalTanks.filter(t => getTankStatus(t as Tank) !== 'normal').length

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-3">
        <h1 className="font-semibold text-base">Tank Farm Monitor</h1>
        {alertCount > 0 ? (
          <span className="flex items-center gap-1.5 text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded-full">
            <AlertTriangle size={11} />{alertCount} alert{alertCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <CheckCircle size={11} />All normal
          </span>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-6 text-sm">
            <XCircle size={16} />Failed to load tank data.
          </div>
        )}
        {!farms || farms.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Droplets size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">No tank farms found</p>
            <p className="text-sm">Add plants and tanks in Supabase to see them here.</p>
          </div>
        ) : (
          farms.map(farm => (
            <FarmSection key={farm.id} farm={farm as unknown as TankFarm} userId={user.id} />
          ))
        )}
      </main>
    </AppShell>
  )
}
