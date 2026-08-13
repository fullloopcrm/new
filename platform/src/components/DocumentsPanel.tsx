'use client'

/**
 * Generic file-attachment panel for the new `client_documents` feature.
 * Talks to /api/uploads (existing generic tenant-scoped storage primitive)
 * to actually store the file, then /api/dashboard/documents to create the
 * tracking row. No version history, no folders -- a real working list +
 * upload + download, styled to match this dashboard's existing panels (see
 * GdprDeletionPanel.tsx / hr/[id]/page.tsx's Card).
 *
 * Two mount modes:
 *   - clientId set    -> client-scoped documents (client detail page).
 *   - clientId omitted -> tenant-level documents (platform-admin business
 *     detail page, e.g. attaching a signed sales proposal to the tenant's
 *     own record). That page has its own admin_token session rather than a
 *     tenant dashboard session, so tenantId is passed through explicitly and
 *     sent as `tenant_id` -- the API route falls back to requireAdmin() when
 *     it sees that param instead of a dashboard session.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type DocumentRow = {
  id: string
  file_name: string
  file_url: string
  file_size_bytes: number | null
  content_type: string | null
  created_at: string
}

interface DocumentsPanelProps {
  clientId?: string
  tenantId?: string
  title?: string
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function apiUrl(base: string, clientId: string | undefined, tenantId: string | undefined): string {
  const params = new URLSearchParams()
  if (clientId) params.set('client_id', clientId)
  if (tenantId) params.set('tenant_id', tenantId)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export default function DocumentsPanel({ clientId, tenantId, title }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/dashboard/documents', clientId, tenantId))
      const data = await res.json().catch(() => null)
      if (res.ok) setDocuments(data?.documents || [])
      else setError(data?.error || 'Could not load documents.')
    } catch {
      setError('Could not load documents.')
    } finally {
      setLoading(false)
    }
  }, [clientId, tenantId])

  useEffect(() => {
    load()
  }, [load])

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('folder', 'client-documents')
      const upRes = await fetch('/api/uploads', { method: 'POST', body: fd })
      const upData = await upRes.json().catch(() => null)
      if (!upRes.ok) throw new Error(upData?.error || 'Upload failed')

      const createRes = await fetch('/api/dashboard/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          tenant_id: tenantId,
          file_name: file.name,
          file_url: upData.url,
          file_size_bytes: file.size,
          content_type: file.type,
        }),
      })
      const createData = await createRes.json().catch(() => null)
      if (!createRes.ok) throw new Error(createData?.error || 'Could not save document record')

      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setError(null)
    try {
      const res = await fetch(apiUrl(`/api/dashboard/documents?id=${id}`, undefined, tenantId), { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Could not delete document')
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete document')
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">{title || 'Documents'}</h3>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-slate-400 mb-4">No documents yet.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-700 hover:underline truncate flex-1 min-w-0"
              >
                {doc.file_name}
              </a>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(doc.created_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}
                {doc.file_size_bytes ? ` · ${formatSize(doc.file_size_bytes)}` : ''}
              </span>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          disabled={uploading}
          className="text-sm text-slate-600 flex-1 min-w-0"
        />
        {uploading && <span className="text-xs text-slate-400 whitespace-nowrap">Uploading...</span>}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
