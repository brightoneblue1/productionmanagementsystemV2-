'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, UserPlus, Trash2 } from 'lucide-react'

interface Plant { id: string; name: string; code: string }

const NATURE_OF_JOB = [
  'Hot Work (Welding / Cutting / Grinding)',
  'Cold Work',
  'Confined Space Entry',
  'Electrical Isolation',
  'Working at Height',
  'Chemical Handling',
  'Mechanical',
  'Civil / Structural',
  'Cleaning / Housekeeping',
  'General Maintenance',
]

const PPE_HEAD  = ['Hard Hat', 'Bump Cap']
const PPE_FACE  = ['Safety Glasses', 'Face Shield', 'Goggles', 'Welding Shield']
const PPE_HANDS = ['Chemical-Resistant Gloves', 'Heat-Resistant Gloves', 'Cut-Resistant Gloves', 'Rubber Gloves']
const PPE_BODY  = ['Fire-Retardant Clothing', 'Chemical Apron', 'Coveralls', 'Hi-Vis Vest']
const PPE_FEET  = ['Steel-Capped Boots', 'Chemical-Resistant Boots', 'Anti-Static Boots']
const PPE_SITE  = ['Barricading', 'Warning Signs', 'Fire Extinguisher on Standby', 'Gas Detector', 'Safety Watch']
const WAH_ITEMS = ['Safety Harness', 'Lanyard / Lifeline', 'Scaffold', 'MEWP / Cherry Picker', 'Ladder', 'Edge Protection']

function derivePermitType(noj: string[]): string {
  if (noj.some(n => n.startsWith('Hot Work')))           return 'hot_work'
  if (noj.some(n => n.startsWith('Confined')))           return 'confined_space'
  if (noj.some(n => n.startsWith('Electrical')))         return 'electrical'
  if (noj.some(n => n.startsWith('Working at Height')))  return 'height'
  if (noj.some(n => n.startsWith('Chemical')))           return 'chemical'
  if (noj.some(n => n.startsWith('Cold')))               return 'cold_work'
  return 'general'
}

