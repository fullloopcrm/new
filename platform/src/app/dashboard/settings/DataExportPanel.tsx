'use client'

/**
 * Tenant admin panel to request the GDPR/CCPA compliance data export built by
 * the P1 backend (src/app/api/gdpr/export — GET ?format=zip|json[&clientId]).
 * Downloads the response as a file; does not attempt to render its contents.
 */
import { useState } from 'react'

type ExportFormat = 'zip' | 'json'

const FORMAT_LABEL: Record<ExportFormat, string> = {
  zip: 'Request full export (ZIP)',
  json: 'Request full export (JSON)',
}

export default function DataExportPanel() {
  const [pending, setPending] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadedAt, setDownloadedAt] = useState<number | null>(null)

  async function requestExport(format: ExportFormat) {
    setPending(format)
    setError(null)
    try {
      const res = await fetch(`/api/gdpr/export?format=${format}`)
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("You don't have permission to export tenant data. Ask an owner or admin.")
        } else {
          const body = await res.json().catch(() => null)
          setError(body?.error || 'Export failed. Try again.')
        }
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tenant-data-export.${format}`
      a.click()
      URL.revokeObjectURL(url)
      setDownloadedAt(Date.now())
    } catch {
      setError('Export failed. Check your connection and try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-1">Compliance Data Export (GDPR/CCPA)</h3>
      <p className="text-sm text-slate-400 mb-4">
        Download a complete export of your tenant&apos;s customer data — bookings, invoices,
        communications, and notes — bundled for a data subject access request or your own records.
      </p>
      <div className="flex gap-3 flex-wrap items-center">
        {(['zip', 'json'] as ExportFormat[]).map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => requestExport(format)}
            disabled={pending !== null}
            className="bg-slate-50 border border-slate-200 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:border-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            {pending === format ? 'Preparing export…' : FORMAT_LABEL[format]}
          </button>
        ))}
        {downloadedAt && !error && <span className="text-xs text-teal-600">Export downloaded</span>}
      </div>
      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </div>
  )
}
