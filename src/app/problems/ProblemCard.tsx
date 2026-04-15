'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, Send } from 'lucide-react'

interface Update {
  id: string
  update_text: string
  created_at: string
  updater: { full_name: string } | null
}

interface Profile { id: string; full_name: string }

interface Problem {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  reported_at: string
  due_date: string | null
  priority: number | null
  plants: { name: string } | null
  reporter: { full_name: string } | null
  assignee: { full_name: string } | null
  problem_updates: Update[]
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'P1', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  2: { label: 'P2', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  3: { label: 'P3', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  4: { label: 'P4', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  5: { label: 'P5', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
}

const SEVERITY_STYLES: Record<string, string> = {
  low:      'bg-gray-500/20 text-gray-400 border-gray-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ProblemCard({
  problem,
  userId,
  profiles,
  canManage,
}: {
  problem: Problem
  userId: string
  profiles: Profile[]
  canManage: boolean
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(problem.status)
  const [assignedTo, setAssignedTo] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleUpdate() {
    if (!comment.trim() && status === problem.status && !assignedTo) return
    setSaving(true)
    const supabase = createClient()

    const updates: Record<string, unknown> = {}
    if (status !== problem.status) updates.status = status
    if (assignedTo) updates.assigned_to = assignedTo
    if (Object.keys(updates).length > 0) {
      await supabase.from('problems').update(updates).eq('id', problem.id)
    }

    if (comment.trim()) {
      await supabase.from('problem_updates').insert({
        problem_id: problem.id,
        update_text: comment.trim(),
        updated_by: userId,
      })
    }

    setComment('')
    setAssignedTo('')
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {problem.priority && PRIORITY_LABELS[problem.priority] && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${PRIORITY_LABELS[problem.priority].color}`}>
                {PRIORITY_LABELS[problem.priority].label}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[problem.severity]}`}>
              {problem.severity}
            </span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full capitalize">
              {problem.status.replace('_', ' ')}
            </span>
            {problem.plants?.name && (
              <span className="text-xs text-gray-500">{problem.plants.name}</span>
            )}
            {problem.due_date && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                new Date(problem.due_date) < new Date()
                  ? 'text-red-400 bg-red-500/10 border-red-500/30'
                  : 'text-gray-400 bg-gray-800 border-gray-700'
              }`}>
                Due {new Date(problem.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-gray-500 hover:text-white shrink-0"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <p className="font-medium text-sm text-white mb-1">{problem.title}</p>
        <p className="text-sm text-gray-400 leading-relaxed">{problem.description}</p>

        <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
          <span>{timeAgo(problem.reported_at)}</span>
          {problem.reporter?.full_name && <><span>·</span><span>{problem.reporter.full_name}</span></>}
          {problem.assignee?.full_name && <><span>·</span><span className="text-blue-400">→ {problem.assignee.full_name}</span></>}
          {problem.problem_updates.length > 0 && (
            <><span>·</span><span>{problem.problem_updates.length} update{problem.problem_updates.length > 1 ? 's' : ''}</span></>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Update history */}
          {problem.problem_updates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Updates</p>
              {problem.problem_updates.map(u => (
                <div key={u.id} className="flex gap-2 text-sm">
                  <div className="w-1 bg-gray-700 rounded-full shrink-0 my-0.5" />
                  <div>
                    <p className="text-gray-300">{u.update_text}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {u.updater?.full_name} · {timeAgo(u.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions (for managers) or just comment (for anyone) */}
          <div className="space-y-3">
            {canManage && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as Problem['status'])}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">— unchanged —</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleUpdate()}
                placeholder="Add an update or comment…"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleUpdate}
                disabled={saving || (!comment.trim() && status === problem.status && !assignedTo)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 rounded-lg transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
