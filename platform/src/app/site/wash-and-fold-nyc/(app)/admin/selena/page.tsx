// @ts-nocheck
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

interface ConvoMessage {
  direction: string
  message: string
  created_at: string
}

interface Stats {
  total: number
  confirmed: number
  abandoned: number
  active: number
  leadsCapture: number
  avgRating: number | null
  ratingCount: number
  avgMessages: number
  avgChecklist: number
  byChannel: { sms: number; web: number; other: number }
  byStatus: Record<string, number>
  missingFields: Record<string, number>
  funnel: Record<string, number>
  escalations: number
}

export default function SelenaAdminPage() {
  useEffect(() => { document.title = 'Selena | The NYC Wash and Fold Service Company Admin' }, [])
  const [convos, setConvos] = useState<Conversation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [errorLog, setErrorLog] = useState<Array<{ id: string; type: string; title: string; message: string; created_at: string }>>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConvoMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [since, setSince] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [since])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/selena?since=${since}T00:00:00Z`)
      if (res.ok) {
        const data = await res.json()
        setConvos(data.conversations || [])
        setStats(data.stats || null)
        setErrorLog(data.errorLog || [])
      }
    } catch (err) {
      console.error('Failed to load Selena data:', err)
    }
    setLoading(false)
  }

  async function loadMessages(convoId: string) {
    if (expandedId === convoId) { setExpandedId(null); return }
    setExpandedId(convoId)
    setMsgLoading(true)
    try {
      const res = await fetch(`/api/admin/selena?convoId=${convoId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch { setMessages([]) }
    setMsgLoading(false)
  }

  async function resetConversation(convoId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Reset this conversation? This will expire it and send a recovery text to the client.')) return
    setResetting(convoId)
    try {
      const res = await fetch('/api/admin/selena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convoId }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error('Reset failed:', err)
    }
    setResetting(null)
  }

  const checklistFields = ['name', 'phone', 'service_type', 'bedrooms', 'bathrooms', 'rate', 'day', 'time', 'address', 'email']

  function getChecklistCount(cl: Record<string, unknown>): number {
    return checklistFields.filter(f => cl[f] !== null && cl[f] !== undefined).length
  }

  function getChannel(cl: Record<string, unknown>, phone: string): string {
    if (cl.channel) return cl.channel as string
    if (phone.startsWith('web-')) return 'web'
    return 'sms'
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': case 'closed': return 'bg-green-100 text-green-800'
      case 'recap': return 'bg-blue-100 text-blue-800'
      case 'collecting': return 'bg-yellow-100 text-yellow-800'
      case 'greeting': return 'bg-gray-100 text-gray-600'
      case 'rating': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  if (loading) {
    return (
      <>
        <div className="p-6 text-gray-500">Loading...</div>
      </>
    )
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">

        {/* Date Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Stats since:</label>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-[#1E2A4A]"
          />
          <button
            onClick={() => setSince(new Date().toISOString().split('T')[0])}
            className="text-xs px-3 py-1.5 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#2a3a5a]"
          >
            Today
          </button>
          <button
            onClick={() => setSince('2026-01-01')}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
          >
            All Time
          </button>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Chats</p>
              <p className="text-2xl font-bold text-[#1E2A4A]">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Bookings</p>
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              <p className="text-xs text-gray-400">{stats.total > 0 ? Math.round(stats.confirmed / stats.total * 100) : 0}% conversion</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Leads Captured</p>
              <p className="text-2xl font-bold text-orange-600">{stats.leadsCapture}</p>
              <p className="text-xs text-gray-400">name + phone, no booking</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active Now</p>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Rating</p>
              <p className="text-2xl font-bold text-[#1E2A4A]">{stats.avgRating ? stats.avgRating.toFixed(1) : '—'}</p>
              <p className="text-xs text-gray-400">{stats.ratingCount} ratings</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Messages</p>
              <p className="text-2xl font-bold text-[#1E2A4A]">{stats.avgMessages || '—'}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Checklist Avg</p>
              <p className="text-2xl font-bold text-[#1E2A4A]">{stats.avgChecklist ? `${stats.avgChecklist.toFixed(1)}/10` : '—'}</p>
            </div>
          </div>
        )}

        {/* Channel & Source Breakdown */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">By Channel</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-600">SMS</span><span className="font-semibold">{stats.byChannel.sms}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-600">Web Chat</span><span className="font-semibold">{stats.byChannel.web}</span></div>
                {stats.byChannel.other > 0 && <div className="flex justify-between"><span className="text-sm text-gray-600">Other</span><span className="font-semibold">{stats.byChannel.other}</span></div>}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Conversation Status</p>
              <div className="space-y-2">
                {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-sm text-gray-600">{status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Most Missed Fields</p>
              <div className="space-y-2">
                {Object.entries(stats.missingFields).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([field, count]) => (
                  <div key={field} className="flex justify-between">
                    <span className="text-sm text-gray-600">{field}</span>
                    <span className="font-semibold text-red-500">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Booking Funnel */}
        {stats && stats.total > 0 && (
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Booking Funnel</p>
            <div className="space-y-1">
              {[
                { label: 'Started Chat', key: '_total', count: stats.total },
                { label: 'Gave Name', key: 'name', count: stats.funnel?.name || 0 },
                { label: 'Gave Phone', key: 'phone', count: stats.funnel?.phone || 0 },
                { label: 'Chose Service', key: 'service_type', count: stats.funnel?.service_type || 0 },
                { label: 'Gave Size', key: 'bedrooms', count: stats.funnel?.bedrooms || 0 },
                { label: 'Chose Rate', key: 'rate', count: stats.funnel?.rate || 0 },
                { label: 'Chose Day', key: 'day', count: stats.funnel?.day || 0 },
                { label: 'Chose Time', key: 'time', count: stats.funnel?.time || 0 },
                { label: 'Gave Address', key: 'address', count: stats.funnel?.address || 0 },
                { label: 'Gave Email', key: 'email', count: stats.funnel?.email || 0 },
                { label: 'Reached Recap', key: 'recap', count: stats.funnel?.recap || 0 },
                { label: 'Booked', key: 'booked', count: stats.funnel?.booked || 0 },
              ].map((step, i) => {
                const pct = stats.total > 0 ? Math.round(step.count / stats.total * 100) : 0
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 text-right">{step.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${i <= 1 ? 'bg-blue-400' : i <= 5 ? 'bg-blue-500' : i <= 9 ? 'bg-blue-600' : i === 10 ? 'bg-indigo-600' : 'bg-green-600'}`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                        {step.count} ({pct}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Escalations alert */}
        {stats && stats.escalations > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 font-semibold">{stats.escalations} escalation{stats.escalations > 1 ? 's' : ''} need attention</p>
          </div>
        )}

        {/* Live Feed */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-[#1E2A4A]">Recent Conversations</h2>
            <button onClick={fetchData} className="text-sm text-blue-600 hover:underline">Refresh</button>
          </div>
          <div className="divide-y">
            {convos.length === 0 && (
              <div className="p-6 text-center text-gray-400">No conversations yet</div>
            )}
            {convos.map(c => {
              const cl = c.booking_checklist || {}
              const channel = getChannel(cl, c.phone)
              const checkCount = getChecklistCount(cl)
              const status = (cl.status as string) || (c.expired ? 'expired' : 'unknown')
              const rating = cl.rating as number | null

              return (
                <div key={c.id}>
                  <button onClick={() => loadMessages(c.id)} className="w-full text-left p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1E2A4A]">{c.name || c.phone}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${channel === 'sms' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {channel}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(status)}`}>
                          {status}
                        </span>
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
                      {rating && <span>Rating: {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>}
                      {c.outcome && <span>Outcome: {c.outcome}</span>}
                      {c.summary && <span className="truncate max-w-[300px]">{c.summary}</span>}
                    </div>
                  </button>

                  {/* Expanded transcript */}
                  {expandedId === c.id && (
                    <div className="bg-gray-50 p-4 border-t">
                      {/* Checklist detail */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                        {checklistFields.map(f => (
                          <div key={f} className={`text-xs px-2 py-1 rounded ${cl[f] ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-400'}`}>
                            {f}: {cl[f] !== null && cl[f] !== undefined ? String(cl[f]) : 'missing'}
                          </div>
                        ))}
                      </div>
                      {/* Messages */}
                      {msgLoading ? (
                        <p className="text-gray-400 text-sm">Loading transcript...</p>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                                m.direction === 'inbound' ? 'bg-white border text-gray-800' : 'bg-[#1E2A4A] text-white'
                              }`}>
                                <p>{m.message}</p>
                                <p className="text-[10px] opacity-50 mt-1">
                                  {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </p>
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
        {/* Error & Escalation Log */}
        <div className="bg-white rounded-xl border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-[#1E2A4A]">System Log</h2>
            <p className="text-xs text-gray-400">Errors, escalations, and issues</p>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {errorLog.length === 0 && (
              <div className="p-6 text-center text-gray-400">No errors or escalations</div>
            )}
            {errorLog.map(e => (
              <div key={e.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.type === 'selena_error' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {e.type === 'selena_error' ? 'ERROR' : 'ESCALATION'}
                    </span>
                    <span className="text-sm font-medium text-[#1E2A4A]">{e.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(e.created_at)}</span>
                </div>
                <p className="text-xs text-gray-500 whitespace-pre-wrap font-mono">{e.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
