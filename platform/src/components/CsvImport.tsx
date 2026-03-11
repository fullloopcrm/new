'use client'

import { useState, useRef } from 'react'

type ParsedRow = Record<string, string>

const KNOWN_COLUMNS = ['name', 'phone', 'email', 'address', 'notes', 'source', 'status']

const COLUMN_ALIASES: Record<string, string> = {
  'first name': 'name', 'first_name': 'name', 'firstname': 'name', 'full name': 'name', 'full_name': 'name',
  'last name': 'name_last', 'last_name': 'name_last', 'lastname': 'name_last',
  'phone number': 'phone', 'phone_number': 'phone', 'mobile': 'phone', 'cell': 'phone', 'telephone': 'phone',
  'email address': 'email', 'email_address': 'email', 'e-mail': 'email',
  'street address': 'address', 'street_address': 'address', 'full address': 'address', 'mailing address': 'address',
  'city': '_city', 'state': '_state', 'zip': '_zip', 'zip code': '_zip', 'zip_code': '_zip',
  'note': 'notes', 'comment': 'notes', 'comments': 'notes',
  'how found': 'source', 'referral': 'source', 'lead source': 'source', 'lead_source': 'source',
}

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const headerLine = lines[0]
  const headers = splitCSVLine(headerLine).map(h => h.trim().toLowerCase())

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i])
    const row: ParsedRow = {}
    headers.forEach((h, j) => { row[h] = vals[j]?.trim() || '' })
    rows.push(row)
  }
  return { headers, rows }
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function autoMapColumn(header: string): string {
  const h = header.toLowerCase().trim()
  if (KNOWN_COLUMNS.includes(h)) return h
  if (COLUMN_ALIASES[h]) return COLUMN_ALIASES[h]
  return ''
}

function mapRows(rows: ParsedRow[], headers: string[], mapping: Record<string, string>): Record<string, string>[] {
  return rows.map(row => {
    const mapped: Record<string, string> = {}
    headers.forEach(h => {
      const target = mapping[h]
      if (!target || target === '_skip') return
      if (target === 'name_last') {
        mapped.name = [mapped.name || '', row[h]].filter(Boolean).join(' ')
      } else if (target === '_city' || target === '_state' || target === '_zip') {
        mapped.address = [mapped.address || '', row[h]].filter(Boolean).join(', ')
      } else if (target === 'name' && mapped.name) {
        mapped.name = mapped.name + ' ' + row[h]
      } else {
        mapped[target] = row[h]
      }
    })
    return mapped
  }).filter(r => r.name)
}

export default function CsvImport({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'result'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [mappedData, setMappedData] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; duplicates: number; errors: string[]; duplicateDetails?: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers: h, rows } = parseCSV(text)
      if (h.length === 0) return
      setHeaders(h)
      setRawRows(rows)
      const autoMap: Record<string, string> = {}
      h.forEach(col => { autoMap[col] = autoMapColumn(col) })
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsText(file)
  }

  function confirmMapping() {
    const mapped = mapRows(rawRows, headers, mapping)
    setMappedData(mapped)
    setStep('preview')
  }

  async function doImport() {
    setImporting(true)
    try {
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: mappedData }),
      })
      const data = await res.json()
      setResult(data)
      setStep('result')
    } catch {
      setResult({ imported: 0, skipped: 0, duplicates: 0, errors: ['Network error'] })
      setStep('result')
    }
    setImporting(false)
  }

  const inputClass = 'w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white'

  return (
    <div className="border border-slate-200 rounded-lg p-6 bg-white max-w-4xl">

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 text-slate-300">CSV</div>
          <h3 className="text-lg font-heading font-semibold text-slate-900 mb-2">Import Clients from CSV</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Upload a CSV file with your client list. We&apos;ll detect columns automatically and let you map them.
            Requires at least <strong>name</strong> and <strong>phone</strong>.
          </p>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-lg text-sm font-cta font-semibold transition-colors">
            Choose CSV File
          </button>
          <p className="text-xs text-slate-400 mt-4">Max 5,000 rows. Duplicates are auto-detected by email and phone.</p>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'map' && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-slate-900 mb-1">Map Columns</h3>
          <p className="text-sm text-slate-500 mb-4">{rawRows.length} rows found. Map your CSV columns to client fields.</p>
          <div className="space-y-2">
            {headers.map(h => (
              <div key={h} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-40 truncate font-mono">{h}</span>
                <span className="text-slate-300">→</span>
                <select value={mapping[h] || ''} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                  className={inputClass + ' max-w-[200px]'}>
                  <option value="">Skip</option>
                  <option value="name">Name</option>
                  <option value="name_last">Last Name (appends to name)</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="address">Address</option>
                  <option value="_city">City (appends to address)</option>
                  <option value="_state">State (appends to address)</option>
                  <option value="_zip">Zip (appends to address)</option>
                  <option value="notes">Notes</option>
                  <option value="source">Source</option>
                  <option value="status">Status</option>
                </select>
                <span className="text-xs text-slate-400 truncate">{rawRows[0]?.[h] || '—'}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep('upload')} className="text-sm text-slate-500 hover:text-slate-700">Back</button>
            <button onClick={confirmMapping} disabled={!Object.values(mapping).includes('name')}
              className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
              Preview Import
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-slate-900 mb-1">Preview</h3>
          <p className="text-sm text-slate-500 mb-4">{mappedData.length} clients ready to import. Showing first 10.</p>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Phone</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Email</th>
                  <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium">Address</th>
                </tr>
              </thead>
              <tbody>
                {mappedData.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{r.name}</td>
                    <td className="px-3 py-2 text-slate-500 font-mono">{r.phone || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.email || '—'}</td>
                    <td className="px-3 py-2 text-slate-400 truncate max-w-[200px]">{r.address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mappedData.length > 10 && <p className="text-xs text-slate-400 mt-2">...and {mappedData.length - 10} more</p>}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep('map')} className="text-sm text-slate-500 hover:text-slate-700">Back</button>
            <button onClick={doImport} disabled={importing}
              className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 transition-colors">
              {importing ? `Importing ${mappedData.length} clients...` : `Import ${mappedData.length} Clients`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <div>
          <h3 className="text-lg font-heading font-semibold text-slate-900 mb-4">Import Complete</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.imported}</p>
              <p className="text-xs text-green-600">Imported</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{result.duplicates || 0}</p>
              <p className="text-xs text-yellow-600">Duplicates Skipped</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-500">{result.errors?.length || 0}</p>
              <p className="text-xs text-red-500">Errors</p>
            </div>
          </div>

          {result.duplicateDetails && result.duplicateDetails.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 font-semibold mb-1">Duplicates:</p>
              <div className="max-h-32 overflow-y-auto text-xs text-yellow-700 bg-yellow-50 rounded p-2 space-y-0.5">
                {result.duplicateDetails.map((d, i) => <p key={i}>{d}</p>)}
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 font-semibold mb-1">Errors:</p>
              <div className="max-h-32 overflow-y-auto text-xs text-red-600 bg-red-50 rounded p-2 space-y-0.5">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            </div>
          )}

          <button onClick={() => { onComplete(); setStep('upload') }}
            className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  )
}
