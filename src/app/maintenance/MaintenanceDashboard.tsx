'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertTriangle, Wrench, Clock, CheckCircle2, XCircle, Zap,
  Calendar, ChevronRight, Activity, BarChart3, ShieldAlert,
  RefreshCw, CircleDot, MinusCircle,
} from 'lucide-react'
import type { Equipment, MaintenanceTask, MaintenanceAlert, UpcomingShift } from './page'

interface Plant { id: string; name: string; code: string }

type Tab = 'overview' | 'equipment' | 'alerts' | 'preventive'

const CONDITION_META: Record<string, { label: string; color: string; bar: string; dot: string }> = {
  good:     { label: 'Good',     color: 'text-emerald-400', bar: 'bg-emerald-500', dot: 'bg-emerald-400' },
  fair:     { label: 'Fair',     color: 'text-amber-400',   bar: 'bg-amber-500',   dot: 'bg-amber-400'   },
  poor:     { label: 'Poor',     color: 'text-orange-400',  bar: 'bg-orange-500',  dot: 'bg-orange-400'  },
  critical: { label: 'Critical', color: 'text-red-400',     bar: 'bg-red-500',     dot: 'bg-red-400'     },
  offline:  { label: 'Offline',  color: 'text-gray-500',    bar: 'bg-gray-600',    dot: 'bg-gray-500'    },
}

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  low:      { label: 'Low',      badge: 'bg-gray-700/60 text-gray-400 border-gray-600'         },
  medium:   { label: 'Medium',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'    },
  high:     { label: 'High',     badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  critical: { label: 'Critical', badge: 'bg-red-500/20 text-red-300 border-red-500/30'          },
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending:     { label: 'Pending',     badge: 'bg-gray-700/60 text-gray-400 border-gray-600'           },
  scheduled:   { label: 'Scheduled',   badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'         },
  in_progress: { label: 'In Progress', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'      },
  completed:   { label: 'Completed',   badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'},
  overdue:     { label: 'Overdue',     badge: 'bg-red-500/20 text-red-300 border-red-500/30'            },
  cancelled:   { label: 'Cancelled',   badge: 'bg-gray-700/60 text-gray-400 border-gray-600'           },
}

const TYPE_LABELS: Record<string, string> = {
  preventive:  'Preventive',
  corrective:  'Corrective',
  inspection:  'Inspection',
  calibration: 'Calibration',
  cleaning:    'Cleaning',
}

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function isOverdue(task: MaintenanceTask): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false
  if (!task.scheduled_date) return false
  return new Date(task.scheduled_date) < new Date(new Date().toDateString())
}

export default function MaintenanceDashboard({
  equipment, tasks, alerts, upcomingShifts, plants, canManage, userId,
}: {
  equipment: Equipment[]
  tasks: MaintenanceTask[]
  alerts: MaintenanceAlert[]
  upcomingShifts: UpcomingShift[]
  plants: Plant[]
  canManage: boolean
  userId: string
}) {
  const [tab, setTab]       = useState<Tab>('overview')
  const [busy, setBusy]     = useState<string | null>(null)

  // Computed stats
  const criticalAlerts  = alerts.filter(a => a.severity === 'critical').length
  const highPriority    = tasks.filter(t => t.priority === 'high' || t.priority === 'critical').filter(t => t.status !== 'completed').length
  const activeCount     = tasks.filter(t => t.status === 'in_progress').length
  const poorCondition   = equipment.filter(e => e.condition === 'poor' || e.condition === 'critical' || e.condition === 'offline').length
  const overdueCount    = tasks.filter(isOverdue).length
  const upcomingCount   = tasks.filter(t =>
    t.scheduled_date &&
    new Date(t.scheduled_date) >= new Date() &&
    new Date(t.scheduled_date) <= new Date(Date.now() + 7 * 86400_000) &&
    t.status !== 'completed'
  ).length

  // Condition breakdown
  const conditionCounts = ['good', 'fair', 'poor', 'critical', 'offline'].map(c => ({
    condition: c,
    count: equipment.filter(e => e.condition === c).length,
  }))
  const totalEquip = equipment.length || 1

  async function resolveAlert(alertId: string) {
    setBusy(alertId)
    await createClient().from('maintenance_alerts').update({
      is_resolved: true, resolved_by: userId, resolved_at: new Date().toISOString(),
    }).eq('id', alertId)
    setBusy(null)
    window.location.reload()
  }

  async function updateTaskStatus(taskId: string, status: string, extra?: Record<string, unknown>) {
    setBusy(taskId)
    await createClient().from('maintenance_tasks').update({
      status,
      ...(status === 'completed' ? { completed_by: userId, completed_at: new Date().toISOString() } : {}),
      ...extra,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId)
    setBusy(null)
    window.location.reload()
  }

  async function scheduleTask(taskId: string, shiftId: string, shiftDate: string) {
    setBusy(taskId)
    await createClient().from('maintenance_tasks').update({
      shift_id: shiftId,
      scheduled_date: shiftDate,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    }).eq('id', taskId)
    setBusy(null)
    window.location.reload()
  }

  const upcomingTasks = tasks
    .filter(t => t.scheduled_date && new Date(t.scheduled_date) >= new Date() && t.status !== 'completed')
    .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
    .slice(0, 8)

  const pendingUnscheduled = tasks
    .filter(t => t.status === 'pending' && !t.shift_id)
    .sort((a, b) => {
      const pOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9)
    })

  // Smart schedule suggestions: shifts that have capacity + pending tasks that need scheduling
  const shiftSuggestions = upcomingShifts
    .filter(s => s.scheduled_hours < 6)   // shifts with < 6 hours already booked
    .slice(0, 4)

  const TAB_CONFIG: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'equipment',  label: 'Equipment',   count: equipment.length },
    { id: 'alerts',     label: 'Alerts',      count: alerts.length },
    { id: 'preventive', label: 'Tasks',        count: tasks.filter(t => t.status !== 'completed').length },
  ]

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Critical Alerts', value: criticalAlerts,  icon: <ShieldAlert size={15} className="text-red-400" />,     hi: criticalAlerts > 0 },
          { label: 'High Priority',   value: highPriority,    icon: <AlertTriangle size={15} className="text-orange-400" />, hi: highPriority > 0   },
          { label: 'Active Tasks',    value: activeCount,     icon: <Activity size={15} className="text-blue-400" />,        hi: false              },
          { label: 'Poor Condition',  value: poorCondition,   icon: <Zap size={15} className="text-amber-400" />,            hi: poorCondition > 0  },
          { label: 'Overdue',         value: overdueCount,    icon: <Clock size={15} className="text-red-400" />,            hi: overdueCount > 0   },
          { label: 'Next 7 Days',     value: upcomingCount,   icon: <Calendar size={15} className="text-emerald-400" />,     hi: false              },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.hi ? 'border-red-500/30 bg-red-500/5' : 'border-gray-800 bg-gray-900'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{card.label}</span>
              {card.icon}
            </div>
            <p className={`text-2xl font-bold font-mono ${card.hi ? 'text-red-300' : 'text-white'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {TAB_CONFIG.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              tab === t.id
                ? 'border-orange-500 text-white'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}>
            {t.label}
            {t.count != null && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-800 text-gray-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: condition bars + upcoming */}
          <div className="lg:col-span-2 space-y-6">
            {/* Equipment by condition */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <BarChart3 size={15} className="text-orange-400" /> Equipment by Condition
              </h3>
              {equipment.length === 0 ? (
                <p className="text-sm text-gray-600">No equipment registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {conditionCounts.map(({ condition, count }) => {
                    const meta = CONDITION_META[condition]
                    const pct  = Math.round((count / totalEquip) * 100)
                    return (
                      <div key={condition}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs text-gray-500">{count} unit{count !== 1 ? 's' : ''} · {pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${meta.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Upcoming maintenance */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-orange-400" /> Upcoming Maintenance — Next 7 Days
              </h3>
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-gray-600">No maintenance scheduled for the next 7 days.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${CONDITION_META[t.priority === 'critical' ? 'critical' : t.priority === 'high' ? 'poor' : 'fair'].dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{t.title}</p>
                        <p className="text-xs text-gray-500">
                          {t.plants?.code && <span>{t.plants.code} · </span>}
                          {t.equipment_registry?.name && <span>{t.equipment_registry.name} · </span>}
                          {t.scheduled_date && fmtDate(t.scheduled_date)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_META[t.priority]?.badge}`}>
                        {PRIORITY_META[t.priority]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Smart scheduler */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                <Zap size={15} className="text-orange-400" /> Smart Scheduler
              </h3>
              <p className="text-xs text-gray-500 mb-4">Fill shift downtime gaps with pending tasks</p>

              {pendingUnscheduled.length === 0 ? (
                <p className="text-xs text-gray-600">No unscheduled tasks pending.</p>
              ) : shiftSuggestions.length === 0 ? (
                <p className="text-xs text-gray-600">No upcoming shifts with available capacity found.</p>
              ) : (
                <div className="space-y-4">
                  {shiftSuggestions.map(shift => {
                    const availableHours = 8 - shift.scheduled_hours
                    const suggestedTasks = pendingUnscheduled
                      .filter(t => !t.shift_id && (t.estimated_hours ?? 2) <= availableHours)
                      .slice(0, 3)

                    return (
                      <div key={shift.id} className="border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs font-semibold text-white">{fmtDate(shift.shift_date)}</p>
                            <p className="text-xs text-gray-500">
                              {shift.plants?.code} · {shift.shift_type} ·{' '}
                              <span className="text-emerald-400">{availableHours.toFixed(1)}h available</span>
                            </p>
                          </div>
                        </div>
                        {suggestedTasks.length === 0 ? (
                          <p className="text-xs text-gray-600">No tasks fit this window.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {suggestedTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between gap-2 bg-gray-800 rounded px-2 py-1.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-white truncate">{task.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {task.estimated_hours ? `${task.estimated_hours}h est.` : 'Est. unknown'}
                                    {' · '}<span className={PRIORITY_META[task.priority]?.badge.includes('red') ? 'text-red-400' : 'text-gray-400'}>{PRIORITY_META[task.priority]?.label}</span>
                                  </p>
                                </div>
                                {canManage && (
                                  <button
                                    onClick={() => scheduleTask(task.id, shift.id, shift.shift_date)}
                                    disabled={busy === task.id}
                                    className="text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded px-2 py-1 transition-colors disabled:opacity-50 shrink-0">
                                    Schedule
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Active alerts summary */}
            {alerts.length > 0 && (
              <div className="bg-gray-900 border border-red-500/20 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                  <ShieldAlert size={15} /> Active Alerts ({alerts.length})
                </h3>
                <div className="space-y-2">
                  {alerts.slice(0, 4).map(a => (
                    <div key={a.id} className="text-xs py-1.5 border-b border-gray-800 last:border-0">
                      <p className="text-white">{a.title}</p>
                      <p className="text-gray-500">{a.equipment_registry?.name ?? a.plants?.code ?? '—'}</p>
                    </div>
                  ))}
                  {alerts.length > 4 && (
                    <button onClick={() => setTab('alerts')} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 mt-1">
                      View all <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EQUIPMENT TAB ── */}
      {tab === 'equipment' && (
        <div>
          {equipment.length === 0 ? (
            <div className="text-center py-16 text-gray-600 bg-gray-900 border border-gray-800 rounded-xl">
              <Wrench size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No equipment registered.</p>
              {canManage && <p className="text-xs mt-1 text-gray-700">Use "Add Equipment" to register your first unit.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {equipment.map(eq => {
                const cMeta = CONDITION_META[eq.condition]
                return (
                  <div key={eq.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-white">{eq.name}</span>
                          {eq.code && <span className="text-xs text-gray-500 font-mono">{eq.code}</span>}
                          <span className={`text-xs font-medium flex items-center gap-1 ${cMeta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cMeta.dot}`} />
                            {cMeta.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {eq.plants?.code && <span>{eq.plants.code} · </span>}
                          {eq.equipment_type}
                          {eq.manufacturer && <span> · {eq.manufacturer}</span>}
                          {eq.model && <span> {eq.model}</span>}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {eq.runtime_hours > 0 && (
                            <span className="text-xs text-gray-500">
                              <span className="text-gray-400">{eq.runtime_hours.toLocaleString()}h</span> runtime
                            </span>
                          )}
                          {eq.last_service_date && (
                            <span className="text-xs text-gray-500">
                              Last service: <span className="text-gray-400">{fmt(eq.last_service_date)}</span>
                            </span>
                          )}
                          {eq.next_service_date && (
                            <span className={`text-xs ${new Date(eq.next_service_date) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                              Next service: <span className="font-medium">{fmt(eq.next_service_date)}</span>
                            </span>
                          )}
                        </div>
                        {eq.notes && <p className="text-xs text-gray-600 mt-1.5">{eq.notes}</p>}
                      </div>
                      {canManage && (
                        <ConditionSelector equipmentId={eq.id} current={eq.condition} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {tab === 'alerts' && (
        <div>
          {alerts.length === 0 ? (
            <div className="text-center py-16 text-gray-600 bg-gray-900 border border-gray-800 rounded-xl">
              <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No active alerts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => {
                const pMeta = PRIORITY_META[a.severity]
                return (
                  <div key={a.id} className={`bg-gray-900 border rounded-xl p-4 ${a.severity === 'critical' ? 'border-red-500/30' : a.severity === 'high' ? 'border-orange-500/30' : 'border-gray-800'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${pMeta?.badge}`}>{pMeta?.label}</span>
                          <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
                            {a.alert_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="font-semibold text-white">{a.title}</p>
                        {a.message && <p className="text-sm text-gray-400 mt-0.5">{a.message}</p>}
                        <p className="text-xs text-gray-600 mt-1">
                          {a.equipment_registry?.name && <span>{a.equipment_registry.name} · </span>}
                          {a.plants?.code && <span>{a.plants.code} · </span>}
                          {fmt(a.created_at)}
                        </p>
                      </div>
                      {canManage && (
                        <button onClick={() => resolveAlert(a.id)} disabled={busy === a.id}
                          className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors shrink-0">
                          <CheckCircle2 size={13} /> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PREVENTIVE / TASKS TAB ── */}
      {tab === 'preventive' && (
        <div>
          {tasks.filter(t => t.status !== 'completed').length === 0 ? (
            <div className="text-center py-16 text-gray-600 bg-gray-900 border border-gray-800 rounded-xl">
              <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No open tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').map(t => {
                const pMeta    = PRIORITY_META[t.priority]
                const sMeta    = STATUS_META[t.status]
                const overdue  = isOverdue(t)
                return (
                  <div key={t.id} className={`bg-gray-900 border rounded-xl p-4 ${
                    overdue ? 'border-red-500/30 bg-red-500/5' : 'border-gray-800'
                  }`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${pMeta?.badge}`}>{pMeta?.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${sMeta?.badge}`}>{sMeta?.label}</span>
                          <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
                            {TYPE_LABELS[t.task_type] ?? t.task_type}
                          </span>
                          {overdue && (
                            <span className="text-xs text-red-400 font-semibold">OVERDUE</span>
                          )}
                        </div>
                        <p className="font-semibold text-white">{t.title}</p>
                        {t.description && <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{t.description}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          {t.plants?.code && <span>{t.plants.code} · </span>}
                          {t.equipment_registry?.name && <span>{t.equipment_registry.name} · </span>}
                          {t.scheduled_date && <span>Scheduled {fmtDate(t.scheduled_date)} · </span>}
                          {t.estimated_hours && <span>{t.estimated_hours}h est.</span>}
                        </p>
                        {t.assignee?.full_name && (
                          <p className="text-xs text-gray-600 mt-0.5">Assigned to {t.assignee.full_name}</p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {(t.status === 'pending' || t.status === 'scheduled') && (
                            <button onClick={() => updateTaskStatus(t.id, 'in_progress')} disabled={busy === t.id}
                              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors">
                              <RefreshCw size={12} /> Start
                            </button>
                          )}
                          {t.status === 'in_progress' && (
                            <button onClick={() => updateTaskStatus(t.id, 'completed')} disabled={busy === t.id}
                              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors">
                              <CheckCircle2 size={12} /> Complete
                            </button>
                          )}
                          <button onClick={() => updateTaskStatus(t.id, 'cancelled')} disabled={busy === t.id}
                            className="flex items-center gap-1.5 text-xs bg-gray-700/50 hover:bg-gray-700 text-gray-400 rounded-lg px-3 py-1.5 font-semibold transition-colors">
                            <XCircle size={12} /> Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Inline condition selector (no modal needed — just a dropdown)
function ConditionSelector({ equipmentId, current }: { equipmentId: string; current: string }) {
  const [busy, setBusy] = useState(false)

  async function change(condition: string) {
    setBusy(true)
    await createClient().from('equipment_registry').update({
      condition, updated_at: new Date().toISOString(),
    }).eq('id', equipmentId)
    setBusy(false)
    window.location.reload()
  }

  return (
    <select
      value={current}
      onChange={e => change(e.target.value)}
      disabled={busy}
      className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-gray-500 disabled:opacity-50"
    >
      {Object.entries(CONDITION_META).map(([val, m]) => (
        <option key={val} value={val}>{m.label}</option>
      ))}
    </select>
  )
}
