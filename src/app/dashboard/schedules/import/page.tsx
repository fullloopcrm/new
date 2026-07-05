'use client'

/**
 * Schedules import wizard — upload a CSV of existing/upcoming appointments, map
 * columns, preview, and import. Each row must match an already-imported client
 * (by phone or name). Rows with a recurring_type become recurring schedules; the
 * rest become one-time bookings. Posts to /api/dashboard/schedules/import.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'

const FIELDS: Array<{ key: string; label: string; required?: boolean; hint?: string }> = [
  { key: 'client_name', label: 'Client name', required: true, hint: 'matched to an imported client' },
  { key: 'client_phone', label: 'Client phone', hint: 'preferred match key' },
  { key: 'start', label: 'Start date/time', hint: 'one-time appts; leave blank for recurring' },
  { key: 'duration_hours', label: 'Duration (hrs)' },
  { key: 'service_type', label: 'Service' },
  { key: 'price', label: 'Price' },
  { key: 'staff_name', label: 'Assigned staff' },
  { key: 'recurring_type', label: 'Recurring', hint: 'weekly / biweekly / monthly' },
  { key: 'day_of_week', label: 'Day (recurring)' },
  { key: 'preferred_time', label: 'Time (recurring)' },
  { key: 'notes', label: 'Notes' },
]

type Result = { importedBookings: number; importedRecurring: number; unmatched: number; unmatchedDetails?: string[]; errors?: string[] }

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some((v) => v.trim() !== '')) rows.push(row); row = [] }
    else field += c
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((v) => v.trim() !== '')) rows.push(row) }
  return rows
}

function autoMap(headers: string[]): Record<string, number> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const hints: Record<string, string[]> = {
    client_name: ['clientname', 'client', 'customer', 'customername', 'name'],
    client_phone: ['clientphone', 'phone', 'mobile', 'cell'],
    start: ['start', 'starttime', 'date', 'datetime', 'appointment', 'when'],
    duration_hours: ['duration', 'durationhours', 'hours', 'length'],
    service_type: ['service', 'servicetype', 'job', 'type'],
    price: ['price', 'amount', 'cost', 'total'],
    staff_name: ['staff', 'staffname', 'cleaner', 'tech', 'assignedto', 'worker', 'employee'],
    recurring_type: ['recurring', 'recurringtype', 'frequency', 'repeat'],
    day_of_week: ['day', 'dayofweek', 'weekday'],
    preferred_time: ['time', 'preferredtime'],
    notes: ['notes', 'note', 'comments'],
  }
  const map: Record<string, number> = {}
  for (const f of FIELDS) {
    const idx = headers.findIndex((h) => (hints[f.key] || []).includes(norm(h)))
    if (idx >= 0) map[f.key] = idx
  }
  return map
}

export default function ScheduleImportPage() {
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [map, setMap] = useState<Record<string, number>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [err, setErr] = useState('')

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCSV(String(reader.result || ''))
      if (parsed.length < 2) { setErr('That file has no data rows.'); return }
      const [head, ...bodyRows] = parsed
      setHeaders(head); setRows(bodyRows); setMap(autoMap(head))
    }
    reader.readAsText(file)
  }

  const preview = useMemo(() => rows.slice(0, 5), [rows])
  const noClient = map.client_name === undefined && map.client_phone === undefined

  async function runImport() {
    setImporting(true); setErr(''); setResult(null)
    const payload = rows.map((r) => {
      const o: Record<string, string> = {}
      for (const f of FIELDS) { const idx = map[f.key]; if (idx !== undefined && r[idx] !== undefined) o[f.key] = (r[idx] || '').trim() }
      return o
    })
    const res = await fetch('/api/dashboard/schedules/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: payload }),
    })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setErr(data.error || 'Import failed.'); return }
    setResult(data)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/jobs" className="text-sm text-teal-600 hover:underline">&larr; Production</Link>
        <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900">Import your schedule</h1>
        <p className="text-sm text-slate-500">Bring in existing appointments. Each row matches an imported client by phone or name — <strong>import your clients first</strong>. Rows with a recurring type become recurring schedules; the rest are one-time jobs.</p>
      </div>

      {!headers.length && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white py-14 text-center hover:border-teal-400">
          <span className="text-sm font-medium text-slate-700">Choose a CSV file</span>
          <span className="text-xs text-slate-400">client name (or phone) required; a start date for one-time, or a recurring type for repeating</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </label>
      )}

      {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {headers.length > 0 && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-1 font-heading text-lg font-semibold text-slate-900">Map your columns</h2>
            <p className="mb-4 text-sm text-slate-500">{rows.length} rows found.</p>
            <div className="space-y-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[150px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    {f.label}{f.required && <span className="text-red-500"> *</span>}
                    {f.hint && <span className="block text-[10px] font-normal text-slate-400">{f.hint}</span>}
                  </label>
                  <select
                    value={map[f.key] ?? ''}
                    onChange={(e) => setMap((m) => { const n = { ...m }; if (e.target.value === '') delete n[f.key]; else n[f.key] = Number(e.target.value); return n })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">— skip —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {!noClient && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preview (first 5)</p>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500">{FIELDS.filter((f) => map[f.key] !== undefined).map((f) => <th key={f.key} className="px-2 py-1 whitespace-nowrap">{f.label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((r, ri) => (<tr key={ri}>{FIELDS.filter((f) => map[f.key] !== undefined).map((f) => <td key={f.key} className="px-2 py-1 whitespace-nowrap text-slate-700">{r[map[f.key]] || ''}</td>)}</tr>))}
                </tbody>
              </table>
            </div>
          )}

          {noClient && <p className="text-sm text-amber-600">Map Client name or Client phone to continue — appointments must attach to a client.</p>}

          <div className="flex gap-2">
            <button onClick={() => { setHeaders([]); setRows([]); setMap({}) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Start over</button>
            <button onClick={runImport} disabled={importing || noClient} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {importing ? 'Importing…' : `Import ${rows.length} rows`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Import complete</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Stat n={result.importedBookings} label="One-time jobs" color="text-teal-600" />
            <Stat n={result.importedRecurring} label="Recurring" color="text-teal-600" />
            <Stat n={result.unmatched} label="No client match" color="text-amber-600" />
            <Stat n={result.errors?.length || 0} label="Errors" color="text-red-600" />
          </div>
          {!!result.unmatchedDetails?.length && (
            <>
              <p className="mt-4 text-xs font-medium text-slate-500">Unmatched (import these clients first, then re-run):</p>
              <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-600">{result.unmatchedDetails.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </>
          )}
          {!!result.errors?.length && <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-red-600">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
          <div className="mt-6 flex gap-2">
            <Link href="/dashboard/calendar" className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">View calendar</Link>
            <button onClick={() => { setHeaders([]); setRows([]); setMap({}); setResult(null) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Import another file</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 py-3">
      <p className={`text-2xl font-bold ${color}`}>{n}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
