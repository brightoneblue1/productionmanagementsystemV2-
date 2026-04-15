'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowRight, X } from 'lucide-react'
import { addConnection, removeConnection } from './actions'

interface Connection {
  id: string
  direction: 'in' | 'out'
  connection_type: string
  pump_name: string | null
  flow_rate_lph: number
  notes: string | null
  connected_tank: { name: string; code: string; product_type: string | null } | null
  connected_plant: { name: string; code: string } | null
}
interface Tank  { id: string; name: string; code: string }
interface Plant { id: string; name: string; code: string }

function connLabel(c: Connection) {
  if (c.connected_tank)  return `${c.connected_tank.name} (${c.connected_tank.code})`
  if (c.connected_plant) return c.connected_plant.name
  return 'Unknown'
}

function connSub(c: Connection) {
  const parts: string[] = []
  if (c.pump_name)   parts.push(c.pump_name)
  if (c.flow_rate_lph > 0) parts.push(`${c.flow_rate_lph.toLocaleString()} L/hr`)
  return parts.join(' · ')
}

const TYPE_COLOR: Record<string, string> = {
  feed:        'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  drain:       'text-orange-400  border-orange-500/30  bg-orange-500/10',
  circulation: 'text-sky-400     border-sky-500/30     bg-sky-500/10',
  transfer:    'text-purple-400  border-purple-500/30  bg-purple-500/10',
}

export default function FlowConnections({
  tankId, tankName, connections, allTanks, allPlants, canManage,
}: {
  tankId:      string
  tankName:    string
  connections: Connection[]
  allTanks:    Tank[]
  allPlants:   Plant[]
  canManage:   boolean
}) {
  const router = useRouter()
  const [adding,  setAdding]  = useState(false)
  const [dir,     setDir]     = useState<'in' | 'out'>('in')
  const [target,  setTarget]  = useState<'tank' | 'plant'>('tank')
  const [error,   setError]   = useState('')
  const [pending, startTrans] = useTransition()

  const feedsIn  = connections.filter(c => c.direction === 'in')
  const drainsOut = connections.filter(c => c.direction === 'out')

  async function submit(formData: FormData) {
    setError('')
    startTrans(async () => {
      const res = await addConnection(formData)
      if (res?.error) { setError(res.error ?? ''); return }
      setAdding(false); router.refresh()
    })
  }

  async function remove(id: string) {
    startTrans(async () => {
      await removeConnection(id, tankId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Visual flow diagram */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* Feeds in */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Feeds In</p>
          {feedsIn.length === 0
            ? <p className="text-xs text-gray-700 italic">None configured</p>
            : feedsIn.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 bg-gray-800 rounded-lg px-3 py-2 group">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{connLabel(c)}</p>
                  {connSub(c) && <p className="text-xs text-gray-500">{connSub(c)}</p>}
                  <span className={`text-xs px-1.5 py-0 rounded-full border mt-0.5 inline-block ${TYPE_COLOR[c.connection_type] ?? ''}`}>
                    {c.connection_type}
                  </span>
                </div>
                {canManage && (
                  <button onClick={() => remove(c.id)} disabled={pending}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity shrink-0">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
        </div>

        {/* Centre tank box */}
        <div className="flex flex-col items-center gap-1 px-3">
          <div className="flex items-center gap-1 text-gray-600">
            <ArrowRight size={14} />
          </div>
          <div className="bg-orange-500/10 border border-orange-500/40 rounded-xl px-4 py-3 text-center">
            <p className="font-bold text-sm text-orange-400">{tankName}</p>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Drains out */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Drains Out</p>
          {drainsOut.length === 0
            ? <p className="text-xs text-gray-700 italic">None configured</p>
            : drainsOut.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 bg-gray-800 rounded-lg px-3 py-2 group">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{connLabel(c)}</p>
                  {connSub(c) && <p className="text-xs text-gray-500">{connSub(c)}</p>}
                  <span className={`text-xs px-1.5 py-0 rounded-full border mt-0.5 inline-block ${TYPE_COLOR[c.connection_type] ?? ''}`}>
                    {c.connection_type}
                  </span>
                </div>
                {canManage && (
                  <button onClick={() => remove(c.id)} disabled={pending}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity shrink-0">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Add connection form */}
      {canManage && !adding && (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-dashed border-gray-700 hover:border-gray-600 rounded-lg px-3 py-2 transition-colors">
          <Plus size={12} /> Add connection
        </button>
      )}

      {adding && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white">New Connection</p>
            <button onClick={() => { setAdding(false); setError('') }} className="text-gray-500 hover:text-white"><X size={13} /></button>
          </div>
          <form action={submit} className="space-y-3">
            <input type="hidden" name="tank_id" value={tankId} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Direction</label>
                <select name="direction" value={dir} onChange={e => setDir(e.target.value as 'in' | 'out')}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="in">Feeds into this tank</option>
                  <option value="out">Drains out of this tank</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select name="connection_type"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="feed">Feed</option>
                  <option value="drain">Drain</option>
                  <option value="circulation">Circulation</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Connected To</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setTarget('tank')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${target === 'tank' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  Tank
                </button>
                <button type="button" onClick={() => setTarget('plant')}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${target === 'plant' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  Plant / Section
                </button>
              </div>
              {target === 'tank' ? (
                <select name="connected_tank_id"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">— select tank —</option>
                  {allTanks.filter(t => t.id !== tankId).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              ) : (
                <select name="connected_plant_id"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">— select section —</option>
                  {allPlants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pump Name</label>
                <input name="pump_name" placeholder="e.g. Feed Pump 1"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Flow Rate (L/hr)</label>
                <input type="number" name="flow_rate_lph" min={0} placeholder="0"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input name="notes" placeholder="Any additional notes"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setAdding(false); setError('') }}
                className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={pending}
                className="text-xs px-3 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {pending ? 'Adding…' : 'Add Connection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
