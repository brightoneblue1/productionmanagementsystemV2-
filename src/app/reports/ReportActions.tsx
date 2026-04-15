'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

export default function ReportActions({
  reportId,
  currentStatus,
  canApprove,
}: {
  reportId: string
  currentStatus: string
  canApprove: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!canApprove || currentStatus !== 'submitted') return null

  async function updateStatus(status: 'approved' | 'rejected', rejectionReason?: string) {
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const update: Record<string, string> = { status }
      if (rejectionReason) update.rejection_reason = rejectionReason

      const { error: err } = await supabase
        .from('lab_reports')
        .update(update)
        .eq('id', reportId)

      if (err) { setError('Failed to update status.'); return }
      setShowReject(false)
      setReason('')
      router.refresh()
    })
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      {!showReject ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateStatus('approved')}
            disabled={pending}
            className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={13} /> Approve
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={pending}
            className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Reason for rejection (optional)</p>
            <button onClick={() => setShowReject(false)} className="text-gray-600 hover:text-gray-400">
              <ChevronUp size={13} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Viscosity out of spec range"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <button
              onClick={() => updateStatus('rejected', reason)}
              disabled={pending}
              className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}
    </div>
  )
}
