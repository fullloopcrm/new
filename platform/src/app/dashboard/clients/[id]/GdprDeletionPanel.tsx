'use client'

/**
 * P4: GDPR/CCPA right-to-be-forgotten request UI for a single client.
 * Talks to POST/DELETE /api/clients/[id]/gdpr (P2) — opens/cancels a 30-day
 * grace-period deletion request. The client row itself isn't touched until
 * the grace window elapses and the purge cron runs.
 */
import { useState } from 'react'

interface GdprDeletionPanelProps {
  clientId: string
  deletionRequestedAt: string | null | undefined
  deletionPurgeAt: string | null | undefined
  deletedAt: string | null | undefined
  onChange: (fields: { deletion_requested_at: string | null; deletion_purge_at: string | null }) => void
}

export default function GdprDeletionPanel({
  clientId,
  deletionRequestedAt,
  deletionPurgeAt,
  deletedAt,
  onChange,
}: GdprDeletionPanelProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pending = !deletedAt && !!deletionRequestedAt

  async function requestDeletion() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/gdpr`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || 'Could not submit the deletion request.')
        return
      }
      onChange({
        deletion_requested_at: data.request?.requested_at ?? new Date().toISOString(),
        deletion_purge_at: data.request?.purge_at ?? null,
      })
      setConfirming(false)
    } catch {
      setError('Could not submit the deletion request.')
    } finally {
      setBusy(false)
    }
  }

  async function cancelDeletion() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/gdpr`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.cancelled) {
        setError(data?.error || 'Could not cancel the deletion request.')
        return
      }
      onChange({ deletion_requested_at: null, deletion_purge_at: null })
    } catch {
      setError('Could not cancel the deletion request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-1">Privacy &amp; Data</h3>
      <p className="text-xs text-slate-400 mb-4">GDPR / CCPA right-to-be-forgotten.</p>

      {deletedAt ? (
        <p className="text-sm text-slate-400">
          This client&apos;s personal data was permanently anonymized on{' '}
          {new Date(deletedAt).toLocaleDateString()}.
        </p>
      ) : pending ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Deletion requested {deletionRequestedAt && new Date(deletionRequestedAt).toLocaleDateString()}.
            Personal data will be permanently anonymized on{' '}
            {deletionPurgeAt ? new Date(deletionPurgeAt).toLocaleDateString() : 'the scheduled date'}{' '}
            unless cancelled before then.
          </div>
          <button
            onClick={cancelDeletion}
            disabled={busy}
            className="w-full text-sm border border-slate-200 rounded-lg py-2 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? 'Cancelling…' : 'Cancel Deletion Request'}
          </button>
        </div>
      ) : confirming ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            This opens a 30-day grace period. Bookings, invoices, and financial records are kept for
            reporting/tax purposes, but this client&apos;s name, contact info, address, and notes will be
            permanently erased when the window elapses. You can cancel any time before then.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="flex-1 text-sm border border-slate-200 rounded-lg py-2 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={requestDeletion}
              disabled={busy}
              className="flex-1 text-sm bg-red-500 text-white rounded-lg py-2 font-semibold hover:bg-red-600 disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Confirm Request'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full text-sm text-red-500 border border-red-200 rounded-lg py-2 hover:bg-red-50"
        >
          Request Data Deletion
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
