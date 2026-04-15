import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Droplets, AlertTriangle, CheckCircle, XCircle, Clock, User, ArrowUpRight } from 'lucide-react'
import LogReadingButton from './LogReadingButton'
import LogFillButton from './LogFillButton'
import PumpSpeedControl from './PumpSpeedControl'
import AssignFillerSelect from './AssignFillerSelect'
import QuickRenameTank from './QuickRenameTank'
import QuickAddTank from './QuickAddTank'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'

interface Filler { id: string; full_name: string }

interface Tank {
  id: string
  name: string
  code: string
  capacity_liters: number
  current_level_liters: number
  product_type: string | null
  min_level_percent: number
  max_level_percent: number
  alert_low_percent: number
  alert_high_percent: number
  pump_flow_rate_lph: number
  pump_speed_factor: number
  assigned_filler_id: string | null
  is_active: boolean
}

interface TankFarm {
  id: string
  name: string
  code: string
  tanks: Tank[]
}

type TankStatus = 'critical' | 'low' | 'almost_empty' | 'normal' | 'almost_full' | 'high'

function getLevelPercent(tank: Tank): number {
  if (!tank.capacity_liters) return 0
  return Math.min(100, Math.round((tank.current_level_liters / tank.capacity_liters) * 100))
}

function getTankStatus(tank: Tank): TankStatus {
  const pct = getLevelPercent(tank)
  if (pct <= 5) return 'critical'
  if (pct < tank.min_level_percent) return 'low'
  if (pct > tank.max_level_percent) return 'high'
  if (pct < (tank.alert_low_percent ?? 25)) return 'almost_empty'
  if (pct > (tank.alert_high_percent ?? 80)) return 'almost_full'
  return 'normal'
}

function getETA(tank: Tank): string | null {
  if (!tank.pump_flow_rate_lph || !tank.pump_speed_factor) return null
  const effectiveRate = tank.pump_flow_rate_lph * tank.pump_speed_factor
  if (effectiveRate <= 0) return null
  const remaining = tank.capacity_liters - tank.current_level_liters
  if (remaining <= 0) return 'Tank full'
  const totalMins = Math.round((remaining / effectiveRate) * 60)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m to full`
  return `${h}h ${m}m to full`
}

const STATUS_STYLES: Record<TankStatus, { bar: string; badge: string; label: string }> = {
  critical:    { bar: 'bg-red-500',     badge: 'bg-red-500/20 text-red-400 border-red-500/30',         label: 'Critical'     },
  low:         { bar: 'bg-orange-400',  badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Low'          },
  almost_empty:{ bar: 'bg-yellow-500',  badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Almost Empty' },
  normal:      { bar: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Normal'    },
  almost_full: { bar: 'bg-sky-400',     badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',          label: 'Almost Full'  },
  high:        { bar: 'bg-blue-500',    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',        label: 'High'         },
}

function TankCard({
  tank,
  userId,
  userRole,
  fillers,
}: {
  tank: Tank
  userId: string
  userRole: string
  fillers: Filler[]
}) {
  const pct = getLevelPercent(tank)
  const status = getTankStatus(tank)
  const styles = STATUS_STYLES[status]
  const eta = getETA(tank)
  const isMyTank = tank.assigned_filler_id === userId
  const assignedFiller = fillers.find(f => f.id === tank.assigned_filler_id) ?? null
  const canManage = ['admin', 'supervisor'].includes(userRole)
  const canOperate = userRole !== 'kapa'

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 flex flex-col gap-3 ${
      isMyTank ? 'border-orange-500/40' : 'border-gray-800'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            {canManage
              ? <QuickRenameTank tank={{ id: tank.id, name: tank.name, code: tank.code, product_type: tank.product_type }} />
              : (
                <>
                  <p className="font-medium text-sm text-white">{tank.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tank.code}{tank.product_type ? ` · ${tank.product_type}` : ''}
                  </p>
                </>
              )}
            {isMyTank && !canManage && (
              <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0 rounded-full shrink-0">
                Mine
              </span>
            )}
          </div>
          {canManage && isMyTank && (
            <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0 rounded-full mt-1 inline-block">
              Mine
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.badge}`}>
            {styles.label}
          </span>
          <Link
            href={`/tanks/${tank.id}`}
            className="text-gray-600 hover:text-gray-300 transition-colors"
            title="View tank details"
          >
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* Level bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{pct}%</span>
          <span>{tank.current_level_liters.toLocaleString()} L</span>
        </div>
        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${styles.bar}`}
            style={{ width: `${pct}%` }}
          />
          {/* Alert threshold markers */}
          {tank.alert_low_percent > 0 && (
            <div
              className="absolute top-0 h-full w-px bg-yellow-500/50"
              style={{ left: `${tank.alert_low_percent}%` }}
            />
          )}
          {tank.alert_high_percent < 100 && (
            <div
              className="absolute top-0 h-full w-px bg-sky-500/50"
              style={{ left: `${tank.alert_high_percent}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0</span>
          <span>{tank.capacity_liters.toLocaleString()} L</span>
        </div>
      </div>

      {/* Threshold + ETA row */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Min {tank.min_level_percent}% · Max {tank.max_level_percent}%</span>
        {eta && (
          <span className="flex items-center gap-1 text-emerald-400">
            <Clock size={10} /> {eta}
          </span>
        )}
      </div>

      {/* Early alert messages */}
      {status === 'almost_empty' && (
        <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2.5 py-1.5">
          ⚠ Approaching minimum — schedule a fill soon
        </p>
      )}
      {status === 'almost_full' && (
        <p className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-lg px-2.5 py-1.5">
          ↑ Approaching capacity — monitor closely
        </p>
      )}
      {status === 'critical' && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
          🔴 Critical level — immediate action required
        </p>
      )}

      {/* Assigned filler (display or manage) */}
      {canManage ? (
        <AssignFillerSelect
          tankId={tank.id}
          currentFillerId={tank.assigned_filler_id}
          fillers={fillers}
        />
      ) : assignedFiller ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <User size={11} />
          <span>{assignedFiller.full_name}</span>
        </div>
      ) : null}

      {/* Pump speed control */}
      {canOperate && (
        <PumpSpeedControl
          tankId={tank.id}
          currentFactor={tank.pump_speed_factor ?? 1}
          flowRateLph={tank.pump_flow_rate_lph ?? 0}
        />
      )}

      <LogReadingButton tank={tank} userId={userId} />
      <LogFillButton tank={tank} userId={userId} />
    </div>
  )
}

