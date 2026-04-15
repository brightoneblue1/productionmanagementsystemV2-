'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'

export default function ShiftDateSearch() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const current     = searchParams.get('date') ?? ''
  const [date, setDate] = useState(current)

  function apply(val: string) {
    const params = new URLSearchParams()
    if (val) params.set('date', val)
    router.push(`/jobs${val ? `?${params}` : ''}`)
  }

  function clear() {
    setDate('')
    router.push('/jobs')
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && apply(date)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white
                     [color-scheme:dark] focus:outline-none focus:border-gray-500"
        />
      </div>
      <button
        onClick={() => apply(date)}
        className="text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-2 transition-colors"
      >
        Search
      </button>
      {current && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          title="Clear search"
        >
          <X size={13} /> Clear
        </button>
      )}
    </div>
  )
}
