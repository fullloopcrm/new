'use client'

/**
 * Legal Overlook — passive compliance tip feed. Every tip is static,
 * attorney-approved content matched against this tenant's own license/
 * insurance data (see /api/cron/legal-overlook-check). There is no input
 * field anywhere on this page by design: tips can only be read or
 * dismissed, never replied to, and nothing here is generated live.
 */
import { useEffect, useState } from 'react'

type Tip = {
  id: string
  trigger_type: string
  surfaced_at: string
  legal_tips: {
    title: string
    body: string
    source_citation: string | null
    effective_date: string
  } | null
}

const TRIGGER_LABEL: Record<string, string> = {
  license_expiring: 'License expiring soon',
  license_missing: 'No license on file',
  insurance_expiring: 'Insurance expiring soon',
  insurance_missing: 'No insurance on file',
  always: 'General',
}

export default function LegalOverlookPage() {
  const [tips, setTips] = useState<Tip[]>([])
  const [ackAt, setAckAt] = useState<string | null | undefined>(undefined)
  const [acking, setAcking] = useState(false)

  const load = () => {
    fetch('/api/dashboard/legal')
      .then((r) => r.json())
      .then((data) => {
        setTips(data.tips || [])
        setAckAt(data.disclaimerAcknowledgedAt ?? null)
      })
      .catch(() => setAckAt(null))
  }

  useEffect(load, [])

  const acknowledge = async () => {
    setAcking(true)
    try {
      await fetch('/api/dashboard/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge_disclaimer' }),
      })
      setAckAt(new Date().toISOString())
    } finally {
      setAcking(false)
    }
  }

  const dismiss = async (notificationId: string) => {
    setTips((prev) => prev.filter((t) => t.id !== notificationId))
    await fetch('/api/dashboard/legal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', notificationId }),
    }).catch(() => load())
  }

  if (ackAt === undefined) return null

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Legal Overlook</h1>
        <p className="text-sm text-slate-500 mt-1">
          Passive compliance tips based on your license and insurance info. Not legal advice — always
          confirm requirements with a licensed attorney in your state.
        </p>
      </div>

      {!ackAt ? (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-6 space-y-3">
          <h3 className="font-medium text-amber-900">Before you continue</h3>
          <p className="text-sm text-amber-900">
            This page surfaces static, attorney-reviewed tips and reminders relevant to your trade and
            state. Full Loop CRM does not provide legal advice, does not answer legal questions, and is
            not responsible for your compliance with any law or regulation. Tips are informational only —
            confirm anything that matters with your own attorney.
          </p>
          <button
            onClick={acknowledge}
            disabled={acking}
            className="px-4 py-2 rounded-md bg-amber-900 text-white text-sm font-medium disabled:opacity-50"
          >
            I understand — show my tips
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            Not legal advice. Static, attorney-reviewed content only — always confirm with a licensed
            attorney in your state.
          </p>

          {tips.length === 0 ? (
            <div className="border border-slate-200 rounded-lg p-6 text-sm text-slate-400">
              No open tips right now.
            </div>
          ) : (
            <div className="space-y-4">
              {tips.map((t) => (
                <div key={t.id} className="border border-slate-200 rounded-lg p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        {TRIGGER_LABEL[t.trigger_type] || t.trigger_type}
                      </span>
                      <h3 className="font-medium mt-1">{t.legal_tips?.title}</h3>
                    </div>
                    <button
                      onClick={() => dismiss(t.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{t.legal_tips?.body}</p>
                  {t.legal_tips?.source_citation && (
                    <p className="text-xs text-slate-400 mt-3">Source: {t.legal_tips.source_citation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
