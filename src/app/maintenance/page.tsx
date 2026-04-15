import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/ui/AppShell'
import type { Profile } from '@/types'
import { Wrench } from 'lucide-react'
import MaintenanceDashboard from './MaintenanceDashboard'
import NewEquipmentForm from './NewEquipmentForm'
import NewTaskForm from './NewTaskForm'

export interface Equipment {
  id: string
  plant_id: string | null
  name: string
  code: string | null
  equipment_type: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  install_date: string | null
  last_service_date: string | null
  next_service_date: string | null
  condition: 'good' | 'fair' | 'poor' | 'critical' | 'offline'
  runtime_hours: number
  service_interval_hours: number | null
  notes: string | null
  is_active: boolean
  plants: { name: string; code: string } | null
}

export interface MaintenanceTask {
  id: string
  plant_id: string | null
  equipment_id: string | null
  title: string
  description: string | null
  task_type: 'preventive' | 'corrective' | 'inspection' | 'calibration' | 'cleaning'
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'
  scheduled_date: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  estimated_hours: number | null
  shift_id: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  equipment_registry: { name: string; code: string | null } | null
  plants: { name: string; code: string } | null
  assignee: { full_name: string } | null
}

export interface MaintenanceAlert {
  id: string
  plant_id: string | null
  equipment_id: string | null
  alert_type: string
  title: string
  message: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  is_resolved: boolean
  created_at: string
  equipment_registry: { name: string } | null
  plants: { name: string; code: string } | null
}

export interface UpcomingShift {
  id: string
  shift_date: string
  shift_type: string
  plant_id: string | null
  plants: { name: string; code: string } | null
  scheduled_hours: number   // hours already scheduled for maintenance
}

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')

  const today     = new Date()
  const in14days  = new Date(today.getTime() + 14 * 86400_000)
  const todayStr  = today.toISOString().slice(0, 10)
  const futureStr = in14days.toISOString().slice(0, 10)

  const [
    { data: equipmentRaw },
    { data: tasksRaw },
    { data: alertsRaw },
    { data: plants },
    { data: shiftsRaw },
  ] = await Promise.all([
    supabase
      .from('equipment_registry')
      .select('*, plants(name, code)')
      .eq('is_active', true)
      .order('plant_id')
      .order('name'),
    supabase
      .from('maintenance_tasks')
      .select(`
        id, plant_id, equipment_id, title, description, task_type, priority, status,
        scheduled_date, scheduled_start, scheduled_end, estimated_hours, shift_id,
        completed_at, notes, created_at,
        equipment_registry ( name, code ),
        plants ( name, code ),
        assignee:profiles!maintenance_tasks_assigned_to_fkey ( full_name )
      `)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('maintenance_alerts')
      .select('*, equipment_registry(name), plants(name, code)')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('plants')
      .select('id, name, code')
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('shifts')
      .select('id, shift_date, shift_type, plant_id, plants(name, code)')
      .gte('shift_date', todayStr)
      .lte('shift_date', futureStr)
      .order('shift_date'),
  ])

  const equipment  = (equipmentRaw  as unknown as Equipment[])  ?? []
  const tasks      = (tasksRaw      as unknown as MaintenanceTask[]) ?? []
  const alerts     = (alertsRaw     as unknown as MaintenanceAlert[]) ?? []

  // Build upcoming shifts with scheduled maintenance hours
  const upcomingShifts: UpcomingShift[] = (shiftsRaw ?? []).map(s => {
    const scheduledHours = tasks
      .filter(t => t.shift_id === s.id)
      .reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0)
    return { ...s, scheduled_hours: scheduledHours } as unknown as UpcomingShift
  })

  const canManage = ['admin', 'supervisor'].includes(profile.role)

  return (
    <AppShell profile={profile}>
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-bold text-lg text-white flex items-center gap-2">
            <Wrench size={18} className="text-orange-400" /> Predictive Maintenance
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Equipment health, scheduled tasks, and smart scheduling</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <NewTaskForm userId={user.id} plants={plants ?? []} equipment={equipment} />
            <NewEquipmentForm userId={user.id} plants={plants ?? []} />
          </div>
        )}
      </div>

      <MaintenanceDashboard
        equipment={equipment}
        tasks={tasks}
        alerts={alerts}
        upcomingShifts={upcomingShifts}
        plants={plants ?? []}
        canManage={canManage}
        userId={user.id}
      />
    </AppShell>
  )
}
