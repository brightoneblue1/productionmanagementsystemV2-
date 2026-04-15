'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { addTankToFarm } from './tankActions'

export default function QuickAddTank({ farmId, farmName }: {
  farmId: string
  farmName: string
}) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [error,   setError]   = useState('')
  const [pending, startTrans] = useTransition()

  function close() { setOpen(false); setError('') }

  async function submit(formData: FormData) {
    setError('')
    startTrans(async () => {
      const res = await addTankToFarm(formData)
      if (res?.error) { setError(res.error ?? ''); return }
      close()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 border border-dashed border-gray-800 hover:border-gray-700 rounded-xl py-2.5 transition-colors"
      >
        <Plus size={12} /> Add tank to {farmName}
      </button>
    )
  }

  return (
    <div className="bg-gray-900 border border-orange-500/30 bg-orange-500/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-orange-400">Add Tank — {farmName}</span>
        <button onClick={close} className="text-gray-500 hover:text-white"><X size={13} /></button>
      </div>
      <form action={submit} className="space-y-2">
        <input type="hidden" name="farm_id" value={farmId} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tank Name <span className="text-red-400">*</span></label>
            <input
              required name="name" autoFocus
              placeholder="e.g. Crude Sunflower 3"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Code <span className="text-red-400">*</span></label>
            <input
              required name="code"
              placeholder="e.g. TF4-CS3"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 uppercase"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Capacity (L) <span className="text-red-400">*</span></label>
            <input
              required type="number" name="capacity_liters" min={0} step="1"
              placeholder="e.g. 500000"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Product Type</label>
            <input
              name="product_type"
              placeholder="e.g. Crude Sunflower Oil"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit" disabled={pending}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
        >
          {pending ? 'Adding…' : 'Add Tank'}
        </button>
      </form>
    </div>
  )
}
