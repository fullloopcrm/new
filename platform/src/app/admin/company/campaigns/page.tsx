'use client'

import { useCallback, useEffect, useState } from 'react'
import { RECIPIENT_FILTERS, RECIPIENT_FILTER_LABEL, type RecipientFilter } from '@/lib/company-campaigns'

interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  status: 'draft' | 'sent'
  recipient_filter: RecipientFilter
  recipient_count: number | null
  sent_at: string | null
  created_at: string
}

const emptyForm = { name: '', subject: '', body: '', recipient_filter: 'all_tenants' as RecipientFilter }

export default function CompanyCampaignsPage() {
  useEffect(() => { document.title = 'Company Campaigns | FullLoop Admin' }, [])

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/company/campaigns')
    const data = await res.json().catch(() => ({ campaigns: [] }))
    setCampaigns(data.campaigns || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createCampaign() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/company/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function deleteDraft(id: string) {
    if (!window.confirm('Delete this draft?')) return
    await fetch(`/api/admin/company/campaigns/${id}`, { method: 'DELETE' })
    await load()
  }

  async function send(id: string, name: string) {
    if (!window.confirm(`Send "${name}" now? This emails real tenants immediately.`)) return
    setSendingId(id)
    setSendResult(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/company/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      setSendResult(`Sent ${data.sent}/${data.attempted}`)
      await load()
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-slate-900 font-heading text-2xl font-bold">Company Campaigns</h1>
          <p className="text-sm text-slate-500">Full Loop&rsquo;s own outreach to tenants — announcements, re-engagement. Not tenant-to-client marketing.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          {showForm ? 'Cancel' : '+ New campaign'}
        </button>
      </div>

      {sendResult && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{sendResult}</p>}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Internal name</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. August product update" />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Recipients</span>
            <select
              value={form.recipient_filter}
              onChange={(e) => setForm((f) => ({ ...f, recipient_filter: e.target.value as RecipientFilter }))}
              className={inputCls}
            >
              {RECIPIENT_FILTERS.map((f) => <option key={f} value={f}>{RECIPIENT_FILTER_LABEL[f]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Subject</span>
            <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">Body (HTML, {'{name}'} = tenant name)</span>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={6} className={inputCls} />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={createCampaign}
            disabled={!form.name.trim() || !form.subject.trim() || !form.body.trim() || saving}
            className="px-4 py-2 bg-teal-600 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Recipients</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400">No campaigns yet</td></tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.subject}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{RECIPIENT_FILTER_LABEL[c.recipient_filter]}</td>
                    <td className="px-5 py-3">
                      {c.status === 'sent' ? (
                        <span className="text-xs text-green-700">Sent · {c.recipient_count ?? 0} recipients</span>
                      ) : (
                        <span className="text-xs text-gray-500">Draft</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.status === 'draft' ? (
                        <div className="flex gap-3 justify-end">
                          <button type="button" onClick={() => deleteDraft(c.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                          <button
                            type="button"
                            onClick={() => send(c.id, c.name)}
                            disabled={sendingId === c.id}
                            className="text-xs text-teal-600 hover:text-teal-700 font-medium disabled:text-gray-400"
                          >
                            {sendingId === c.id ? 'Sending…' : 'Send'}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
