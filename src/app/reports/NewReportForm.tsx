'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, Trash2 } from 'lucide-react'

interface Plant { id: string; name: string }

interface QualityRow {
  parameter_name: string
  value: string
  unit: string
  min_spec: string
  max_spec: string
}

const DEFAULT_PARAMS: QualityRow[] = [
  { parameter_name: 'Viscosity',    value: '', unit: 'cSt',   min_spec: '', max_spec: '' },
  { parameter_name: 'Density',      value: '', unit: 'kg/m3', min_spec: '', max_spec: '' },
  { parameter_name: 'Flash Point',  value: '', unit: '°C',    min_spec: '', max_spec: '' },
]

function genReportNumber() {
  const d = new Date()
  return `LAB-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`
}

export default function NewReportForm({ userId, plants }: { userId: string; plants: Plant[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [params, setParams] = useState<QualityRow[]>(DEFAULT_PARAMS)
  const [form, setForm] = useState({
    plant_id: plants[0]?.id ?? '',
    report_number: genReportNumber(),
    sample_taken_at: new Date().toISOString().slice(0, 16),
    notes: '',
  })

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setParam(i: number, field: keyof QualityRow, value: string) {
    setParams(p => p.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  function addParam() {
    setParams(p => [...p, { parameter_name: '', value: '', unit: '', min_spec: '', max_spec: '' }])
  }

  function removeParam(i: number) {
    setParams(p => p.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    const { data: report, error: repErr } = await supabase
      .from('lab_reports')
      .insert({
        plant_id: form.plant_id || null,
        report_number: form.report_number,
        sample_taken_at: new Date(form.sample_taken_at).toISOString(),
        submitted_by: userId,
        notes: form.notes || null,
        status: 'submitted',
      })
      .select('id')
      .single()

    if (repErr || !report) {
      setError('Failed to create report. Check report number is unique.')
      setLoading(false)
      return
    }

    const filledParams = params.filter(p => p.parameter_name && p.value)
    if (filledParams.length > 0) {
      const qualityRows = filledParams.map(p => {
        const val = parseFloat(p.value)
        const min = p.min_spec ? parseFloat(p.min_spec) : null
        const max = p.max_spec ? parseFloat(p.max_spec) : null
        const inSpec = (min === null || val >= min) && (max === null || val <= max)
        return {
          report_id: report.id,
          parameter_name: p.parameter_name,
          value: val,
          unit: p.unit,
          min_spec: min,
          max_spec: max,
          is_within_spec: inSpec,
        }
      })
      await supabase.from('quality_values').insert(qualityRows)
    }

    setOpen(false)
    setLoading(false)
    setForm({ plant_id: plants[0]?.id ?? '', report_number: genReportNumber(), sample_taken_at: new Date().toISOString().slice(0, 16), notes: '' })
    setParams(DEFAULT_PARAMS)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        <Plus size={16} /> New Lab Report
      </button>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">New Lab Report</h3>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Report No.</label>
            <input
              required
              value={form.report_number}
              onChange={e => setField('report_number', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Plant</label>
            <select
              value={form.plant_id}
              onChange={e => setField('plant_id', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Sample Taken At</label>
          <input
            type="datetime-local"
            required
            value={form.sample_taken_at}
            onChange={e => setField('sample_taken_at', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Quality parameters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Quality Parameters</label>
            <button type="button" onClick={addParam} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
              <Plus size={12} /> Add row
            </button>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-1.5 text-xs text-gray-500 px-1">
              <span className="col-span-3">Parameter</span>
              <span className="col-span-2">Value</span>
              <span className="col-span-2">Unit</span>
              <span className="col-span-2">Min</span>
              <span className="col-span-2">Max</span>
              <span className="col-span-1" />
            </div>
            {params.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-1.5">
                {(['parameter_name', 'value', 'unit', 'min_spec', 'max_spec'] as const).map((field, fi) => (
                  <input
                    key={field}
                    value={row[field]}
                    onChange={e => setParam(i, field, e.target.value)}
                    placeholder={['e.g. Viscosity', '', 'cSt', 'min', 'max'][fi]}
                    className={`${fi === 0 ? 'col-span-3' : 'col-span-2'} bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500`}
                  />
                ))}
                <button type="button" onClick={() => removeParam(i)} className="col-span-1 text-gray-600 hover:text-red-400 flex items-center justify-center">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>
    </div>
  )
}
