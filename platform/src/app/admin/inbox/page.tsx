'use client'

import { useEffect, useState, useCallback } from 'react'

interface InboundEmail {
  id: string
  from_address: string | null
  to_address: string | null
  subject: string | null
  text_body: string | null
  html_body: string | null
  status: string
  received_at: string
}

export default function AdminInboxPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([])
  const [counts, setCounts] = useState({ total: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchInbox = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/inbox')
    if (res.ok) {
      const d = await res.json()
      setEmails(d.emails || [])
      setCounts(d.counts || { total: 0, unread: 0 })
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchInbox() }, [fetchInbox])

  const selected = emails.find((e) => e.id === selectedId) || null

  async function open(e: InboundEmail) {
    setSelectedId(e.id)
    if (e.status === 'unread') {
      await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: e.id, status: 'read' }),
      })
      fetchInbox()
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-heading font-bold text-slate-900">Inbox</h1>
        <p className="text-sm text-slate-500">
          Inbound emails to your business address &middot; {counts.unread} unread / {counts.total}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5">
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          {loading ? (
            <p className="text-slate-400 py-12 text-center text-sm">Loading...</p>
          ) : emails.length === 0 ? (
            <p className="text-slate-400 py-12 text-center text-sm">No emails yet</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {emails.map((e) => (
                <button
                  key={e.id}
                  onClick={() => open(e)}
                  className={`w-full text-left px-4 py-3 transition-colors ${selectedId === e.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${e.status === 'unread' ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {e.from_address || 'Unknown sender'}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">{new Date(e.received_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{e.subject || '(no subject)'}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border border-slate-100 rounded-xl p-5">
          {!selected ? (
            <p className="text-slate-400 py-12 text-center text-sm">Select an email</p>
          ) : (
            <div>
              <h2 className="text-lg font-heading font-bold text-slate-900 mb-1">{selected.subject || '(no subject)'}</h2>
              <p className="text-sm text-slate-500">From: {selected.from_address || '—'}</p>
              <p className="text-sm text-slate-500 mb-4 pb-4 border-b border-slate-100">To: {selected.to_address || '—'} &middot; {new Date(selected.received_at).toLocaleString()}</p>
              {selected.html_body ? (
                // Untrusted email HTML — render in a sandboxed iframe (no scripts,
                // no same-origin) so it can't touch the admin session.
                <iframe
                  title="email-body"
                  sandbox=""
                  srcDoc={selected.html_body}
                  className="w-full min-h-[50vh] border border-slate-100 rounded-lg bg-white"
                />
              ) : (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{selected.text_body || '(empty)'}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
