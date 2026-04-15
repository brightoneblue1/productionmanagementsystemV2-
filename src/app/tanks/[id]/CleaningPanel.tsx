'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Clock, Plus, ChevronDown, ChevronUp, X, Pencil } from 'lucide-react'
import { logCleaning, upsertCleaningSchedule } from './actions'

interface Schedule {
  id: string
  frequency_days: number
  last_cleaned_at: string | null
  next_due_at: string | null
  procedure: string | null
  notes: string | null
}

interface CleaningLog {
  id: string
  cleaned_at: string
  duration_hours: number | null
  observations: string | null
  procedure_notes: string | null
  cleaner: { full_name: string } | null
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function daysUntil(s: string) {
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000)
}

export default function CleaningPanel({
  tankId, schedule, logs, canManage,
}: {
  tankId: string
  schedule: Schedule | null
  logs: CleaningLog[]
  canManage: boolean
}) {
  const router = useRouter()
  const [showLog,      setShowLog]      = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)
  const [error,        setError]        = useState('')
  const [pending,      startTrans]      = useTransition()

  async function submitLog(formData: FormData) {
    setError('')
    startTrans(async () => {
      const res = await logCleaning(formData)
      if (res?.error) { setError(res.error ?? ''); return }
      setShowLog(false); router.refresh()
    })
  }

  async function submitSchedule(formData: FormData) {
    setError('')
    startTrans(async () => {
      const res = await upsertCleaningSchedule(formData)
      if (res?.error) { setError(res.error ?? ''); return }
      setShowSchedule(false); router.refresh()
    })
  }

  // Due status
  const isDue     = schedule?.next_due_at && daysUntil(schedule.next_due_at) <= 0
  const isDueSoon = schedule?.next_due_at && daysUntil(schedule.next_due_at) <= 14 && !isDue
  const daysLeft  = schedule?.next_due_at ? daysUntil(schedule.next_due_at) : null

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {!schedule ? (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={13} /> No cleaning schedule set
            </span>
          ) : isDue ? (
            <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
              <AlertTriangle size={12} /> Cleaning overdue — {Math.abs(daysLeft ?? 0)}d past due
            </span>
          ) : isDueSoon ? (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full">
              <Clock size={12} /> Due in {daysLeft}d — {fmtDate(schedule.next_due_at!)}
            </span>
          ) : schedule.next_due_at ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={12} /> Next cleaning {fmtDate(schedule.next_due_at)} ({daysLeft}d)
            </span>
          ) : null}

          {schedule?.last_cleaned_at && (
            <span className="text-xs text-gray-500">
              Last: {fmtDate(schedule.last_cleaned_at)}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {canManage && (
            <button onClick={() => { setShowSchedule(s => !s); setError('') }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition-colors">
              <Pencil size={11} /> {schedule ? 'Edit Schedule' : 'Set Schedule'}
            </button>
          )}
          <button onClick={() => { setShowLog(s => !s); setError('') }}
            className="flex items-center gap-1 text-xs text-white bg-orange-500 hover:bg-orange-400 px-2.5 py-1.5 rounded-lg transition-colors">
            <Plus size={11} /> Log Cleaning
          </button>
        </div>
      </div>

      {/* Procedure */}
      {schedule?.procedure && (
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Cleaning Procedure</p>
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{schedule.procedure}</div>
          {schedule.notes && (
            <p className="text-xs text-gray-500 mt-3 border-t border-gray-700 pt-2">{schedule.notes}</p>
          )}
        </div>
      )}

      {/* Edit schedule form */}
      {showSchedule && canManage && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white">{schedule ? 'Edit Cleaning Schedule' : 'Set Cleaning Schedule'}</p>
            <button onClick={() => setShowSchedule(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
          </div>
          <form action={submitSchedule} className="space-y-3">
            <input type="hidden" name="tank_id" value={tankId} />
            {schedule && <input type="hidden" name="schedule_id" value={schedule.id} />}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Frequency (days)</label>
                <input type="number" name="frequency_days" min={1} defaultValue={schedule?.frequency_days ?? 90}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Last Cleaned</label>
                <input type="date" name="last_cleaned_at"
                  defaultValue={schedule?.last_cleaned_at ? schedule.last_cleaned_at.split('T')[0] : ''}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cleaning Procedure</label>
              <textarea name="procedure" rows={5} defaultValue={schedule?.procedure ?? ''}
                placeholder={'1. Drain tank completely\n2. Flush with hot water\n3. Apply cleaning agent\n4. Rinse thoroughly\n5. Inspect and document'}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input name="notes" defaultValue={schedule?.notes ?? ''} placeholder="Safety notes, special requirements…"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowSchedule(false)}
                className="text-xs px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
              <button type="submit" disabled={pending}
                className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {pending ? 'Saving…' : 'Save Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log cleaning form */}
      {showLog && (
        <div className="bg-gray-800 border border-orange-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-orange-400">Log Cleaning Event</p>
            <button onClick={() => setShowLog(false)} className="text-gray-500 hover:text-white"><X size={13} /></button>
          </div>
          <form action={submitLog} className="space-y-3">
            <input type="hidden" name="tank_id" value={tankId} />
            {schedule && <input type="hidden" name="schedule_id" value={schedule.id} />}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cleaned At</label>
                <input type="datetime-local" name="cleaned_at"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (hours)</label>
                <input type="number" name="duration_hours" min={0} step="0.5" placeholder="e.g. 4.5"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Observations</label>
              <textarea name="observations" rows={2} placeholder="Condition found, any issues noted…"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Procedure Notes</label>
              <textarea name="procedure_notes" rows={2} placeholder="Steps taken, deviations from standard procedure…"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none" />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowLog(false)}
                className="text-xs px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
              <button type="submit" disabled={pending}
                className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {pending ? 'Saving…' : 'Save Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      {logs.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(s => !s)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Cleaning history ({logs.length})
          </button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {logs.map(log => (
                <div key={log.id} className="bg-gray-800 rounded-lg px-4 py-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">{fmtDateTime(log.cleaned_at)}</span>
                    <div className="flex gap-3 text-gray-500">
                      {log.duration_hours && <span>{log.duration_hours}h</span>}
                      {log.cleaner && <span>{log.cleaner.full_name}</span>}
                    </div>
                  </div>
                  {log.observations && (
                    <p className="text-gray-400"><span className="text-gray-500">Observations: </span>{log.observations}</p>
                  )}
                  {log.procedure_notes && (
                    <p className="text-gray-500 mt-0.5">{log.procedure_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
