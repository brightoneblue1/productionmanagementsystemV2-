import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrintButton from './PrintButton'

export default async function PrintReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: report } = await supabase
    .from('lab_reports')
    .select(`
      id, report_number, status, sample_taken_at, notes, created_at,
      plants ( name ),
      submitter:profiles!lab_reports_submitted_by_fkey ( full_name ),
      quality_values ( parameter_name, value, unit, min_spec, max_spec, is_within_spec )
    `)
    .eq('id', id)
    .single()

  if (!report) notFound()

  const passCount = report.quality_values.filter((q: {is_within_spec: boolean | null}) => q.is_within_spec === true).length
  const failCount = report.quality_values.filter((q: {is_within_spec: boolean | null}) => q.is_within_spec === false).length

  return (
    <html lang="en">
      <head>
        <title>{report.report_number} — Lab Report</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 13px; font-weight: 600; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
          .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid; }
          .pass { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
          .fail { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
          .na   { background: #f3f4f6; color: #6b7280; border-color: #d1d5db; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
          tr:last-child td { border-bottom: none; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .summary-card .value { font-size: 22px; font-weight: 700; }
          .summary-card .label { font-size: 11px; color: #6b7280; margin-top: 2px; }
          .notes { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-top: 8px; color: #374151; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
          @media print {
            body { padding: 16px; }
            button { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Lab Report — {report.report_number}</h1>
            <p className="meta">
              {(report.plants as unknown as {name:string}|null)?.name ?? 'All Plants'} ·
              Sample taken: {new Date(report.sample_taken_at).toLocaleString('en-GB')} ·
              Submitted by: {(report.submitter as unknown as {full_name:string}|null)?.full_name ?? '—'} ·
              Status: <strong>{report.status}</strong>
            </p>
          </div>
          <PrintButton />
        </div>

        <div className="summary">
          <div className="summary-card">
            <div className="value">{report.quality_values.length}</div>
            <div className="label">Parameters Tested</div>
          </div>
          <div className="summary-card" style={{ borderColor: failCount > 0 ? '#fca5a5' : '#6ee7b7' }}>
            <div className="value" style={{ color: failCount > 0 ? '#dc2626' : '#059669' }}>{failCount > 0 ? failCount + ' Failed' : 'All Pass'}</div>
            <div className="label">{passCount} passed · {failCount} failed</div>
          </div>
          <div className="summary-card">
            <div className="value" style={{ textTransform: 'capitalize' }}>{report.status}</div>
            <div className="label">Report Status</div>
          </div>
        </div>

        <h2>Quality Parameters</h2>
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Min Spec</th>
              <th>Max Spec</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(report.quality_values as any[]).map((q, i) => (
              <tr key={i}>
                <td>{q.parameter_name}</td>
                <td><strong>{q.value}</strong></td>
                <td style={{ color: '#6b7280' }}>{q.unit}</td>
                <td style={{ color: '#6b7280' }}>{q.min_spec ?? '—'}</td>
                <td style={{ color: '#6b7280' }}>{q.max_spec ?? '—'}</td>
                <td>
                  {q.is_within_spec === null
                    ? <span className="badge na">N/A</span>
                    : q.is_within_spec
                    ? <span className="badge pass">PASS</span>
                    : <span className="badge fail">FAIL</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.notes && (
          <>
            <h2>Notes</h2>
            <div className="notes">{report.notes}</div>
          </>
        )}

        <div className="footer">
          <span>Worth Oil Processors — Confidential</span>
          <span>Generated: {new Date().toLocaleString('en-GB')}</span>
        </div>

      </body>
    </html>
  )
}