function FarmSection({
  farm,
  userId,
  userRole,
  fillers,
}: {
  farm: TankFarm
  userId: string
  userRole: string
  fillers: Filler[]
}) {
  const activeTanks = farm.tanks.filter(t => t.is_active)
  const alerts = activeTanks.filter(t => getTankStatus(t) !== 'normal').length

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Droplets size={16} className="text-blue-400" />
          <h2 className="font-semibold text-white">{farm.name}</h2>
          <span className="text-xs text-gray-500">({farm.code})</span>
        </div>
        {alerts > 0 ? (
          <span className="flex items-center gap-1 text-xs text-orange-400">
            <AlertTriangle size={12} />
            {alerts} alert{alerts > 1 ? 's' : ''}
          </span>
        ) : activeTanks.length > 0 ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle size={12} />
            All normal
          </span>
        ) : null}
      </div>

      {activeTanks.length === 0
        ? <p className="text-gray-600 text-sm">No tanks configured.</p>
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeTanks.map(tank => (
              <TankCard
                key={tank.id}
                tank={tank}
                userId={userId}
                userRole={userRole}
                fillers={fillers}
              />
            ))}
          </div>
        )}

      {['admin', 'supervisor'].includes(userRole) && (
        <div className="mt-3">
          <QuickAddTank farmId={farm.id} farmName={farm.name} />
        </div>
      )}
    </div>
  )
}

export default async function TanksPage({
  searchParams,
}: {
  searchParams: Promise<{ plant?: string }>
}) {
  const supabase = await createClient()
  const { plant: plantCode } = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')

  // Resolve plant filter
  let plantName: string | null = null
  let plantId:   string | null = null
  if (plantCode) {
    const { data: plant } = await supabase
      .from('plants').select('id, name').eq('code', plantCode).single()
    if (plant) { plantId = plant.id; plantName = plant.name }
  }

  let farmsQuery = supabase
    .from('tank_farms')
    .select(`
      id, name, code,
      tanks (
        id, name, code, capacity_liters, current_level_liters,
        product_type, min_level_percent, max_level_percent,
        alert_low_percent, alert_high_percent,
        pump_flow_rate_lph, pump_speed_factor,
        assigned_filler_id, is_active
      )
    `)
    .order('code')

  if (plantId) farmsQuery = farmsQuery.eq('plant_id', plantId)

  const [{ data: farms, error }, { data: fillers }] = await Promise.all([
    farmsQuery,
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['tank_filler', 'operator', 'admin', 'supervisor'])
      .eq('is_active', true),
  ])

  const totalTanks = farms?.flatMap(f => (f as unknown as TankFarm).tanks) ?? []
  const alertCount = totalTanks.filter(t => getTankStatus(t as Tank) !== 'normal').length

  const heading = plantName ?? 'All Plants'

  return (
    <AppShell profile={profile}>
      <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
        <h1 className="font-bold text-lg text-white">{heading}</h1>
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
            <FarmSection
              key={farm.id}
              farm={farm as unknown as TankFarm}
              userId={user.id}
              userRole={profile.role}
              fillers={fillers ?? []}
            />
          ))
        )}
      </main>
    </AppShell>
  )
}
