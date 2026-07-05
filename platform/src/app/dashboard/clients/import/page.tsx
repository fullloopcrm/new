'use client'

/**
 * Client import wizard — upload a CSV of an existing customer list, map its
 * columns to Full Loop client fields, preview, and import. Posts to the existing
 * /api/clients/import (validate + dedupe by email/phone + batch insert).
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'

// Target fields the import API understands. name + phone are required.
const FIELDS: Array<{ key: string; label: string; required?: boolean }> = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'status', label: 'Status' },
]

type Result = { imported: number; skipped: number; duplicates: number; duplicateDetails?: string[]; errors?: string[] }

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, commas, CRLF. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((v) => v.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((v) => v.trim() !== '')) rows.push(row) }
  return rows
}

/** Guess which CSV column maps to a field from its header name. */
function autoMap(headers: string[]): Record<string, number> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const hints: Record<string, string[]> = {
    name: ['name', 'client', 'customer', 'fullname', 'contact'],
    phone: ['phone', 'mobile', 'cell', 'tel', 'phonenumber'],
    email: ['email', 'emailaddress', 'e-mail'],
    address: ['address', 'street', 'location', 'addr'],
    source: ['source', 'leadsource', 'referral'],
    notes: ['notes', 'note', 'comment', 'comments'],
    status: ['status', 'state'],
  }
  const map: Record<string, number> = {}
  for (const f of FIELDS) {
    const idx = headers.findIndex((h) => (hints[f.key] || []).includes(norm(h)))
    if (idx >= 0) map[f.key] = idx
  }
  return map
}

export default function ClientImportPage() {
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
      const [head, ...body] = parsed
      setHeaders(head)
      setRows(body)
      setMap(autoMap(head))
    }
    reader.readAsText(file)
  }

  const preview = useMemo(() => rows.slice(0, 5), [rows])
  const missingRequired = FIELDS.filter((f) => f.required && map[f.key] === undefined)

  async function runImport() {
    setImporting(true); setErr(''); setResult(null)
    const clients = rows.map((r) => {
      const o: Record<string, string> = {}
      for (const f of FIELDS) {
        const idx = map[f.key]
        if (idx !== undefined && r[idx] !== undefined) o[f.key] = (r[idx] || '').trim()
      }
      return o
    }).filter((c) => c.name && c.phone)
    const res = await fetch('/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients }),
    })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setErr(data.error || 'Import failed.'); return }
    setResult(data)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/clients" className="text-sm text-teal-600 hover:underline">&larr; Clients</Link>
        <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900">Import your client list</h1>
        <p className="text-sm text-slate-500">Upload a CSV export from your old CRM or a spreadsheet. We map the columns and skip duplicates automatically.</p>
      </div>

      {!headers.length && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white py-14 text-center hover:border-teal-400">
          <span className="text-sm font-medium text-slate-700">Choose a CSV file</span>
          <span className="text-xs text-slate-400">name and phone are required; email, address, source, notes, status optional</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </label>
      )}

      {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      {headers.length > 0 && !result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-1 font-heading text-lg font-semibold text-slate-900">Map your columns</h2>
            <p className="mb-4 text-sm text-slate-500">{rows.length} rows found. Match each Full Loop field to a column from your file.</p>
            <div className="space-y-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[110px_1fr] items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">
                    {f.label}{f.required && <span className="text-red-500"> *</span>}
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

          {map.name !== undefined && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preview (first 5)</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    {FIELDS.filter((f) => map[f.key] !== undefined).map((f) => <th key={f.key} className="px-2 py-1">{f.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((r, ri) => (
                    <tr key={ri}>
                      {FIELDS.filter((f) => map[f.key] !== undefined).map((f) => <td key={f.key} className="px-2 py-1 text-slate-700">{r[map[f.key]] || ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {missingRequired.length > 0 && (
            <p className="text-sm text-amber-600">Map {missingRequired.map((f) => f.label).join(' and ')} to continue — they&apos;re required.</p>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setHeaders([]); setRows([]); setMap({}) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Start over</button>
            <button onClick={runImport} disabled={importing || missingRequired.length > 0} className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {importing ? 'Importing…' : `Import ${rows.length} clients`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Import complete</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat n={result.imported} label="Imported" color="text-teal-600" />
            <Stat n={result.duplicates} label="Duplicates skipped" color="text-amber-600" />
            <Stat n={result.errors?.length || 0} label="Errors" color="text-red-600" />
          </div>
          {!!result.errors?.length && (
            <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs text-red-600">
              {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <div className="mt-6 flex gap-2">
            <Link href="/dashboard/clients" className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">View clients</Link>
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
