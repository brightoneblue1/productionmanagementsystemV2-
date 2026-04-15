'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Merge, Split, MoveRight,
  ChevronDown, ChevronUp, X, CheckCircle2, AlertTriangle, Layers,
} from 'lucide-react'
import {
  createTankFarm, updateTankFarm, deleteTankFarm, mergeTankFarms, splitTankFarm,
  createTank, updateTank, deleteTank, moveTankToFarm,
  createPlant, updatePlant, deletePlant,
} from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

export interface Tank {
  id: string; name: string; code: string
  capacity_liters: number; current_level_liters: number
  product_type: string | null; is_active: boolean
  pump_flow_rate_lph: number
  min_level_percent: number; max_level_percent: number
  alert_low_percent: number; alert_high_percent: number
}
export interface Farm  { id: string; name: string; code: string; tanks: Tank[] }
export interface Plant { id: string; name: string; code: string; is_active: boolean }

type Modal =
  | { type: 'none' }
  | { type: 'add-farm' }
  | { type: 'edit-farm';    farm: Farm }
  | { type: 'delete-farm';  farm: Farm }
  | { type: 'merge-farm';   farm: Farm }
  | { type: 'split-farm';   farm: Farm }
  | { type: 'add-tank';     farmId: string; farmName: string }
  | { type: 'edit-tank';    tank: Tank }
  | { type: 'delete-tank';  tank: Tank }
  | { type: 'move-tank';    tank: Tank }
  | { type: 'add-plant' }
  | { type: 'edit-plant';   plant: Plant }
  | { type: 'delete-plant'; plant: Plant }

// ─── small helpers ────────────────────────────────────────────────────────────

function pct(tank: Tank) {
  if (!tank.capacity_liters) return 0
  return Math.min(100, Math.round((tank.current_level_liters / tank.capacity_liters) * 100))
}

function Input({ label, name, defaultValue, placeholder, type = 'text', required, min, max, step }: {
  label: string; name: string; defaultValue?: string | number
  placeholder?: string; type?: string; required?: boolean
  min?: number; max?: number; step?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input
        type={type} name={name} defaultValue={defaultValue ?? ''} placeholder={placeholder}
        required={required} min={min} max={max} step={step}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
    </div>
  )
}

function Btn({ children, onClick, variant = 'default', disabled, type = 'button', size = 'sm' }: {
  children: React.ReactNode; onClick?: () => void
  variant?: 'default' | 'primary' | 'danger' | 'ghost'
  disabled?: boolean; type?: 'button' | 'submit'; size?: 'sm' | 'xs'
}) {
  const base = `inline-flex items-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-40 ${
    size === 'xs' ? 'text-xs px-2 py-1' : 'text-xs px-3 py-1.5'
  }`
  const variants = {
    default:  'bg-gray-700 hover:bg-gray-600 text-gray-200',
    primary:  'bg-orange-500 hover:bg-orange-400 text-white',
    danger:   'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
    ghost:    'text-gray-400 hover:text-white hover:bg-gray-800',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  )
}

// ─── modal wrapper ────────────────────────────────────────────────────────────

