// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'

interface Campaign {
  id: string
  name: string
  channel: 'email' | 'sms' | 'both'
  subject: string | null
  email_body: string | null
  sms_body: string | null
  audience_filter: string
  status: 'draft' | 'sending' | 'sent'
  total_recipients: number
  sent_count: number
  delivered_count: number
  opened_count: number
  failed_count: number
  sent_at: string | null
  created_at: string
}

interface Recipient {
  id: string
  campaign_id: string
  client_id: string
  channel: string
  recipient: string
  status: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clients: { name: string } | null
}

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  email_marketing_opt_out?: boolean
  sms_marketing_opt_out?: boolean
}

type View = 'list' | 'create' | 'detail'

export default function MarketingPage() {
  useEffect(() => { document.title = 'Marketing | The NYC Wash and Fold Service Company' }, [])

  const [view, setView] = useState<View>('list')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [viewingRecipient, setViewingRecipient] = useState<Recipient | null>(null)
  const [detailPreviewHtml, setDetailPreviewHtml] = useState('')

  // Create/edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [name, setName] = useState('')
  const [channel, setChannel] = useState<'email' | 'sms' | 'both'>('email')
  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [smsBody, setSmsBody] = useState('')
  const [audienceFilter, setAudienceFilter] = useState<'active' | 'all'>('active')
  const [previewHtml, setPreviewHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [audienceCount, setAudienceCount] = useState({ emailCount: 0, smsCount: 0, totalClients: 0 })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [allClients, setAllClients] = useState<Client[]>([])
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [clientSearch, setClientSearch] = useState('')
  const [contactFilter, setContactFilter] = useState('all')
  const [optOutCounts, setOptOutCounts] = useState({ email: 0, sms: 0 })
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => { fetchCampaigns(); fetchOptOutCounts() }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    }
    setLoading(false)
  }

  const fetchOptOutCounts = async () => {
    try {
      const res = await fetch('/api/admin/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience_filter: 'all', email_body: '', channel: 'both' }),
      })
      if (res.ok) {
        const data = await res.json()
        const clients: Client[] = data.clients || []
        const emailOptOut = clients.filter(c => c.email_marketing_opt_out).length
        const smsOptOut = clients.filter(c => c.sms_marketing_opt_out).length
        setOptOutCounts({ email: emailOptOut, sms: smsOptOut })
      }
    } catch {}
  }

  const openDetail = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setViewingRecipient(null)
    setDetailPreviewHtml('')
    setView('detail')
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedCampaign(data.campaign)
        setRecipients(data.recipients || [])
        // Pre-fetch email preview if campaign has email_body
        if (data.campaign.email_body) {
          const pRes = await fetch('/api/admin/campaigns/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audience_filter: 'active', email_body: data.campaign.email_body, channel: data.campaign.channel }),
          })
          if (pRes.ok) {
            const pData = await pRes.json()
            if (pData.previewHtml) setDetailPreviewHtml(pData.previewHtml)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch campaign detail:', err)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setPrompt('')
    setGenerating(false)
    setGenerated(false)
    setName('')
    setChannel('email')
    setSubject('')
    setEmailBody('')
    setSmsBody('')
    setAudienceFilter('active')
    setPreviewHtml('')
    setShowPreview(false)
    setAudienceCount({ emailCount: 0, smsCount: 0, totalClients: 0 })
    setAllClients([])
    setSelectedClientIds(new Set())
    setClientSearch('')
    setContactFilter('all')
  }

  const fetchClients = async (filter: 'active' | 'all', cFilter?: string) => {
    try {
      const res = await fetch('/api/admin/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience_filter: filter, email_body: '', channel, contact_filter: cFilter || contactFilter }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Filter API error:', data.error)
        return
      }
      const clients: Client[] = data.clients || []
      setAllClients(clients)
      setSelectedClientIds(new Set(clients.map(c => c.id)))
      setAudienceCount({ emailCount: data.emailCount, smsCount: data.smsCount, totalClients: data.totalClients })
    } catch (err) {
      console.error('Fetch clients error:', err)
    }
  }

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedClientIds.size === allClients.length) {
      setSelectedClientIds(new Set())
    } else {
      setSelectedClientIds(new Set(allClients.map(c => c.id)))
    }
  }

  const generateContent = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, channel }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.name) setName(data.name)
        if (data.subject) setSubject(data.subject)
        if (data.email_body) setEmailBody(data.email_body)
        if (data.sms_body) setSmsBody(data.sms_body)
        setGenerated(true)
        // Auto-preview + fetch client list
        const previewRes = await fetch('/api/admin/campaigns/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audience_filter: audienceFilter, email_body: data.email_body || '', channel, contact_filter: contactFilter }),
        })
        if (previewRes.ok) {
          const pData = await previewRes.json()
          setAudienceCount({ emailCount: pData.emailCount, smsCount: pData.smsCount, totalClients: pData.totalClients })
          if (pData.previewHtml) { setPreviewHtml(pData.previewHtml); setShowPreview(true) }
          const clients: Client[] = pData.clients || []
          setAllClients(clients)
          setSelectedClientIds(new Set(clients.map((c: Client) => c.id)))
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Generation failed')
      }
    } catch (err) {
      console.error('Generate error:', err)
      alert('Failed to generate content')
    }
    setGenerating(false)
  }

  const fetchPreview = async () => {
    try {
      const res = await fetch('/api/admin/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience_filter: audienceFilter, email_body: emailBody, channel, contact_filter: contactFilter }),
      })
      if (res.ok) {
        const data = await res.json()
        setAudienceCount({ emailCount: data.emailCount, smsCount: data.smsCount, totalClients: data.totalClients })
        if (data.previewHtml) {
          setPreviewHtml(data.previewHtml)
          setShowPreview(true)
        }
      }
    } catch (err) {
      console.error('Preview error:', err)
    }
  }

  const saveDraft = async () => {
    if (!name.trim()) return alert('Campaign name is required')
    setSaving(true)
    try {
      const url = editingId ? `/api/admin/campaigns/${editingId}` : '/api/admin/campaigns'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, channel, subject, email_body: emailBody, sms_body: smsBody, audience_filter: audienceFilter }),
      })
      if (res.ok) {
        resetForm()
        setView('list')
        fetchCampaigns()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save')
      }
    } catch (err) {
      console.error('Save error:', err)
    }
    setSaving(false)
  }

  const sendCampaign = async (campaignId?: string) => {
    // If called from create view, save first
    let id = campaignId
    if (!id) {
      if (!name.trim()) return alert('Campaign name is required')
      setSaving(true)
      try {
        const res = await fetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, channel, subject, email_body: emailBody, sms_body: smsBody, audience_filter: audienceFilter }),
        })
        if (res.ok) {
          const data = await res.json()
          id = data.campaign.id
        } else {
          const err = await res.json()
          alert(err.error || 'Failed to save')
          setSaving(false)
          return
        }
      } catch (err) {
        console.error('Save error:', err)
        setSaving(false)
        return
      }
      setSaving(false)
    }

    const selectedCount = selectedClientIds.size
    if (!confirm(`Send this campaign to ${selectedCount} client${selectedCount !== 1 ? 's' : ''}? This cannot be undone.`)) {
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id, client_ids: Array.from(selectedClientIds) }),
      })
      if (res.ok) {
        const result = await res.json()
        alert(`Campaign sent! ${result.sent} sent, ${result.failed} failed out of ${result.total} recipients.`)
        resetForm()
        setView('list')
        fetchCampaigns()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to send')
      }
    } catch (err) {
      console.error('Send error:', err)
      alert('Failed to send campaign')
    }
    setSending(false)
  }

  const retryFailed = async (campaignId: string) => {
    if (!confirm('Retry sending to all failed recipients?')) return
    setRetrying(true)
    try {
      const res = await fetch('/api/admin/campaigns/send', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      })
      if (res.ok) {
        const result = await res.json()
        alert(`Retry complete: ${result.sent} sent, ${result.failed} failed out of ${result.retried} retried.`)
        if (selectedCampaign) openDetail(selectedCampaign)
      } else {
        const err = await res.json()
        alert(err.error || 'Retry failed')
      }
    } catch (err) {
      console.error('Retry error:', err)
      alert('Retry request failed')
    }
    setRetrying(false)
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this draft campaign?')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
    setDeletingId(null)
  }

  const formatDate = (dateStr: string) => {
    const ts = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const channelBadge = (ch: string) => {
    if (ch === 'email') return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Email</span>
    if (ch === 'sms') return <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">SMS</span>
    return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Both</span>
  }

  const statusBadge = (status: string) => {
    if (status === 'draft') return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Draft</span>
    if (status === 'sending') return <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Sending...</span>
    return <span className="px-2.5 py-0.5 bg-[#A8F0DC]/40 text-[#1E2A4A] rounded-full text-xs font-medium">Sent</span>
  }

  const recipientStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-[#A8F0DC]/40 text-[#1E2A4A]',
      opened: 'bg-green-100 text-green-700',
      bounced: 'bg-orange-100 text-orange-700',
      failed: 'bg-red-100 text-red-700',
    }
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
  }

  const smsSegments = (text: string) => Math.ceil((text.length || 1) / 160)

  // Aggregate stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)
  const totalDelivered = campaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0)
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0)

  // ── LIST VIEW ──
  if (view === 'list') return (
    <main className="p-3 md:p-6">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Marketing</h2>
          <p className="text-sm text-gray-400 mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { resetForm(); setView('create') }}
          className="px-4 py-2.5 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-medium text-sm shadow-sm transition-colors"
        >
          New Campaign
        </button>
      </div>

      {/* Stat cards */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">OVERVIEW</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Campaigns</p>
          <p className="text-2xl font-bold text-teal-800 mt-1">{campaigns.length}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total Sent</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{totalSent}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm hidden md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">Delivered</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{totalDelivered}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm hidden md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Opened</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{totalOpened}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm hidden md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-red-500">Email Opt-Outs</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{optOutCounts.email}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm hidden md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-orange-500">SMS Opt-Outs</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{optOutCounts.sms}</p>
        </div>
      </div>

      {/* Campaign table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="text-4xl mb-3">📢</div>
          <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">No campaigns yet</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">Create your first marketing campaign to reach your clients via email or SMS.</p>
        </div>
      ) : (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">CAMPAIGNS</h3>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Channel</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Sent</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Delivered</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Opened</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Date</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => openDetail(c)}>
                      <td className="px-5 py-4 font-medium text-[#1E2A4A]">{c.name}</td>
                      <td className="px-5 py-4">{channelBadge(c.channel)}</td>
                      <td className="px-5 py-4">{statusBadge(c.status)}</td>
                      <td className="px-5 py-4 text-gray-600 hidden md:table-cell">{c.sent_count}</td>
                      <td className="px-5 py-4 text-gray-600 hidden md:table-cell">{c.delivered_count}</td>
                      <td className="px-5 py-4 text-gray-600 hidden md:table-cell">{c.opened_count}</td>
                      <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">{formatDate(c.sent_at || c.created_at)}</td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        {c.status === 'draft' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendCampaign(c.id)}
                              className="px-3 py-1.5 bg-[#1E2A4A] text-white rounded-lg text-xs font-medium hover:bg-[#1E2A4A]/90 transition-colors"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => deleteCampaign(c.id)}
                              disabled={deletingId === c.id}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deletingId === c.id ? '...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  )

  // ── CREATE VIEW ──
  if (view === 'create') return (
    <main className="p-3 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { resetForm(); setView('list') }} className="text-gray-400 hover:text-[#1E2A4A] transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-[#1E2A4A]">New Campaign</h2>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel</label>
          <div className="flex gap-2">
            {(['email', 'sms', 'both'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${channel === ch ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {ch === 'both' ? 'Both' : ch === 'email' ? 'Email' : 'SMS'}
              </button>
            ))}
          </div>
        </div>

        {/* AI Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">What do you want to promote?</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. 20% off spring cleaning special, mention our referral program, book before March 15"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/20 focus:border-[#1E2A4A]"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateContent() } }}
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={generateContent}
              disabled={generating || !prompt.trim()}
              className="px-5 py-2.5 bg-[#1E2A4A] text-white rounded-xl text-sm font-medium hover:bg-[#1E2A4A]/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {generating ? 'Generating...' : generated ? 'Regenerate' : 'Generate'}
            </button>
            {generating && <span className="text-xs text-gray-400">AI is writing your campaign...</span>}
          </div>
        </div>

        {/* Generated content — only show after generation */}
        {generated && (
          <>
            <div className="h-px bg-gray-100" />

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/20 focus:border-[#1E2A4A]"
              />
            </div>

            {/* Subject line */}
            {(channel === 'email' || channel === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/20 focus:border-[#1E2A4A]"
                />
              </div>
            )}

            {/* Email preview — what clients will see */}
            {(channel === 'email' || channel === 'both') && showPreview && previewHtml && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Client Email Preview</label>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml}
                    className="w-full h-[600px] bg-white"
                    sandbox="allow-same-origin"
                    title="Email preview"
                  />
                </div>
              </div>
            )}

            {/* SMS preview + editor */}
            {(channel === 'sms' || channel === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SMS Preview</label>
                {/* Phone mockup */}
                <div className="mx-auto max-w-[320px] bg-gray-900 rounded-[2rem] p-3 shadow-lg">
                  <div className="bg-white rounded-[1.5rem] overflow-hidden">
                    {/* Status bar */}
                    <div className="bg-gray-100 px-5 py-2 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-medium">The NYC Wash and Fold Service Company</span>
                      <span className="text-[10px] text-gray-400">(888) 316-4019</span>
                    </div>
                    {/* Message area */}
                    <div className="px-4 py-5 min-h-[180px] bg-white flex flex-col justify-end">
                      {smsBody ? (
                        <div className="flex justify-start">
                          <div className="bg-[#e9e9eb] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                            <p className="text-[14px] text-black leading-snug whitespace-pre-wrap">{smsBody}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-center text-gray-300 text-sm">Type your SMS below</p>
                      )}
                    </div>
                    {/* Bottom bar */}
                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 text-center">{smsBody.length}/160 chars · {smsSegments(smsBody)} segment{smsSegments(smsBody) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
                {/* Editor below */}
                <details className="mt-3 group" open>
                  <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    Edit SMS text
                  </summary>
                  <textarea
                    value={smsBody}
                    onChange={e => setSmsBody(e.target.value)}
                    rows={3}
                    className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/20 focus:border-[#1E2A4A]"
                  />
                </details>
              </div>
            )}

            {/* Email HTML editor — collapsible, for manual edits */}
            {(channel === 'email' || channel === 'both') && (
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                  Edit HTML source
                </summary>
                <div className="mt-2">
                  <textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E2A4A]/20 focus:border-[#1E2A4A]"
                  />
                  <button
                    onClick={fetchPreview}
                    className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    Refresh Preview
                  </button>
                </div>
              </details>
            )}

            {/* Contacts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contacts</label>
              {/* Base audience */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => { setAudienceFilter('active'); fetchClients('active') }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${audienceFilter === 'active' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Active Clients
                </button>
                <button
                  onClick={() => { setAudienceFilter('all'); fetchClients('all') }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${audienceFilter === 'all' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  All Clients
                </button>
              </div>
              {/* Contact filters */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  { key: 'all', label: 'Everyone' },
                  { key: 'on_schedule', label: 'On Schedule' },
                  { key: 'not_scheduled', label: 'Not Scheduled' },
                  { key: 'has_upcoming', label: 'Has Upcoming' },
                  { key: 'no_upcoming', label: 'No Upcoming' },
                  { key: 'never_booked', label: 'Never Booked' },
                  { key: 'inactive_30d', label: 'Inactive 30d+' },
                  { key: 'inactive_60d', label: 'Inactive 60d+' },
                  { key: 'inactive_90d', label: 'Inactive 90d+' },
                  { key: 'vip', label: 'VIP ($1k+)' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setContactFilter(f.key); fetchClients(audienceFilter, f.key) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${contactFilter === f.key ? 'bg-[#A8F0DC] text-[#1E2A4A] shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {selectedClientIds.size} of {allClients.length} selected
                {audienceCount.emailCount > 0 && ` · ${audienceCount.emailCount} emails`}
                {audienceCount.smsCount > 0 && ` · ${audienceCount.smsCount} SMS`}
              </p>
              {allClients.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Header: check all + search */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedClientIds.size === allClients.length}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300 text-[#1E2A4A] focus:ring-[#1E2A4A]/20"
                      />
                      <span className="text-xs font-medium text-gray-500">Select All</span>
                    </label>
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="Search..."
                      className="ml-auto px-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40 focus:outline-none focus:ring-1 focus:ring-[#1E2A4A]/20"
                    />
                  </div>
                  {/* Client list */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {allClients
                      .filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                      .map(c => (
                        <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 cursor-pointer transition ${(channel === 'email' && c.email_marketing_opt_out) || (channel === 'sms' && c.sms_marketing_opt_out) ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selectedClientIds.has(c.id)}
                            onChange={() => toggleClient(c.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#1E2A4A] focus:ring-[#1E2A4A]/20"
                          />
                          <span className="text-sm font-medium text-[#1E2A4A] flex-1">{c.name}</span>
                          <span className="flex items-center gap-2">
                            {c.email_marketing_opt_out && (channel === 'email' || channel === 'both') && (
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[10px] font-medium">Email Opted Out</span>
                            )}
                            {c.sms_marketing_opt_out && (channel === 'sms' || channel === 'both') && (
                              <span className="px-1.5 py-0.5 bg-orange-50 text-orange-500 rounded text-[10px] font-medium">SMS Opted Out</span>
                            )}
                            <span className="text-xs text-gray-400">
                              {(channel === 'email' || channel === 'both') && c.email ? c.email : ''}
                              {channel === 'both' && c.email && c.phone ? ' · ' : ''}
                              {(channel === 'sms' || channel === 'both') && c.phone ? c.phone : ''}
                            </span>
                          </span>
                        </label>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 pb-8">
              <button
                onClick={saveDraft}
                disabled={saving || sending}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => sendCampaign()}
                disabled={saving || sending}
                className="px-6 py-3 bg-[#1E2A4A] text-white rounded-xl text-sm font-medium hover:bg-[#1E2A4A]/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Now'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )

  // ── DETAIL VIEW ──
  if (view === 'detail' && selectedCampaign) return (
    <main className="p-3 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setView('list'); setSelectedCampaign(null); setRecipients([]) }} className="text-gray-400 hover:text-[#1E2A4A] transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[#1E2A4A]">{selectedCampaign.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            {channelBadge(selectedCampaign.channel)}
            {statusBadge(selectedCampaign.status)}
            {selectedCampaign.sent_at && (
              <span className="text-xs text-gray-400">Sent {formatDate(selectedCampaign.sent_at)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Recipients</p>
          <p className="text-2xl font-bold text-teal-800 mt-1">{selectedCampaign.total_recipients}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Sent</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{selectedCampaign.sent_count}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">Delivered</p>
          <p className="text-2xl font-bold text-green-800 mt-1">{selectedCampaign.delivered_count}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 shadow-sm hidden md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Opened</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{selectedCampaign.opened_count}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm hidden md:block">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">Failed</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{selectedCampaign.failed_count}</p>
          {selectedCampaign.failed_count > 0 && (
            <button
              onClick={() => retryFailed(selectedCampaign.id)}
              disabled={retrying}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {retrying ? 'Retrying...' : 'Retry Failed'}
            </button>
          )}
        </div>
      </div>

      {/* Campaign content preview + edit button */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">CONTENT</h3>
          {selectedCampaign.status === 'draft' && (
            <button
              onClick={() => {
                setEditingId(selectedCampaign.id)
                setName(selectedCampaign.name)
                setChannel(selectedCampaign.channel)
                setSubject(selectedCampaign.subject || '')
                setEmailBody(selectedCampaign.email_body || '')
                setSmsBody(selectedCampaign.sms_body || '')
                setAudienceFilter(selectedCampaign.audience_filter as 'active' | 'all')
                setGenerated(true)
                setView('create')
                fetchClients(selectedCampaign.audience_filter as 'active' | 'all')
              }}
              className="px-4 py-1.5 bg-[#1E2A4A] text-white text-sm rounded-lg hover:bg-[#2a3a5e] transition"
            >
              Edit Draft
            </button>
          )}
        </div>

        {/* Email preview */}
        {(selectedCampaign.channel === 'email' || selectedCampaign.channel === 'both') && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
            {selectedCampaign.subject && (
              <div className="px-5 py-3 border-b border-gray-100">
                <span className="text-xs text-gray-400">Subject:</span>{' '}
                <span className="text-sm font-medium text-[#1E2A4A]">{selectedCampaign.subject}</span>
              </div>
            )}
            {detailPreviewHtml ? (
              <iframe
                srcDoc={detailPreviewHtml}
                className="w-full h-[400px] bg-white"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            ) : selectedCampaign.email_body ? (
              <div className="px-5 py-4 text-sm text-gray-700 whitespace-pre-wrap">{selectedCampaign.email_body}</div>
            ) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No email content</div>
            )}
          </div>
        )}

        {/* SMS preview */}
        {(selectedCampaign.channel === 'sms' || selectedCampaign.channel === 'both') && (
          <div className="mx-auto max-w-[320px] bg-gray-900 rounded-[2rem] p-3 shadow-lg">
            <div className="bg-white rounded-[1.5rem] overflow-hidden">
              <div className="bg-gray-100 px-5 py-2">
                <span className="text-[10px] text-gray-500 font-medium">The NYC Wash and Fold Service Company</span>
              </div>
              <div className="px-4 py-5 min-h-[100px] bg-white flex flex-col justify-end">
                {selectedCampaign.sms_body ? (
                  <div className="flex justify-start">
                    <div className="bg-[#e9e9eb] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-[14px] text-black leading-snug whitespace-pre-wrap">{selectedCampaign.sms_body}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 text-sm">No SMS content</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recipients table */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">RECIPIENTS</h3>
      {recipients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400">{selectedCampaign.status === 'draft' ? 'Recipients will appear after sending' : 'Loading...'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Channel</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Recipient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Sent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Delivered</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recipients.map(r => (
                  <tr
                    key={r.id}
                    className={`hover:bg-gray-50/50 transition cursor-pointer ${viewingRecipient?.id === r.id ? 'bg-[#A8F0DC]/10' : ''}`}
                    onClick={() => setViewingRecipient(viewingRecipient?.id === r.id ? null : r)}
                  >
                    <td className="px-5 py-4 font-medium text-[#1E2A4A]">{r.clients?.name || '—'}</td>
                    <td className="px-5 py-4">{channelBadge(r.channel)}</td>
                    <td className="px-5 py-4 text-gray-600 text-xs">{r.recipient}</td>
                    <td className="px-5 py-4">{recipientStatusBadge(r.status)}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">{r.sent_at ? formatDate(r.sent_at) : '—'}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">{r.delivered_at ? formatDate(r.delivered_at) : '—'}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">{r.opened_at ? formatDate(r.opened_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Message viewer — shown when a recipient is clicked */}
      {viewingRecipient && selectedCampaign && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Message to {viewingRecipient.clients?.name || viewingRecipient.recipient}
            </h3>
            <button onClick={() => setViewingRecipient(null)} className="text-xs text-gray-400 hover:text-gray-600 transition">
              Close
            </button>
          </div>

          {viewingRecipient.channel === 'email' && detailPreviewHtml ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">Subject: <span className="font-medium text-[#1E2A4A]">{selectedCampaign.subject}</span></p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <iframe
                  srcDoc={detailPreviewHtml}
                  className="w-full h-[600px] bg-white"
                  sandbox="allow-same-origin"
                  title="Sent email preview"
                />
              </div>
            </div>
          ) : viewingRecipient.channel === 'sms' && selectedCampaign.sms_body ? (
            <div className="mx-auto max-w-[320px] bg-gray-900 rounded-[2rem] p-3 shadow-lg">
              <div className="bg-white rounded-[1.5rem] overflow-hidden">
                <div className="bg-gray-100 px-5 py-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-medium">The NYC Wash and Fold Service Company</span>
                  <span className="text-[10px] text-gray-400">to {viewingRecipient.recipient}</span>
                </div>
                <div className="px-4 py-5 min-h-[180px] bg-white flex flex-col justify-end">
                  <div className="flex justify-start">
                    <div className="bg-[#e9e9eb] rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-[14px] text-black leading-snug whitespace-pre-wrap">{selectedCampaign.sms_body}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 text-center">
                    {viewingRecipient.status === 'delivered' ? 'Delivered' : viewingRecipient.status === 'sent' ? 'Sent' : viewingRecipient.status === 'failed' ? 'Failed' : viewingRecipient.status}
                    {viewingRecipient.sent_at ? ` · ${formatDate(viewingRecipient.sent_at)}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
              <p className="text-gray-400 text-sm">No preview available</p>
            </div>
          )}
        </div>
      )}
    </main>
  )

  return null
}
