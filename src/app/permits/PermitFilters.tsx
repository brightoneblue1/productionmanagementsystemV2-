'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'active',   label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired',  label: 'Expired' },
  { value: 'closed',   label: 'Closed' },
]

const TYPE_OPTIONS = [
  { value: 'hot_work',       label: 'Hot Work' },
  { value: 'cold_work',      label: 'Cold Work' },
  { value: 'confined_space', label: 'Confined Space' },
  { value: 'electrical',     label: 'Electrical' },
  { value: 'height',         label: 'Working at Height' },
  { value: 'chemical',       label: 'Chemical Handling' },
  { value: 'general',        label: 'General' },
]

export default function PermitFilters({
  totalAll, counts,
}: {
  totalAll: number
  counts: Record<string, number>
}) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const formRef     = useRef<HTMLFormElement>(null)

  const current = {
    status: searchParams.get('status') ?? '',
    type:   searchParams.get('type')   ?? '',
    q:      searchParams.get('q')      ?? '',
  }

  function submit() {
    if (!formRef.current) return
    const data   = new FormData(formRef.current)
    const params = new URLSearchParams()
    const q      = (data.get('q') as string)?.trim()
    const status = data.get('status') as string
    const type   = data.get('type')   as string
    if (q)      params.set('q',      q)
    if (status) params.set('status', status)
    if (type)   params.set('type',   type)
    router.push(`/permits${params.size ? `?${params}` : ''}`)
  }

  const hasFilters = current.status || current.type || current.q

  return (
    <form ref={formRef} onSubmit={e => { e.preventDefault(); submit() }}
      className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[220px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input name="q" defaultValue={current.q}
          placeholder="Search permit number, title, location…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500" />
      </div>

      {/* Status */}
      <select name="status" defaultValue={current.status}
        onChange={submit}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
        <option value="">All Status ({totalAll})</option>
        {STATUS_OPTIONS.map(s => (
          <option key={s.value} value={s.value}>{s.label} ({counts[s.value] ?? 0})</option>
        ))}
      </select>

      {/* Type */}
      <select name="type" defaultValue={current.type}
        onChange={submit}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500">
        <option value="">All Types</option>
        {TYPE_OPTIONS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Search button */}
      <button type="submit"
        className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
        Search
      </button>

      {/* Clear */}
      {hasFilters && (
        <Link href="/permits"
          className="text-xs text-gray-500 hover:text-white transition-colors px-2">
          Clear
        </Link>
      )}
    </form>
  )
}