function ModalWrap({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-sm text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export default function FacilityManager({ farms, plants }: { farms: Farm[]; plants: Plant[] }) {
  const router = useRouter()
  const [tab,      setTab]      = useState<'farms' | 'plants'>('farms')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal,    setModal]    = useState<Modal>({ type: 'none' })
  const [error,    setError]    = useState('')
  const [pending,  startTrans]  = useTransition()

  function close() { setModal({ type: 'none' }); setError('') }
  function toggle(id: string) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function run(action: (fd: FormData) => Promise<{ error?: string | null; success?: boolean }>, fd: FormData) {
    setError('')
    startTrans(async () => {
      const res = await action(fd)
      if (res?.error) { setError(res.error ?? 'Unknown error'); return }
      close(); router.refresh()
    })
  }

  // ── split state ──────────────────────────────────────────────────────────
  const [splitIds, setSplitIds] = useState<Set<string>>(new Set())
  function toggleSplitTank(id: string) {
    setSplitIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── move tank ────────────────────────────────────────────────────────────
  async function handleMove(tankId: string, targetFarmId: string) {
    setError('')
    startTrans(async () => {
      const res = await moveTankToFarm(tankId, targetFarmId)
      if (res?.error) { setError(res.error ?? ''); return }
      close(); router.refresh()
    })
  }

  // ── delete shortcuts ─────────────────────────────────────────────────────
  async function handleDeleteFarm(farmId: string) {
    setError('')
    startTrans(async () => {
      const res = await deleteTankFarm(farmId)
      if (res?.error) { setError(res.error ?? ''); return }
      close(); router.refresh()
    })
  }
  async function handleDeleteTank(tankId: string) {
    setError('')
    startTrans(async () => {
      const res = await deleteTank(tankId)
      if (res?.error) { setError(res.error ?? ''); return }
      close(); router.refresh()
    })
  }
  async function handleDeletePlant(plantId: string) {
    setError('')
    startTrans(async () => {
      const res = await deletePlant(plantId)
      if (res?.error) { setError(res.error ?? ''); return }
      close(); router.refresh()
    })
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-800/60 rounded-xl p-1 mb-6 w-fit">
        {(['farms', 'plants'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'farms' ? `Tank Farms (${farms.length})` : `Plants & Sections (${plants.length})`}
          </button>
        ))}
      </div>

      {/* ── TANK FARMS TAB ── */}
      {tab === 'farms' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Btn variant="primary" onClick={() => setModal({ type: 'add-farm' })}>
              <Plus size={13} /> New Tank Farm
            </Btn>
          </div>

          {farms.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <Layers size={36} className="mx-auto mb-2 opacity-30" />
              <p>No tank farms yet.</p>
            </div>
          ) : farms.map(farm => (
            <div key={farm.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Farm header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggle(farm.id)} className="flex items-center gap-2 flex-1 text-left">
                  <span className="font-semibold text-sm text-white">{farm.name}</span>
                  <span className="text-xs text-gray-500">({farm.code})</span>
                  <span className="text-xs text-gray-600">{farm.tanks.length} tank{farm.tanks.length !== 1 ? 's' : ''}</span>
                  {expanded.has(farm.id) ? <ChevronUp size={14} className="text-gray-500 ml-auto" /> : <ChevronDown size={14} className="text-gray-500 ml-auto" />}
                </button>
                <div className="flex gap-1.5 shrink-0">
                  <Btn size="xs" variant="ghost" onClick={() => setModal({ type: 'add-tank', farmId: farm.id, farmName: farm.name })}>
                    <Plus size={11} /> Tank
                  </Btn>
                  <Btn size="xs" variant="ghost" onClick={() => setModal({ type: 'edit-farm', farm })}>
                    <Pencil size={11} />
                  </Btn>
                  <Btn size="xs" variant="ghost" onClick={() => { setSplitIds(new Set()); setModal({ type: 'split-farm', farm }) }}>
                    <Split size={11} />
                  </Btn>
                  <Btn size="xs" variant="ghost" onClick={() => setModal({ type: 'merge-farm', farm })}>
                    <Merge size={11} />
                  </Btn>
                  <Btn size="xs" variant="danger" onClick={() => setModal({ type: 'delete-farm', farm })}>
                    <Trash2 size={11} />
                  </Btn>
                </div>
              </div>

              {/* Tank table */}
              {expanded.has(farm.id) && (
                <div className="border-t border-gray-800 overflow-x-auto">
                  {farm.tanks.length === 0 ? (
                    <p className="text-xs text-gray-600 px-4 py-3">No tanks — add one above.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Name</th>
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Product</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Level</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Capacity (L)</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Pump L/hr</th>
                          <th className="text-center px-4 py-2 text-gray-500 font-medium">Active</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {farm.tanks.map(tank => (
                          <tr key={tank.id} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-white">{tank.name}</span>
                              <span className="text-gray-600 ml-1">({tank.code})</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-400">{tank.product_type ?? <span className="text-gray-600">—</span>}</td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct(tank) <= 10 ? 'bg-red-500' : pct(tank) <= 25 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${pct(tank)}%` }}
                                  />
                                </div>
                                <span className="text-gray-300">{pct(tank)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-300 font-mono">{tank.capacity_liters.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{tank.pump_flow_rate_lph > 0 ? tank.pump_flow_rate_lph.toLocaleString() : <span className="text-gray-600">—</span>}</td>
                            <td className="px-4 py-2.5 text-center">
                              {tank.is_active
                                ? <span className="text-emerald-400">●</span>
                                : <span className="text-gray-600">●</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1 justify-end">
                                <Btn size="xs" variant="ghost" onClick={() => setModal({ type: 'edit-tank', tank })}>
                                  <Pencil size={10} />
                                </Btn>
                                <Btn size="xs" variant="ghost" onClick={() => setModal({ type: 'move-tank', tank })}>
                                  <MoveRight size={10} />
                                </Btn>
                                <Btn size="xs" variant="danger" onClick={() => setModal({ type: 'delete-tank', tank })}>
                                  <Trash2 size={10} />
                                </Btn>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PLANTS TAB ── */}
      {tab === 'plants' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn variant="primary" onClick={() => setModal({ type: 'add-plant' })}>
              <Plus size={13} /> New Section
            </Btn>
          </div>

          {plants.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <Layers size={36} className="mx-auto mb-2 opacity-30" />
              <p>No plants or sections yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {plants.map(plant => (
                <div key={plant.id} className={`bg-gray-900 border rounded-xl p-4 ${plant.is_active ? 'border-gray-800' : 'border-gray-800/50 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm text-white">{plant.name}</p>
                      <p className="text-xs text-gray-500">{plant.code}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      plant.is_active
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-700 text-gray-500 border-gray-600'
                    }`}>
                      {plant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    <Btn size="xs" variant="ghost" onClick={() => setModal({ type: 'edit-plant', plant })}>
                      <Pencil size={10} /> Edit
                    </Btn>
                    <Btn size="xs" variant="danger" onClick={() => setModal({ type: 'delete-plant', plant })}>
                      <Trash2 size={10} />
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {modal.type !== 'none' && (
        <div>
          {/* Add / Edit Farm */}
          {(modal.type === 'add-farm' || modal.type === 'edit-farm') && (
            <ModalWrap title={modal.type === 'add-farm' ? 'New Tank Farm' : `Edit: ${modal.farm.name}`} onClose={close}>
              <form action={fd => run(modal.type === 'add-farm' ? createTankFarm : updateTankFarm, fd)} className="space-y-3">
                {modal.type === 'edit-farm' && <input type="hidden" name="id" value={modal.farm.id} />}
                <Input label="Farm Name" name="name" required placeholder="e.g. Tank Farm 3"
                  defaultValue={modal.type === 'edit-farm' ? modal.farm.name : ''} />
                <Input label="Code" name="code" required placeholder="e.g. TF3"
                  defaultValue={modal.type === 'edit-farm' ? modal.farm.code : ''} />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Btn onClick={close}>Cancel</Btn>
                  <Btn type="submit" variant="primary" disabled={pending}>
                    {pending ? 'Saving…' : modal.type === 'add-farm' ? 'Create Farm' : 'Save Changes'}
                  </Btn>
                </div>
              </form>
            </ModalWrap>
          )}

          {/* Delete Farm */}
          {modal.type === 'delete-farm' && (
            <ModalWrap title="Delete Tank Farm" onClose={close}>
              <p className="text-sm text-gray-300 mb-1">
                Delete <strong className="text-white">{modal.farm.name}</strong>?
              </p>
              <p className="text-xs text-gray-500 mb-4">
                The farm must have no tanks assigned. This cannot be undone.
              </p>
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <div className="flex justify-end gap-2">
                <Btn onClick={close}>Cancel</Btn>
                <Btn variant="danger" disabled={pending} onClick={() => handleDeleteFarm(modal.farm.id)}>
                  {pending ? 'Deleting…' : 'Delete Farm'}
                </Btn>
              </div>
            </ModalWrap>
          )}

          {/* Merge Farm */}
          {modal.type === 'merge-farm' && (
            <ModalWrap title={`Merge: ${modal.farm.name}`} onClose={close}>
              <p className="text-xs text-gray-400 mb-4">
                All tanks from <strong className="text-white">{modal.farm.name}</strong> will be moved to the target farm, then this farm will be deleted.
              </p>
              <form action={fd => run(mergeTankFarms, fd)} className="space-y-3">
                <input type="hidden" name="source_id" value={modal.farm.id} />
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Merge into<span className="text-red-400 ml-0.5">*</span></label>
                  <select name="target_id" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                    <option value="">— select target farm —</option>
                    {farms.filter(f => f.id !== modal.farm.id).map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Btn onClick={close}>Cancel</Btn>
                  <Btn type="submit" variant="danger" disabled={pending}>
                    {pending ? 'Merging…' : 'Merge & Delete Source'}
                  </Btn>
                </div>
              </form>
            </ModalWrap>
          )}

          {/* Split Farm */}
          {modal.type === 'split-farm' && (
            <ModalWrap title={`Split: ${modal.farm.name}`} onClose={close}>
              <p className="text-xs text-gray-400 mb-3">Select tanks to move to a new farm.</p>
              <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                {modal.farm.tanks.map(t => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={splitIds.has(t.id)}
                      onChange={() => toggleSplitTank(t.id)}
                      className="accent-orange-500"
                    />
                    <span>{t.name}</span>
                    <span className="text-gray-600 text-xs">({t.code})</span>
                    {t.product_type && <span className="text-gray-500 text-xs ml-auto">{t.product_type}</span>}
                  </label>
                ))}
              </div>
              <form
                action={fd => {
                  fd.set('tank_ids', Array.from(splitIds).join(','))
                  return run(splitTankFarm, fd)
                }}
                className="space-y-3 border-t border-gray-800 pt-3"
              >
                <input type="hidden" name="farm_id" value={modal.farm.id} />
                <Input label="New Farm Name" name="new_farm_name" required placeholder="e.g. Tank Farm 5B" />
                <Input label="New Farm Code" name="new_farm_code" required placeholder="e.g. TF5B" />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <p className="text-xs text-gray-500">{splitIds.size} tank{splitIds.size !== 1 ? 's' : ''} selected</p>
                <div className="flex justify-end gap-2">
                  <Btn onClick={close}>Cancel</Btn>
                  <Btn type="submit" variant="primary" disabled={pending || splitIds.size === 0}>
                    {pending ? 'Splitting…' : 'Create New Farm'}
                  </Btn>
                </div>
              </form>
            </ModalWrap>
          )}

          {/* Add / Edit Tank */}
          {(modal.type === 'add-tank' || modal.type === 'edit-tank') && (
            <ModalWrap
              title={modal.type === 'add-tank' ? `Add Tank to ${modal.farmName}` : `Edit: ${modal.tank.name}`}
              onClose={close}
            >
              <form action={fd => run(modal.type === 'add-tank' ? createTank : updateTank, fd)} className="space-y-3">
                {modal.type === 'add-tank'  && <input type="hidden" name="farm_id" value={modal.farmId} />}
                {modal.type === 'edit-tank' && <input type="hidden" name="id"      value={modal.tank.id} />}

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Tank Name" name="name" required placeholder="e.g. Crude Sunflower 1"
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.name : ''} />
                  <Input label="Code" name="code" required placeholder="e.g. CS1"
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.code : ''} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Capacity (L)" name="capacity_liters" type="number" required min={0} step="1"
                    placeholder="e.g. 500000"
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.capacity_liters : ''} />
                  <Input label="Product Type" name="product_type" placeholder="e.g. Crude Sunflower"
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.product_type ?? '' : ''} />
                </div>
                <Input label="Pump Flow Rate (L/hr)" name="pump_flow_rate_lph" type="number" min={0} step="1"
                  placeholder="0 = not configured"
                  defaultValue={modal.type === 'edit-tank' ? modal.tank.pump_flow_rate_lph : ''} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Min Level %" name="min_level_percent" type="number" min={0} max={100}
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.min_level_percent : 10} />
                  <Input label="Max Level %" name="max_level_percent" type="number" min={0} max={100}
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.max_level_percent : 90} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Alert Low %" name="alert_low_percent" type="number" min={0} max={100}
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.alert_low_percent : 25} />
                  <Input label="Alert High %" name="alert_high_percent" type="number" min={0} max={100}
                    defaultValue={modal.type === 'edit-tank' ? modal.tank.alert_high_percent : 80} />
                </div>
                {modal.type === 'edit-tank' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Status</label>
                    <select name="is_active" defaultValue={String(modal.tank.is_active)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Btn onClick={close}>Cancel</Btn>
                  <Btn type="submit" variant="primary" disabled={pending}>
                    {pending ? 'Saving…' : modal.type === 'add-tank' ? 'Add Tank' : 'Save Changes'}
                  </Btn>
                </div>
              </form>
            </ModalWrap>
          )}

          {/* Move Tank */}
          {modal.type === 'move-tank' && (
            <ModalWrap title={`Move: ${modal.tank.name}`} onClose={close}>
              <p className="text-xs text-gray-400 mb-4">Move this tank to a different farm.</p>
              <div className="space-y-2">
                {farms.map(farm => (
                  <button
                    key={farm.id}
                    disabled={pending}
                    onClick={() => handleMove(modal.tank.id, farm.id)}
                    className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
                  >
                    <span className="font-medium text-white">{farm.name}</span>
                    <span className="text-gray-500 ml-2">({farm.code}) · {farm.tanks.length} tanks</span>
                  </button>
                ))}
              </div>
              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              <div className="flex justify-end mt-4"><Btn onClick={close}>Cancel</Btn></div>
            </ModalWrap>
          )}

          {/* Delete Tank */}
          {modal.type === 'delete-tank' && (
            <ModalWrap title="Delete Tank" onClose={close}>
              <p className="text-sm text-gray-300 mb-1">
                Delete <strong className="text-white">{modal.tank.name}</strong>?
              </p>
              <p className="text-xs text-gray-500 mb-4">All readings and fill events for this tank will also be removed. This cannot be undone.</p>
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <div className="flex justify-end gap-2">
                <Btn onClick={close}>Cancel</Btn>
                <Btn variant="danger" disabled={pending} onClick={() => handleDeleteTank(modal.tank.id)}>
                  {pending ? 'Deleting…' : 'Delete Tank'}
                </Btn>
              </div>
            </ModalWrap>
          )}

          {/* Add / Edit Plant */}
          {(modal.type === 'add-plant' || modal.type === 'edit-plant') && (
            <ModalWrap title={modal.type === 'add-plant' ? 'New Plant / Section' : `Edit: ${modal.plant.name}`} onClose={close}>
              <form action={fd => run(modal.type === 'add-plant' ? createPlant : updatePlant, fd)} className="space-y-3">
                {modal.type === 'edit-plant' && <input type="hidden" name="id" value={modal.plant.id} />}
                <Input label="Section Name" name="name" required placeholder="e.g. Fractionation 2"
                  defaultValue={modal.type === 'edit-plant' ? modal.plant.name : ''} />
                <Input label="Code" name="code" required placeholder="e.g. FRAC-2"
                  defaultValue={modal.type === 'edit-plant' ? modal.plant.code : ''} />
                {modal.type === 'edit-plant' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Status</label>
                    <select name="is_active" defaultValue={String(modal.plant.is_active)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Btn onClick={close}>Cancel</Btn>
                  <Btn type="submit" variant="primary" disabled={pending}>
                    {pending ? 'Saving…' : modal.type === 'add-plant' ? 'Create Section' : 'Save Changes'}
                  </Btn>
                </div>
              </form>
            </ModalWrap>
          )}

          {/* Delete Plant */}
          {modal.type === 'delete-plant' && (
            <ModalWrap title="Delete Section" onClose={close}>
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300 mb-1">
                    Delete <strong className="text-white">{modal.plant.name}</strong>?
                  </p>
                  <p className="text-xs text-gray-500">Shifts and reports linked to this section may be affected.</p>
                </div>
              </div>
              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
              <div className="flex justify-end gap-2">
                <Btn onClick={close}>Cancel</Btn>
                <Btn variant="danger" disabled={pending} onClick={() => handleDeletePlant(modal.plant.id)}>
                  {pending ? 'Deleting…' : 'Delete Section'}
                </Btn>
              </div>
            </ModalWrap>
          )}
        </div>
      )}

      {/* global success indicator */}
      {!pending && modal.type === 'none' && (
        <div id="facility-ok" className="hidden" />
      )}
    </div>
  )
}
