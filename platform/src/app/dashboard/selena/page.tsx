'use client'

import { useEffect, useState } from 'react'

interface Conversation {
  id: string
  phone: string
  name: string | null
  client_id: string | null
  state: string
  created_at: string
  updated_at: string
  completed_at: string | null
  expired: boolean
  outcome: string | null
  summary: string | null
  booking_checklist: Record<string, unknown>
  booking_id: string | null
}

interface ConvoMessage { direction: string; message: string; created_at: string }

interface Stats {
  total: number; confirmed: number; abandoned: number; active: number
  avgRating: number | null; ratingCount: number; avgMessages: number; avgChecklist: number
  byChannel: { sms: number; web: number; other: number }
  byStatus: Record<string, number>; missingFields: Record<string, number>; escalations: number
}

const CHECKLIST_FIELDS = ['service_type', 'bedrooms', 'bathrooms', 'rate', 'day', 'time', 'name', 'phone', 'address', 'email']

export default function SelenaPage() {
  useEffect(() => { document.title = 'Selena — AI Concierge' }, [])
  const [convos, setConvos] = useState<Conversation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [errorLog, setErrorLog] = useState<Array<{ id: string; type: string; title: string; message: string; created_at: string }>>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConvoMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [since, setSince] = useState(() => new Date().toISOString().split('T')[0])

  // Inline settings
  const [showSettings, setShowSettings] = useState(false)
  const [selenaConfig, setSelenaConfig] = useState<Record<string, unknown>>({})
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.tenant?.selena_config) setSelenaConfig(data.tenant.selena_config)
        setSettingsLoaded(true)
      })
      .catch(() => setSettingsLoaded(true))
  }, [])

  async function saveSelenaConfig(updated: Record<string, unknown>) {
    setSettingsSaving(true)
    setSettingsMsg('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selena_config: updated }),
      })
      if (res.ok) {
        setSettingsMsg('Saved!')
        setTimeout(() => setSettingsMsg(''), 2000)
      } else {
        setSettingsMsg('Failed to save')
      }
    } catch {
      setSettingsMsg('Network error')
    }
    setSettingsSaving(false)
  }

  function updateSelena(key: string, value: unknown) {
    const updated = { ...selenaConfig, [key]: value }
    setSelenaConfig(updated)
    saveSelenaConfig(updated)
  }

  useEffect(() => { fetchData() }, [since])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/selena?since=${since}T00:00:00Z`)
      if (res.ok) {
        const data = await res.json()
        setConvos(data.conversations || [])
        setStats(data.stats || null)
        setErrorLog(data.errorLog || [])
      }
    } catch {}
    setLoading(false)
  }

  async function resetConversation(convoId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Reset this conversation? This will expire it and send a recovery text to the client.')) return
    setResetting(convoId)
    try {
      const res = await fetch('/api/selena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convoId }),
      })
      if (res.ok) await fetchData()
    } catch (err) {
      console.error('Reset failed:', err)
    }
    setResetting(null)
  }

  async function loadMessages(convoId: string) {
    if (expandedId === convoId) { setExpandedId(null); return }
    setExpandedId(convoId)
    setMsgLoading(true)
    try {
      const res = await fetch(`/api/selena?convoId=${convoId}`)
      if (res.ok) { const data = await res.json(); setMessages(data.messages || []) }
    } catch { setMessages([]) }
    setMsgLoading(false)
  }

  function getChecklistCount(cl: Record<string, unknown>): number {
    return CHECKLIST_FIELDS.filter(f => cl[f] !== null && cl[f] !== undefined).length
  }

  function getChannel(cl: Record<string, unknown>, phone: string): string {
    if (cl.channel) return cl.channel as string
    return phone?.startsWith('web-') ? 'web' : 'sms'
  }

  function statusColor(s: string): string {
    switch (s) {
      case 'confirmed': case 'closed': return 'bg-green-100 text-green-800'
      case 'recap': return 'bg-blue-100 text-blue-800'
      case 'collecting': return 'bg-yellow-100 text-yellow-800'
      case 'rating': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  function timeAgo(d: string): string {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'now'; if (m < 60) return `${m}m`
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Selena — AI Concierge</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
          title="Selena Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Inline Selena Settings */}
      {showSettings && settingsLoaded && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Selena Quick Settings</h3>
            <div className="flex items-center gap-3">
              {settingsMsg && <span className={`text-xs ${settingsMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{settingsMsg}</span>}
              {settingsSaving && <span className="text-xs text-gray-500">Saving...</span>}
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {/* AI Enabled */}
            <div className="flex items-center justify-between max-w-xs">
              <label className="text-[10px] text-slate-400 uppercase tracking-wide">AI Enabled</label>
              <button
                onClick={() => updateSelena('ai_enabled', !selenaConfig.ai_enabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${selenaConfig.ai_enabled ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${selenaConfig.ai_enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div className="border-t border-gray-800" />

            {/* AI Name */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 block">AI Name</label>
              <input
                value={(selenaConfig.ai_name as string) || 'Selena'}
                onChange={(e) => updateSelena('ai_name', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs text-slate-900"
              />
            </div>
            <div className="border-t border-gray-800" />

            {/* Tone */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 block">Tone</label>
              <select
                value={(selenaConfig.tone as string) || 'warm_friendly'}
                onChange={(e) => updateSelena('tone', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs text-slate-900"
              >
                <option value="warm_friendly">Warm</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div className="border-t border-gray-800" />

            {/* Language */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 block">Language</label>
              <select
                value={(selenaConfig.language as string) || 'en'}
                onChange={(e) => updateSelena('language', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs text-slate-900"
              >
                <option value="en">English</option>
                <option value="bilingual">Bilingual (EN/ES)</option>
                <option value="es">Spanish</option>
              </select>
            </div>
            <div className="border-t border-gray-800" />

            {/* Escalation Phone */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 block">Escalation Phone</label>
              <input
                value={(selenaConfig.escalation_phone as string) || ''}
                onChange={(e) => updateSelena('escalation_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs text-slate-900"
              />
            </div>
            <div className="border-t border-gray-800" />

            {/* Link to full settings */}
            <a href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors">
              Full Selena Settings
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </a>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Stats since:</label>
        <input
          type="date"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-slate-900"
        />
        <button
          onClick={() => setSince(new Date().toISOString().split('T')[0])}
          className="text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-700"
        >
          Today
        </button>
        <button
          onClick={() => setSince('2025-01-01')}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
        >
          All Time
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Total Chats</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Bookings</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            <p className="text-xs text-gray-400">{stats.total > 0 ? Math.round(stats.confirmed / stats.total * 100) : 0}%</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Active</p>
            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Avg Rating</p>
            <p className="text-2xl font-bold">{stats.avgRating ? stats.avgRating.toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-400">{stats.ratingCount} ratings</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Avg Messages</p>
            <p className="text-2xl font-bold">{stats.avgMessages || '—'}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase">Checklist Avg</p>
            <p className="text-2xl font-bold">{stats.avgChecklist ? `${stats.avgChecklist.toFixed(1)}/10` : '—'}</p>
          </div>
        </div>
      )}

      {/* Channel + Status + Missing */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase mb-3">By Channel</p>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm">SMS</span><span className="font-semibold">{stats.byChannel.sms}</span></div>
              <div className="flex justify-between"><span className="text-sm">Web</span><span className="font-semibold">{stats.byChannel.web}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase mb-3">Status</p>
            <div className="space-y-2">
              {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([s, c]) => (
                <div key={s} className="flex justify-between"><span className="text-sm">{s}</span><span className="font-semibold">{c}</span></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase mb-3">Most Missed</p>
            <div className="space-y-2">
              {Object.entries(stats.missingFields).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, c]) => (
                <div key={f} className="flex justify-between"><span className="text-sm">{f}</span><span className="font-semibold text-red-500">{c}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversations */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Recent Conversations</h2>
          <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        <div className="divide-y">
          {convos.length === 0 && <div className="p-6 text-center text-gray-400">No conversations yet</div>}
          {convos.map(c => {
            const cl = c.booking_checklist || {}
            const channel = getChannel(cl, c.phone)
            const checkCount = getChecklistCount(cl)
            const status = (cl.status as string) || (c.expired ? 'expired' : 'unknown')
            const rating = cl.rating as number | null

            return (
              <div key={c.id}>
                <button onClick={() => loadMessages(c.id)} className="w-full text-left p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name || c.phone}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{channel}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(status)}`}>{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!c.expired && !c.completed_at && (
                        <button
                          onClick={(e) => resetConversation(c.id, e)}
                          disabled={resetting === c.id}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {resetting === c.id ? 'Resetting...' : 'Reset'}
                        </button>
                      )}
                      <span className="text-xs text-gray-400">{timeAgo(c.updated_at || c.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Checklist: {checkCount}/10</span>
                    {rating && <span>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>}
                    {c.summary && <span className="truncate max-w-[300px]">{c.summary}</span>}
                  </div>
                </button>
                {expandedId === c.id && (
                  <div className="bg-gray-50 p-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                      {CHECKLIST_FIELDS.map(f => (
                        <div key={f} className={`text-xs px-2 py-1 rounded ${cl[f] ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-400'}`}>
                          {f}: {cl[f] !== null && cl[f] !== undefined ? String(cl[f]) : 'missing'}
                        </div>
                      ))}
                    </div>
                    {msgLoading ? <p className="text-gray-400 text-sm">Loading...</p> : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {messages.map((m, i) => (
                          <div key={i} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${m.direction === 'inbound' ? 'bg-white border' : 'bg-gray-800 text-white'}`}>
                              <p>{m.message}</p>
                              <p className="text-[10px] opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Log */}
      <div className="bg-white rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">System Log</h2>
          <p className="text-xs text-gray-400">Errors, escalations, issues</p>
        </div>
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {errorLog.length === 0 && <div className="p-6 text-center text-gray-400">No errors</div>}
          {errorLog.map(e => (
            <div key={e.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.type === 'selena_error' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {e.type === 'selena_error' ? 'ERROR' : 'ESCALATION'}
                  </span>
                  <span className="text-sm font-medium">{e.title}</span>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(e.created_at)}</span>
              </div>
              <p className="text-xs text-gray-500 whitespace-pre-wrap font-mono">{e.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
