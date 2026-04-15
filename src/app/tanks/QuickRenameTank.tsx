'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'
import { renameTank } from './tankActions'

interface TankMeta {
  id: string
  name: string
  code: string
  product_type: string | null
}

export default function QuickRenameTank({ tank }: { tank: TankMeta }) {
  const router = useRouter()
  const [editing, setEditing]   = useState(false)
  const [name,    setName]      = useState(tank.name)
  const [code,    setCode]      = useState(tank.code)
  const [product, setProduct]   = useState(tank.product_type ?? '')
  const [error,   setError]     = useState('')
  const [pending, startTrans]   = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setName(tank.name)
    setCode(tank.code)
    setProduct(tank.product_type ?? '')
    setEditing(true)
    setTimeout(() => nameRef.current?.select(), 0)
  }

  function cancel() { setEditing(false); setError('') }

  async function save() {
    if (!name.trim()) return
    setError('')
    startTrans(async () => {
      const res = await renameTank(tank.id, name, code || tank.code, product)
      if (res?.error) { setError(res.error ?? ''); return }
      setEditing(false)
      router.refresh()
    })
  }

  /* ── display mode ── */
  if (!editing) {
    return (
      <div className="group min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-medium text-sm text-white truncate">{tank.name}</p>
          <button
            onClick={startEdit}
            className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-600 hover:text-gray-300 transition-opacity"
            title="Edit tank details"
          >
            <Pencil size={11} />
          </button>
        </div>
        {/* Subtitle row — code · product */}
        <p className="text-xs text-gray-500 mt-0.5">
          {tank.code}{tank.product_type ? ` · ${tank.product_type}` : ''}
        </p>
      </div>
    )
  }

  /* ── edit mode ── */
  return (
    <div className="space-y-1.5 min-w-0 w-full">
      {/* Name */}
      <input
        ref={nameRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
        placeholder="Tank name"
        className="w-full bg-gray-800 border border-orange-500/60 rounded px-2 py-1 text-sm text-white focus:outline-none"
      />
      {/* Code + Product row */}
      <div className="flex gap-1.5">
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          placeholder="Code"
          className="w-20 shrink-0 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-orange-500/60 uppercase"
        />
        <input
          value={product}
          onChange={e => setProduct(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          placeholder="Product type"
          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-orange-500/60"
        />
      </div>
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={pending || !name.trim()}
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
        >
          <Check size={13} /> {pending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={cancel} className="text-xs text-gray-500 hover:text-gray-300">
          <X size={13} />
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  )
}
