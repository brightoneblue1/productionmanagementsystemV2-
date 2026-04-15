'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, ShieldCheck, MinusCircle, ChevronDown } from 'lucide-react'

type Status = 'pending' | 'approved' | 'active' | 'rejected' | 'expired' | 'closed'

export default function PermitActions({
  permitId, status, userId,
}: {
  permitId: string
  status: Status
  userId: string
}) {
  const [busy, setBusy]           = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason]       = useState('')

  async function transition(newStatus: Status, extra?: Record<string, string>) {
    setBusy(true)
    await createClient().from('work_permits').update({
      status: newStatus,
      ...(newStatus === 'approved' || newStatus === 'active' ? { approved_by: userId } : {}),
      ...(newStatus === 'closed'   ? { closed_by:   userId } : {}),
      ...extra,
      updated_at: new Date().toISOString(),
    }).eq('id', permitId)
    setBusy(false)
    window.location.reload()
  }

  if (status === 'pending') return (
    <div className="flex flex-col gap-2 shrink-0">
      <button onClick={() => transition('approved')} disabled={busy}
        className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors">
        <CheckCircle2 size={13} /> Approve
      </button>
      {showReject ? (
        <div className="space-y-1.5">
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Rejection reason…"
            className="w-44 bg-gray-800 border border-red-500/40 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none" />
          <div className="flex gap-1">
            <button onClick={() => transition('rejected', { rejection_reason: reason })} disabled={busy || !reason.trim()}
              className="flex-1 text-xs bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded px-2 py-1 font-semibold transition-colors">
              Confirm
            </button>
            <button onClick={() => setShowReject(false)}
              className="text-xs text-gray-500 hover:text-white px-2 py-1 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowReject(true)} disabled={busy}
          className="flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg px-3 py-1.5 font-semibold transition-colors">
          <XCircle size={13} /> Reject
        </button>
      )}
    </div>
  )

  if (status === 'approved') return (
    <button onClick={() => transition('active')} disabled={busy}
      className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors shrink-0">
      <ShieldCheck size={13} /> Activate
    </button>
  )

  if (status === 'active') return (
    <button onClick={() => transition('closed')} disabled={busy}
      className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 font-semibold transition-colors shrink-0">
      <MinusCircle size={13} /> Close Permit
    </button>
  )

  return null
}