function CheckGroup({
  label, items, selected, onChange,
}: {
  label: string
  items: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (item: string) =>
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item])
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        {items.map(item => {
          const on = selected.includes(item)
          return (
            <button key={item} type="button" onClick={() => toggle(item)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                on ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                   : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}>
              <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                on ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
              }`}>
                {on && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
              </span>
              {item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function YesNo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 min-w-0 flex-1">{label}</span>
      <div className="flex gap-1.5 shrink-0">
        {['YES', 'NO'].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
            className={`text-xs px-3 py-1 rounded-lg border font-semibold transition-all ${
              value === opt
                ? opt === 'YES' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-red-500/20 border-red-500/50 text-red-300'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function NewPermitForm({ userId, plants }: { userId: string; plants: Plant[] }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    plant_id:         '',
    title:            '',
    work_description: '',
    location:         '',
    contractor_name:  '',
    team_leader_name: '',
    ppe_other:        '',
    pat_electrical:   '',
    wah_inspected:    '',
    ohs_comment:      '',
    valid_from:       '',
    valid_until:      '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const [natureOfJob, setNatureOfJob] = useState<string[]>([])
  const [ppeHead, setPpeHead]         = useState<string[]>([])
  const [ppeFace, setPpeFace]         = useState<string[]>([])
  const [ppeHands, setPpeHands]       = useState<string[]>([])
  const [ppeBody, setPpeBody]         = useState<string[]>([])
  const [ppeFeet, setPpeFeet]         = useState<string[]>([])
  const [ppeSite, setPpeSite]         = useState<string[]>([])
  const [wahItems, setWahItems]       = useState<string[]>([])
  const [assignees, setAssignees]     = useState<string[]>([''])

  const addAssignee    = () => setAssignees(a => [...a, ''])
  const removeAssignee = (i: number) => setAssignees(a => a.filter((_, idx) => idx !== i))
  const setAssignee    = (i: number, v: string) => setAssignees(a => a.map((x, idx) => idx === i ? v : x))

  function resetForm() {
    setForm({ plant_id:'', title:'', work_description:'', location:'', contractor_name:'', team_leader_name:'', ppe_other:'', pat_electrical:'', wah_inspected:'', ohs_comment:'', valid_from:'', valid_until:'' })
    setNatureOfJob([]); setPpeHead([]); setPpeFace([]); setPpeHands([])
    setPpeBody([]); setPpeFeet([]); setPpeSite([]); setWahItems([])
    setAssignees([''])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const cleanAssignees = assignees.map(a => a.trim()).filter(Boolean)
    const { error: err } = await createClient().from('work_permits').insert({
      plant_id:         form.plant_id         || null,
      permit_type:      derivePermitType(natureOfJob),
      title:            form.title,
      work_description: form.work_description,
      location:         form.location         || null,
      valid_from:       form.valid_from        || null,
      valid_until:      form.valid_until       || null,
      contractor_name:  form.contractor_name  || null,
      team_leader_name: form.team_leader_name || null,
      ppe_other:        form.ppe_other        || null,
      pat_electrical:   form.pat_electrical   || null,
      wah_inspected:    form.wah_inspected    || null,
      ohs_comment:      form.ohs_comment      || null,
      nature_of_job:    natureOfJob.length   > 0 ? natureOfJob  : null,
      ppe_head:         ppeHead.length       > 0 ? ppeHead      : null,
      ppe_face:         ppeFace.length       > 0 ? ppeFace      : null,
      ppe_hands:        ppeHands.length      > 0 ? ppeHands     : null,
      ppe_body:         ppeBody.length       > 0 ? ppeBody      : null,
      ppe_feet:         ppeFeet.length       > 0 ? ppeFeet      : null,
      ppe_site:         ppeSite.length       > 0 ? ppeSite      : null,
      wah_items:        wahItems.length      > 0 ? wahItems     : null,
      assignees:        cleanAssignees.length > 0 ? cleanAssignees : null,
      requested_by:     userId,
      status:           'pending',
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOpen(false)
    resetForm()
    window.location.reload()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 text-sm bg-orange-500 hover:bg-orange-400 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors">
      <Plus size={15} /> New Permit
    </button>
  )

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
  const sectionCls = "border border-gray-800 rounded-xl p-4 space-y-3"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-gray-900 z-10 border-b border-gray-800">
          <div className="px-6 py-3 text-center border-b border-gray-800/60">
            <p className="text-xs text-gray-500 uppercase tracking-widest">Kapa Oil Refineries Limited</p>
            <p className="font-bold text-white text-base mt-0.5">PERMIT TO WORK</p>
          </div>
          <div className="flex items-center justify-between px-6 py-2.5">
            <p className="text-xs text-gray-500">Complete all applicable sections</p>
            <button type="button" onClick={() => { setOpen(false); resetForm() }}
              className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Section 1 — Identification */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">1. Identification</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Plant / Section</label>
                <select value={form.plant_id} onChange={e => set('plant_id', e.target.value)}
                  className={inputCls}>
                  <option value="">All / General</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Contractor Name</label>
                <input value={form.contractor_name} onChange={e => set('contractor_name', e.target.value)}
                  placeholder="Company or individual" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Date Valid From *</label>
                <input type="datetime-local" required value={form.valid_from} onChange={e => set('valid_from', e.target.value)}
                  className={`${inputCls} [color-scheme:dark]`} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Expires On *</label>
                <input type="datetime-local" required value={form.valid_until} onChange={e => set('valid_until', e.target.value)}
                  className={`${inputCls} [color-scheme:dark]`} />
              </div>
            </div>
          </div>

          {/* Section 2 — Work Details */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">2. Work Details</p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Location / Equipment *</label>
              <input required value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="e.g. P3 Heat Exchanger Bay, Tank Farm P1" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Title / Brief Description *</label>
              <input required value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="Brief title of the work" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Full Description of Work *</label>
              <textarea required rows={3} value={form.work_description} onChange={e => set('work_description', e.target.value)}
                placeholder="Describe in detail the work to be performed…"
                className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* Section 3 — Nature of Job */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">3. Nature of Job</p>
            <p className="text-xs text-gray-500">Select all that apply</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {NATURE_OF_JOB.map(item => {
                const on = natureOfJob.includes(item)
                return (
                  <button key={item} type="button"
                    onClick={() => setNatureOfJob(prev => on ? prev.filter(n => n !== item) : [...prev, item])}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all ${
                      on ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                         : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}>
                    <span className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                      on ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
                    }`}>
                      {on && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                    </span>
                    {item}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 4 — PPE Required */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">4. PPE Required</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CheckGroup label="Head"  items={PPE_HEAD}  selected={ppeHead}  onChange={setPpeHead} />
              <CheckGroup label="Face"  items={PPE_FACE}  selected={ppeFace}  onChange={setPpeFace} />
              <CheckGroup label="Hands" items={PPE_HANDS} selected={ppeHands} onChange={setPpeHands} />
              <CheckGroup label="Body"  items={PPE_BODY}  selected={ppeBody}  onChange={setPpeBody} />
              <CheckGroup label="Feet"  items={PPE_FEET}  selected={ppeFeet}  onChange={setPpeFeet} />
              <CheckGroup label="Site"  items={PPE_SITE}  selected={ppeSite}  onChange={setPpeSite} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Other PPE</label>
              <input value={form.ppe_other} onChange={e => set('ppe_other', e.target.value)}
                placeholder="Specify any additional PPE…" className={inputCls} />
            </div>
            <div className="space-y-2 pt-1">
              <YesNo label="PAT (Portable Appliance Testing) Required" value={form.pat_electrical} onChange={v => set('pat_electrical', v)} />
            </div>
          </div>

          {/* Section 5 — Working at Height */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">5. Working at Height</p>
            <CheckGroup label="WAH Equipment" items={WAH_ITEMS} selected={wahItems} onChange={setWahItems} />
            <YesNo label="Equipment Inspected?" value={form.wah_inspected} onChange={v => set('wah_inspected', v)} />
          </div>

          {/* Section 6 — Assignees */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">6. Job Assignees</p>
            <div className="space-y-2">
              {assignees.map((name, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={name} onChange={e => setAssignee(i, e.target.value)}
                    placeholder={`Worker ${i + 1} full name`}
                    className={`${inputCls} flex-1`} />
                  {assignees.length > 1 && (
                    <button type="button" onClick={() => removeAssignee(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addAssignee}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-400 transition-colors">
                <UserPlus size={13} /> Add another worker
              </button>
            </div>
          </div>

          {/* Section 7 — Sign-off */}
          <div className={sectionCls}>
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">7. Sign-off</p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Team Leader on Duty</label>
              <input value={form.team_leader_name} onChange={e => set('team_leader_name', e.target.value)}
                placeholder="Full name of team leader" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">OHS Officer Comments</label>
              <textarea rows={2} value={form.ohs_comment} onChange={e => set('ohs_comment', e.target.value)}
                placeholder="Any OHS remarks or conditions…"
                className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>

        {error && <p className="px-6 pb-2 text-xs text-red-400">{error}</p>}

        <div className="px-6 py-4 border-t border-gray-800 flex gap-2 justify-end sticky bottom-0 bg-gray-900">
          <button type="button" onClick={() => { setOpen(false); resetForm() }}
            className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-lg px-5 py-2 transition-colors">
            {saving ? 'Submitting…' : 'Submit Permit'}
          </button>
        </div>
      </form>
    </div>
  )
}
