'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'

type Campaign = {
  id: string
  name: string
  type: string
  status: string
  subject: string | null
  body: string | null
  recipient_filter: string | null
  recipient_count: number | null
  open_count: number | null
  click_count: number | null
  sent_at: string | null
  scheduled_at: string | null
  created_at: string
}

const recipientFilters = [
  { value: 'all', label: 'All Clients', desc: 'Every client in your database' },
  { value: 'active', label: 'Active Clients', desc: 'Clients with bookings in the last 30 days' },
  { value: 'at_risk', label: 'At-Risk Clients', desc: 'No booking in 30-60 days' },
  { value: 'churned', label: 'Churned Clients', desc: 'No booking in 60+ days' },
  { value: 'new', label: 'New Clients', desc: 'Signed up in the last 14 days' },
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'email', subject: '', body: '',
    recipient_filter: 'all', scheduled_at: '',
  })
  const [saving, setSaving] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'sent' | 'scheduled'>('all')
  const [search, setSearch] = useState('')

  const campaignsSettings = usePageSettings('campaigns')

  useEffect(() => {
    fetch('/api/campaigns').then((r) => r.json()).then((data) => setCampaigns(data.campaigns || []))
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.body) return
    setSaving(true)
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        scheduled_at: form.scheduled_at || null,
      }),
    })
    if (res.ok) {
      const { campaign } = await res.json()
      setCampaigns((prev) => [campaign, ...prev])
      setShowCreate(false)
      setForm({ name: '', type: 'email', subject: '', body: '', recipient_filter: 'all', scheduled_at: '' })
    }
    setSaving(false)
  }

  async function aiWrite() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'campaign',
          messages: [{ role: 'user', content: `Write a ${form.type === 'both' ? 'multi-channel (email + SMS)' : form.type} campaign. ${aiPrompt}${form.type === 'email' || form.type === 'both' ? ' Include a subject line on the first line starting with "Subject: "' : ''}${form.type === 'both' ? ' Keep the body concise enough for SMS (under 160 chars) while also working as an email.' : ''}. Use {name} for client name and {business} for business name.` }],
        }),
      })
      const data = await res.json()
      if (data.message) {
        let body = data.message
        // Extract subject line if present
        if (form.type === 'email' || form.type === 'both') {
          const match = body.match(/^Subject:\s*(.+?)[\n\r]/i)
          if (match) {
            setForm((f) => ({ ...f, subject: match[1].trim() }))
            body = body.replace(/^Subject:\s*.+?[\n\r]+/i, '').trim()
          }
        }
        setForm((f) => ({ ...f, body }))
      }
    } catch {
      // silently fail
    }
    setAiLoading(false)
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this draft campaign? This cannot be undone.')) return
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const filtered = (activeTab === 'all' ? campaigns : campaigns.filter((c) => c.status === activeTab))
    .filter((c) => {
      if (!search) return true
      return c.name.toLowerCase().includes(search.toLowerCase())
    })

  const draftCount = campaigns.filter((c) => c.status === 'draft').length
  const sentCount = campaigns.filter((c) => c.status === 'sent').length
  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Campaigns</h2>
            <p className="text-sm text-slate-400">{campaigns.length} total &middot; {draftCount} drafts &middot; {sentCount} sent</p>
          </div>
          <PageSettingsGear open={campaignsSettings.open} setOpen={campaignsSettings.setOpen} title="Campaigns" />
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 transition-colors">
          {showCreate ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      <PageSettingsPanel
        {...campaignsSettings}
        title="Campaigns"
        tips={[
          'Use AI to generate campaign content -- just describe what you want',
          'Send via email, SMS, or both channels at once',
          'Personalize messages with {name} and {business} placeholders',
          'Configure your Resend and Telnyx API keys in Settings > Integrations',
        ]}
      >
        {({ config, updateConfig }) => (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Default Campaign Type</label>
              <select
                value={(config.default_type as string) || 'email'}
                onChange={(e) => updateConfig('default_type', e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Email + SMS</option>
              </select>
            </div>
            <div className="border-t border-slate-700" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Default Sender Name</label>
              <input
                type="text"
                value={(config.default_sender_name as string) || ''}
                onChange={(e) => updateConfig('default_sender_name', e.target.value)}
                placeholder="e.g. My Business"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
              />
            </div>
            <div className="border-t border-slate-700" />
            <div className="flex items-center justify-between max-w-xs">
              <label className="text-sm text-slate-300">Auto-add unsubscribe link</label>
              <button
                onClick={() => updateConfig('auto_unsubscribe', config.auto_unsubscribe === false ? true : !config.auto_unsubscribe)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.auto_unsubscribe !== false ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.auto_unsubscribe !== false ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="flex items-center justify-between max-w-xs">
              <label className="text-sm text-slate-300">Campaign approval required</label>
              <button
                onClick={() => updateConfig('approval_required', !config.approval_required)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.approval_required ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.approval_required ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </PageSettingsPanel>

      {/* CREATE FORM */}
      {showCreate && (
        <form onSubmit={create} className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Create Campaign</h3>

          {/* Step 1: Basics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="text-xs text-slate-400 uppercase mb-1 block">Campaign Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Spring promo blast" required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase mb-1 block">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                <option value="email">Email Only</option>
                <option value="sms">SMS Only</option>
                <option value="both">Email + SMS</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase mb-1 block">Schedule (optional)</label>
              <input type="datetime-local" value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Step 2: Recipients */}
          <div className="mb-5">
            <label className="text-xs text-slate-400 uppercase mb-2 block">Recipients</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {recipientFilters.map((f) => (
                <button key={f.value} type="button"
                  onClick={() => setForm({ ...form, recipient_filter: f.value })}
                  className={`text-left border rounded-lg p-2.5 transition-colors ${
                    form.recipient_filter === f.value
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}>
                  <p className="text-sm font-medium text-slate-200">{f.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Content */}
          {(form.type === 'email' || form.type === 'both') && (
            <div className="mb-4">
              <label className="text-xs text-slate-400 uppercase mb-1 block">Subject Line {form.type === 'both' && <span className="text-slate-500 normal-case">(for email)</span>}</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Don't miss out — 15% off your next booking!"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400 uppercase">
                {form.type === 'sms' ? 'Message' : form.type === 'both' ? 'Campaign Body' : 'Email Body'} {(form.type === 'sms' || form.type === 'both') && form.body && (
                  <span className={`ml-1 ${form.body.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                    ({form.body.length}/160{form.type === 'both' ? ' SMS chars' : ''})
                  </span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">Use {'{name}'} for client name, {'{business}'} for your business</span>
            </div>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder={form.type === 'sms'
                ? 'Hi {name}! {business} has a special offer just for you...'
                : 'Write your email content here... Use {name} and {business} merge tags.'}
              rows={form.type === 'sms' ? 4 : 8}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono" />
          </div>

          {/* AI Writing Assist */}
          <div className="bg-slate-700/50 border border-slate-700 rounded-lg p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">✧</span>
              <h4 className="text-xs font-semibold text-slate-400 uppercase">Selenas AI — Write Assist</h4>
            </div>
            <div className="flex gap-2">
              <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. 15% off first booking for new clients, warm and friendly tone"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aiWrite() } }}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={aiWrite} disabled={aiLoading || !aiPrompt.trim()}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                {aiLoading ? 'Writing...' : 'Generate'}
              </button>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {['Promo discount', 'Seasonal reminder', 'Win-back offer', 'Thank you', 'Holiday greeting'].map((tag) => (
                <button key={tag} type="button"
                  onClick={() => { setAiPrompt(tag.toLowerCase()); }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600 text-slate-400 hover:bg-slate-600">
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {form.body && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Preview</h4>
              {form.type === 'both' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase font-semibold mb-1.5">Email</p>
                    {form.subject && (
                      <p className="font-semibold text-white text-sm mb-2">
                        {form.subject.replace(/\{name\}/g, 'Sarah').replace(/\{business\}/g, 'My Business')}
                      </p>
                    )}
                    <div className="text-sm text-slate-300 whitespace-pre-wrap">
                      {form.body.replace(/\{name\}/g, 'Sarah').replace(/\{business\}/g, 'My Business')}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-green-400 uppercase font-semibold mb-1.5">SMS</p>
                    <div className="text-sm text-slate-300 whitespace-pre-wrap bg-green-500/20 rounded-lg p-3 max-w-xs">
                      {form.body.replace(/\{name\}/g, 'Sarah').replace(/\{business\}/g, 'My Business')}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {form.type === 'email' && form.subject && (
                    <p className="font-semibold text-white text-sm mb-2">
                      {form.subject.replace(/\{name\}/g, 'Sarah').replace(/\{business\}/g, 'My Business')}
                    </p>
                  )}
                  <div className={`text-sm text-slate-300 whitespace-pre-wrap ${form.type === 'sms' ? 'bg-green-500/20 rounded-lg p-3 max-w-xs' : ''}`}>
                    {form.body.replace(/\{name\}/g, 'Sarah').replace(/\{business\}/g, 'My Business')}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={saving || !form.name || !form.body}
              className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          </div>
        </form>
      )}

      {/* TABS */}
      <div className="flex gap-1 mb-4">
        {([
          { value: 'all', label: 'All', count: campaigns.length },
          { value: 'draft', label: 'Drafts', count: draftCount },
          { value: 'scheduled', label: 'Scheduled', count: scheduledCount },
          { value: 'sent', label: 'Sent', count: sentCount },
        ] as const).map((tab) => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab.value
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:bg-slate-700'
            }`}>
            {tab.label} {tab.count > 0 && <span className="ml-1 opacity-60">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns by name..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
        />
      </div>

      {/* CAMPAIGN LIST */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-slate-400">
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Opens</th>
              <th className="px-4 py-3 font-medium">Clicks</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/campaigns/${c.id}`} className="font-medium text-white hover:text-teal-400">
                    {c.name}
                  </Link>
                  {c.subject && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.subject}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    c.type === 'both' ? 'bg-purple-500/20 text-purple-400' :
                    c.type === 'email' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>{c.type === 'both' ? 'email + sms' : c.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    c.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                    c.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-400' :
                    c.status === 'sending' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-600 text-slate-400'
                  }`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-400">{c.recipient_count ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400">
                  {c.open_count != null ? (
                    <span>{c.open_count} {c.recipient_count ? <span className="text-slate-400 text-xs">({Math.round((c.open_count / c.recipient_count) * 100)}%)</span> : ''}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400">{c.click_count ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : c.scheduled_at ? `Scheduled ${new Date(c.scheduled_at).toLocaleDateString()}` : new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {c.status === 'draft' && (
                    <button onClick={() => deleteCampaign(c.id)} className="text-xs text-red-400 hover:text-red-300">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                {activeTab === 'all' ? 'No campaigns yet — create your first one above' : `No ${activeTab} campaigns`}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
