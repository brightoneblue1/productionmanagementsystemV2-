'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react'
import { saveShiftReport, signOffShiftReport } from './shiftActions'

interface ShiftReport {
  id: string
  status: string
  total_produced_liters: number
  spillage_liters: number
  non_conforming_liters: number
  net_production_liters: number
  spillage_description: string | null
  non_conforming_reason: string | null
  outstanding_issues: string | null
  handover_notes: string | null
}

function Field({ label, name, type = 'number', placeholder, defaultValue, required = false }: {
  label: string; name: string; type?: string; placeholder?: string; defaultValue?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          name={name}
          rows={2}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
        />
      ) : (
        <input
          type={type}
          name={name}
          step="any"
          min={0}
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      )}
    </div>
  )
}

export default function ShiftReportPanel({
  shiftId,
  canManage,
  existingReport,
}: {
  shiftId: string
  canManage: boolean
  existingReport: ShiftReport | null
}) {
  const [open, setOpen]         = useState(false)
  const [error, setError]       = useState('')
  const [pending, startTrans]   = useTransition()

  async function handleSubmit(formData: FormData) {
    setError('')
    startTrans(async () => {
      const result = await saveShiftReport(formData)
      if ('error' in result) setError(result.error ?? '')
      else setOpen(false)
    })
  }

  async function handleSignOff() {
    if (!existingReport) return
    startTrans(async () => {
      await signOffShiftReport(existingReport.id)
    })
  }

  const report = existingReport
  const net = report ? report.net_production_liters : null

  return (
    <div className="border-t border-gray-800 mt-3 pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
      >
        <FileText size={13} />
        {report
          ? `Shift Report · ${report.status === 'signed_off' ? '✓ Signed off' : 'Submitted'}`
          : 'Write Shift Report'}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {/* Summary if report exists */}
          {report && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Gross Production', value: report.total_produced_liters, color: 'text-white' },
                { label: 'Spillage', value: report.spillage_liters, color: 'text-red-400' },
                { label: 'Non-Conforming', value: report.non_conforming_liters, color: 'text-yellow-400' },
                { label: 'Net Production', value: net ?? 0, color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className={`text-base font-bold ${color}`}>{value.toLocaleString()} L</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {report?.spillage_description && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Spillage: </span>{report.spillage_description}</p>
          )}
          {report?.non_conforming_reason && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Non-conforming: </span>{report.non_conforming_reason}</p>
          )}
          {report?.outstanding_issues && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Outstanding: </span>{report.outstanding_issues}</p>
          )}
          {report?.handover_notes && (
            <p className="text-xs text-gray-400"><span className="text-gray-500">Handover: </span>{report.handover_notes}</p>
          )}

          {/* Sign off button */}
          {report && report.status === 'submitted' && canManage && (
            <button
              onClick={handleSignOff}
              disabled={pending}
              className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={13} /> Sign Off Shift
            </button>
          )}

          {/* Form — always show if no report, or show for edit */}
          {(!report || report.status === 'draft') && (
            <form action={handleSubmit} className="space-y-3">
              <input type="hidden" name="shift_id" value={shiftId} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Total Produced (L)" name="total_produced_liters" placeholder="e.g. 45000" required
                  defaultValue={report?.total_produced_liters?.toString()} />
                <Field label="Spillage (L)" name="spillage_liters" placeholder="0"
                  defaultValue={report?.spillage_liters?.toString()} />
                <Field label="Non-Conforming (L)" name="non_conforming_liters" placeholder="0"
                  defaultValue={report?.non_conforming_liters?.toString()} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Spillage Description" name="spillage_description" type="textarea"
                  placeholder="Cause, location, action taken…"
                  defaultValue={report?.spillage_description ?? ''} />
                <Field label="Non-Conforming Reason" name="non_conforming_reason" type="textarea"
                  placeholder="Why rejected, disposition…"
                  defaultValue={report?.non_conforming_reason ?? ''} />
              </div>

              <Field label="Outstanding Issues" name="outstanding_issues" type="textarea"
                placeholder="Any unresolved problems to hand over…"
                defaultValue={report?.outstanding_issues ?? ''} />

              <Field label="Handover Notes" name="handover_notes" type="textarea"
                placeholder="Key info for the next shift…"
                defaultValue={report?.handover_notes ?? ''} />

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit" disabled={pending}
                className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {pending ? 'Saving…' : 'Submit Report'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
