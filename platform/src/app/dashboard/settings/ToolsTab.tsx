'use client'

import { useState } from 'react'
import { downloadCSV } from '@/lib/csv'
import DataExportPanel from './DataExportPanel'

// Tools tab: data export, CSV client import, daily backup, danger zone.
// Extracted verbatim from settings/page.tsx (previously the 'Tools' tab ===
// branch) -- fully self-contained, since none of its state (CSV import
// wizard, export-in-flight indicator) is read outside this tab.
export function ToolsTab() {
  const [exporting, setExporting] = useState<string | null>(null)

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvParsed, setCsvParsed] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  async function exportData(type: string) {
    setExporting(type)
    try {
      const res = await fetch(`/api/${type}`)
      const data = await res.json()
      const items = data[type] || data.data || []
      downloadCSV(items, `${type}-export`)
    } catch {
      alert(`Failed to export ${type}`)
    }
    setExporting(null)
  }

  async function runBackup() {
    if (!confirm('Run a manual backup now?')) return
    try {
      await fetch('/api/cron/backup', { method: 'POST' })
      alert('Backup completed successfully.')
    } catch {
      alert('Backup failed.')
    }
  }

  async function deleteAllData() {
    const confirmation = prompt('Type DELETE to permanently erase all data. This cannot be undone.')
    if (confirmation !== 'DELETE') return
    alert('Contact support to complete this action.')
  }

  function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length < 2) return { headers: [], rows: [] }

    // Parse a CSV line, handling quoted fields with commas inside
    function parseLine(line: string): string[] {
      const fields: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            current += '"'
            i++
          } else if (ch === '"') {
            inQuotes = false
          } else {
            current += ch
          }
        } else {
          if (ch === '"') {
            inQuotes = true
          } else if (ch === ',') {
            fields.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
      }
      fields.push(current.trim())
      return fields
    }

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
    const rows: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row)
    }
    return { headers, rows }
  }

  function handleCSVFile(file: File) {
    setCsvError(null)
    setImportResult(null)
    setCsvFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, rows } = parseCSV(text)

      if (rows.length === 0) {
        setCsvError('CSV file is empty or has no data rows.')
        setCsvParsed([])
        setCsvHeaders([])
        return
      }

      // Check required columns
      if (!headers.includes('name')) {
        setCsvError('Missing required column: "name". Your CSV must have a "name" column header.')
        setCsvParsed([])
        setCsvHeaders([])
        return
      }
      if (!headers.includes('phone')) {
        setCsvError('Missing required column: "phone". Your CSV must have a "phone" column header.')
        setCsvParsed([])
        setCsvHeaders([])
        return
      }

      // Filter to only recognized columns
      const recognized = ['name', 'phone', 'email', 'address', 'source', 'notes', 'status']
      const displayHeaders = headers.filter((h) => recognized.includes(h))

      setCsvHeaders(displayHeaders)
      setCsvParsed(rows)
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const template = 'name,phone,email,address,source,notes,status\nJane Doe,555-123-4567,jane@email.com,"123 Main St, Apt 4",referral,Great client,active\nJohn Smith,555-987-6543,,,website,,\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importClients() {
    if (csvParsed.length === 0) return
    setImporting(true)
    setImportResult(null)
    setCsvError(null)

    try {
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: csvParsed }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult(data)
        if (data.imported > 0) {
          // Clear parsed data on success
          setCsvParsed([])
          setCsvHeaders([])
          setCsvFile(null)
        }
      } else {
        setCsvError(data.error || 'Import failed.')
      }
    } catch {
      setCsvError('Network error. Please try again.')
    }
    setImporting(false)
  }

  function resetImport() {
    setCsvFile(null)
    setCsvParsed([])
    setCsvHeaders([])
    setCsvError(null)
    setImportResult(null)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Data Export</h3>
        <p className="text-sm text-slate-400 mb-4">Download your data as CSV files.</p>
        <div className="flex gap-3 flex-wrap">
          {[
            { key: 'clients', label: 'Export Clients' },
            { key: 'bookings', label: 'Export Bookings' },
            { key: 'team', label: 'Export Team' },
            { key: 'finance', label: 'Export Revenue' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => exportData(item.key)}
              disabled={exporting === item.key}
              className="bg-slate-50 border border-slate-200 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              {exporting === item.key ? 'Exporting...' : item.label}
            </button>
          ))}
        </div>
      </div>
      <DataExportPanel />
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Import Clients from CSV</h3>

        {/* Instructions */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-slate-700 font-medium mb-2">How to format your CSV file:</p>
          <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
            <li>The first row must be column headers</li>
            <li><span className="text-slate-900 font-medium">Required columns:</span> name, phone</li>
            <li><span className="text-slate-300">Optional columns:</span> email, address, source, notes, status</li>
            <li>Status values: active, lead, at_risk, churned, inactive (defaults to &quot;active&quot;)</li>
            <li>Phone formats accepted: 555-123-4567, (555) 123-4567, +15551234567</li>
            <li>If a field contains commas, wrap it in double quotes (e.g. &quot;123 Main St, Apt 4&quot;)</li>
            <li>Maximum 500 clients per import</li>
          </ul>
          <button
            onClick={downloadTemplate}
            className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            Download sample CSV template
          </button>
        </div>

        {/* File upload */}
        {!csvFile && !importResult && (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              id="csv-upload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCSVFile(file)
                e.target.value = ''
              }}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="text-slate-400 mb-2">
                <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Click to select a <span className="text-slate-900 font-medium">.csv</span> file</p>
              <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
            </label>
          </div>
        )}

        {/* CSV Parse Error */}
        {csvError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-4">
            <p className="text-sm text-red-400">{csvError}</p>
          </div>
        )}

        {/* Preview Table */}
        {csvParsed.length > 0 && !importResult && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-700">
                Preview: showing {Math.min(5, csvParsed.length)} of <span className="text-slate-900 font-medium">{csvParsed.length}</span> rows
              </p>
              <button onClick={resetImport} className="text-xs text-slate-400 hover:text-slate-300">
                Clear
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 text-xs text-slate-400 font-medium">#</th>
                    {csvHeaders.map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-slate-400 font-medium uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {csvParsed.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      {csvHeaders.map((h) => (
                        <td key={h} className={`px-3 py-2 ${row[h] ? 'text-slate-300' : 'text-slate-500'}`}>
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvParsed.length > 5 && (
              <p className="text-xs text-slate-400 mt-2">...and {csvParsed.length - 5} more rows</p>
            )}

            {/* Import button */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={importClients}
                disabled={importing}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 hover:bg-teal-700 transition-colors"
              >
                {importing ? 'Importing...' : `Import ${csvParsed.length} Client${csvParsed.length === 1 ? '' : 's'}`}
              </button>
              <button onClick={resetImport} className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="mt-4 space-y-3">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-green-400 font-medium">
                Import complete: {importResult.imported} client{importResult.imported === 1 ? '' : 's'} imported
              </p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-yellow-400 mt-1">
                  {importResult.skipped} row{importResult.skipped === 1 ? '' : 's'} skipped
                </p>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-400 font-medium mb-2">Errors ({importResult.errors.length}):</p>
                <ul className="text-xs text-red-400/80 space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={resetImport} className="text-sm text-slate-400 hover:text-slate-900 transition-colors">
              Import another file
            </button>
          </div>
        )}
      </div>
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Daily Backup</h3>
        <p className="text-sm text-slate-400 mb-4">Automated daily backups run at midnight. Last backup data is emailed to your business email.</p>
        <button
          onClick={runBackup}
          className="bg-slate-50 border border-slate-200 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-slate-500 hover:text-slate-900 transition-colors"
        >
          Run Backup Now
        </button>
      </div>
      <div className="border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Danger Zone</h3>
        <p className="text-sm text-slate-400 mb-4">Irreversible actions.</p>
        <button
          onClick={deleteAllData}
          className="text-red-400 border border-red-400/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-400/10 transition-colors"
        >
          Delete All Data
        </button>
      </div>
    </div>
  )
}
