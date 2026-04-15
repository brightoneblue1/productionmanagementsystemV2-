'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, ClipboardList, Plus, X, CheckCircle2, PlayCircle, SkipForward } from 'lucide-react'

export interface ShiftJob {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped'
  due_time: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  assigned_worker: { full_name: string; role: string } | null
  creator: { full_name: string } | null
}

interface Profile { id: string; full_name: string; role: string }

const PRIORITY_META = {
  low:    { label: 'Low',    dot: 'bg-gray-500',    badge: 'text-gray-400'   },
  normal: { label: 'Normal', dot: 'bg-blue-500',    badge: 'text-blue-400'   },
  high:   { label: 'High',   dot: 'bg-orange-500',  badge: 'text-orange-400' },
  urgent: { label: 'Urgent', dot: 'bg-red-500',     badge: 'text-red-400'    },
}

const STATUS_META = {
  assigned:    { label: 'Assigned',    badge: 'bg-gray-700/60 text-gray-400 border-gray-600'           },
  in_progress: { label: 'In Progress', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'         },
  completed:   { label: 'Done',        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  skipped:     { label: 'Skipped',     badge: 'bg-gray-700/40 text-gray-600 border-gray-700'            },
}

function fmtTime(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m}${hr < 12 ? 'am' : 'pm'}`
}

export default function ShiftJobsPanel({
  shiftId,
  jobs: initialJobs,
  profiles,
  canManage,
  userId,
}: {
  shiftId: string
  jobs: ShiftJob[]
  profiles: Profile[]
  canManage: boolean
  userId: string
}) {
  const [open, setOpen]       = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [jobs, setJobs]       = useState<ShiftJob[]>(initialJobs)
  const [busy, setBusy]       = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    title:       '',
    description: '',
    assigned_to: '',
    priority:    'normal',
    due_time:    '',
    notes:       '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const activeCount   = jobs.filter(j => j.status !== 'completed' && j.status !== 'skipped').length
  const doneCount     = jobs.filter(j => j.status === 'completed').length

  async function updateJob(jobId: string, patch: Record<string, unknown>) {
    setBusy(jobId)
    const supabase = createClient()
    await supabase.from('shift_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', jobId)
    // Refresh local state optimistically
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...patch } as ShiftJob : j))
    setBusy(null)
  }

  async function deleteJob(jobId: string) {
    setBusy(jobId)
    await createClient().from('shift_jobs').delete().eq('id', jobId)
    setJobs(prev => prev.filter(j => j.id !== jobId))
    setBusy(null)
  }

  async function addJob(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('shift_jobs')
      .insert({
        shift_id:    shiftId,
        title:       form.title,
        description: form.description || null,
        assigned_to: form.assigned_to || null,
        priority:    form.priority,
        due_time:    form.due_time    || null,
        notes:       form.notes       || null,
        created_by:  userId,
        status:      'assigned',
      })
      .select(`
        id, title, description, priority, status, due_time, completed_at, notes, created_at,
        assigned_worker:profiles!shift_jobs_assigned_to_fkey ( full_name, role ),
        creator:profiles!shift_jobs_created_by_fkey ( full_name )
      `)
      .single()

    setSaving(false)
    if (err) { setError(err.message); return }
    setJobs(prev => [...prev, data as unknown as ShiftJob])
    setForm({ title: '', description: '', assigned_to: '', priority: 'normal', due_time: '', notes: '' })
    setAddOpen(false)
  }

  return (
    <div className="border-t border-gray-800 mt-3 pt-3">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full"
      >
        <ClipboardList size={13} />
        <span>
          Jobs
          {jobs.length > 0 && (
            <span className="ml-1.5 text-gray-500">
              {doneCount}/{jobs.length} done
            </span>
          )}
          {activeCount > 0 && (
            <span className="ml-1.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs px-1.5 py-0.5 rounded-full">
              {activeCount} open
            </span>
          )}
        </span>
        {canManage && !open && (
          <span className="ml-auto text-gray-600 text-xs">click to manage</span>
        )}
        <span className="ml-auto">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {/* Job list */}
          {jobs.length === 0 && !addOpen ? (
            <p className="text-xs text-gray-600 py-1">No jobs assigned to this shift yet.</p>
          ) : (
            <div className="space-y-1.5">
              {jobs.map(job => {
                const pm = PRIORITY_META[job.priority]
                const sm = STATUS_META[job.status]
                const isMyJob = job.assigned_worker != null
                const done = job.status === 'completed' || job.status === 'skipped'
                return (
                  <div key={job.id} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
                    done ? 'bg-gray-800/40' : 'bg-gray-800'
                  }`}>
                    {/* Priority dot */}
                    <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${pm.dot} ${done ? 'opacity-40' : ''}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${done ? 'line-through text-gray-600' : 'text-white'}`}>
                          {job.title}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${sm.badge}`}>
                          {sm.label}
                        </span>
                      </div>
                      {job.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{job.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {job.assigned_worker ? (
                          <span className="flex items-center gap-1 text-xs">
                            <span className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-[10px] font-medium text-white shrink-0">
                              {job.assigned_worker.full_name[0]}
                            </span>
                            <span className="text-gray-300">{job.assigned_worker.full_name}</span>
                            <span className="text-gray-600">·</span>
                            <span className="text-gray-500">{job.assigned_worker.role}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 italic">Unassigned</span>
                        )}
                        {job.due_time && (
                          <span className="text-xs text-gray-500">Due {fmtTime(job.due_time)}</span>
                        )}
                        {job.notes && (
                          <span className="text-xs text-gray-600 italic truncate max-w-[140px]">{job.notes}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {!done && job.status === 'assigned' && (
                        <button
                          title="Start"
                          onClick={() => updateJob(job.id, { status: 'in_progress' })}
                          disabled={busy === job.id}
                          className="p-1 text-gray-500 hover:text-blue-400 transition-colors disabled:opacity-50"
                        >
                          <PlayCircle size={15} />
                        </button>
                      )}
                      {!done && (
                        <button
                          title="Mark complete"
                          onClick={() => updateJob(job.id, {
                            status: 'completed',
                            completed_at: new Date().toISOString(),
                            completed_by: userId,
                          })}
                          disabled={busy === job.id}
                          className="p-1 text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {!done && canManage && (
                        <button
                          title="Skip"
                          onClick={() => updateJob(job.id, { status: 'skipped' })}
                          disabled={busy === job.id}
                          className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
                        >
                          <SkipForward size={14} />
                        </button>
                      )}
                      {canManage && (
                        <button
                          title="Remove"
                          onClick={() => deleteJob(job.id)}
                          disabled={busy === job.id}
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add job form */}
          {canManage && (
            <div>
              {!addOpen ? (
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mt-1 px-1 py-1"
                >
                  <Plus size={13} /> Assign job
                </button>
              ) : (
                <form onSubmit={addJob} className="bg-gray-800/70 border border-gray-700 rounded-lg p-3 mt-2 space-y-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-300">New Job</span>
                    <button type="button" onClick={() => setAddOpen(false)} className="text-gray-600 hover:text-white">
                      <X size={13} />
                    </button>
                  </div>

                  {/* Title */}
                  <input
                    required
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Job title *"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
                  />

                  {/* Description */}
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    {/* Assign to */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Assign to</label>
                      <select
                        value={form.assigned_to}
                        onChange={e => set('assigned_to', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500"
                      >
                        <option value="">— Unassigned —</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Priority</label>
                      <select
                        value={form.priority}
                        onChange={e => set('priority', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-gray-500"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Due time */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Due by (time)</label>
                      <input
                        type="time"
                        value={form.due_time}
                        onChange={e => set('due_time', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-gray-500"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Notes</label>
                      <input
                        value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Short note…"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-xs">{error}</p>}

                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                    >
                      {saving ? 'Assigning…' : 'Assign Job'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddOpen(false)}
                      className="text-xs text-gray-500 hover:text-white px-3 py-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
