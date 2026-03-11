'use client'

import { useEffect, useState, useCallback } from 'react'

type TenantSms = {
  tenant_id: string
  tenant_name: string
  configured: boolean
  has_api_key: boolean
  has_phone: boolean
  phone: string | null
}

type SmsConversation = {
  id: string
  client_id: string
  status: string
  last_message_at: string
  clients: { name: string; phone: string } | null
}

type SmsMessage = {
  id: string
  direction: string
  message: string
  created_at: string
  clients: { name: string } | null
}

type TenantConfig = {
  configured: boolean
  has_api_key: boolean
  phone: string | null
}

export default function AdminSmsPage() {
  const [tenants, setTenants] = useState<TenantSms[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ telnyx_api_key: '', telnyx_phone: '' })
  const [saving, setSaving] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null)
  const [conversations, setConversations] = useState<SmsConversation[]>([])
  const [recentMessages, setRecentMessages] = useState<SmsMessage[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sms')
      const data = await res.json()
      setTenants(data.tenants || [])
    } catch (err) {
      console.error('Failed to fetch SMS tenants', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  const fetchTenantDetail = useCallback(async (tenantId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/sms?tenant_id=${tenantId}`)
      const data = await res.json()
      setTenantConfig(data.config || null)
      setConversations(data.conversations || [])
      setRecentMessages(data.recentMessages || [])
    } catch (err) {
      console.error('Failed to fetch tenant SMS detail', err)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const handleSelectTenant = (tenantId: string) => {
    if (selectedTenant === tenantId) {
      setSelectedTenant(null)
      setTenantConfig(null)
      setConversations([])
      setRecentMessages([])
    } else {
      setSelectedTenant(tenantId)
      fetchTenantDetail(tenantId)
    }
  }

  const handleEdit = (t: TenantSms) => {
    setEditingId(t.tenant_id)
    setEditForm({
      telnyx_api_key: '',
      telnyx_phone: t.phone || '',
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const body: Record<string, string> = { tenant_id: editingId }
      if (editForm.telnyx_api_key) body.telnyx_api_key = editForm.telnyx_api_key
      if (editForm.telnyx_phone) body.telnyx_phone = editForm.telnyx_phone

      const res = await fetch('/api/admin/sms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setEditingId(null)
        fetchTenants()
        if (selectedTenant === editingId) fetchTenantDetail(editingId)
      }
    } catch (err) {
      console.error('Failed to update SMS config', err)
    } finally {
      setSaving(false)
    }
  }

  const filtered = tenants.filter(t =>
    t.tenant_name.toLowerCase().includes(filter.toLowerCase())
  )

  const configuredCount = tenants.filter(t => t.configured).length

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">Loading SMS configurations...</div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">SMS Configuration</h1>
        <p className="text-sm text-slate-500">Telnyx SMS setup across all tenants</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border-l-4 border-l-teal-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total Tenants</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{tenants.length}</p>
        </div>
        <div className="border-l-4 border-l-green-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Fully Configured</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{configuredCount}</p>
        </div>
        <div className="border-l-4 border-l-yellow-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Missing Config</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{tenants.length - configuredCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by tenant name..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Tenant Table */}
      <div className="border border-slate-200 rounded overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2 text-[11px] text-slate-500 uppercase tracking-wide font-semibold">Tenant</th>
              <th className="text-left px-4 py-2 text-[11px] text-slate-500 uppercase tracking-wide font-semibold">API Key</th>
              <th className="text-left px-4 py-2 text-[11px] text-slate-500 uppercase tracking-wide font-semibold">Phone Number</th>
              <th className="text-left px-4 py-2 text-[11px] text-slate-500 uppercase tracking-wide font-semibold">Status</th>
              <th className="text-right px-4 py-2 text-[11px] text-slate-500 uppercase tracking-wide font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(t => (
              <tr key={t.tenant_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleSelectTenant(t.tenant_id)}
                    className="text-sm font-medium text-slate-900 hover:text-teal-600 transition-colors text-left"
                  >
                    {t.tenant_name}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    t.has_api_key
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {t.has_api_key ? 'Set' : 'Not Set'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                  {t.phone || <span className="text-slate-300 font-sans">--</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    t.configured
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : t.has_api_key || t.has_phone
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {t.configured ? 'Ready' : t.has_api_key || t.has_phone ? 'Partial' : 'Not Set'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(t)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                  {filter ? 'No tenants match your filter' : 'No tenants found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setEditingId(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-semibold text-lg text-slate-900 mb-4">
              Edit SMS Config
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {tenants.find(t => t.tenant_id === editingId)?.tenant_name}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                  Telnyx API Key
                </label>
                <input
                  type="password"
                  placeholder="KEY..."
                  value={editForm.telnyx_api_key}
                  onChange={e => setEditForm(f => ({ ...f, telnyx_api_key: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave blank to keep existing key</p>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+12125551234"
                  value={editForm.telnyx_phone}
                  onChange={e => setEditForm(f => ({ ...f, telnyx_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingId(null)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Detail Panel */}
      {selectedTenant && (
        <div className="border border-slate-200 rounded p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <div>
              <h2 className="font-heading font-semibold text-sm text-slate-900 uppercase tracking-wider">
                SMS Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tenants.find(t => t.tenant_id === selectedTenant)?.tenant_name}
              </p>
            </div>
            <button onClick={() => { setSelectedTenant(null); setTenantConfig(null); setConversations([]); setRecentMessages([]) }}
              className="text-xs text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>

          {loadingDetail ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
          ) : (
            <>
              {/* Config Summary */}
              {tenantConfig && (
                <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Status</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                      tenantConfig.configured
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {tenantConfig.configured ? 'Active' : 'Not Configured'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">API Key</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                      tenantConfig.has_api_key
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {tenantConfig.has_api_key ? 'Set' : 'Not Set'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Phone</p>
                    <p className="text-sm text-slate-900 mt-1 font-mono">{tenantConfig.phone || '--'}</p>
                  </div>
                </div>
              )}

              {/* Conversations & Messages in 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Conversations */}
                <div>
                  <h3 className="font-heading font-semibold text-xs text-slate-500 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                    Recent Conversations
                  </h3>
                  {conversations.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {conversations.map(c => (
                        <div key={c.id} className="py-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900">
                              {c.clients?.name || 'Unknown'}
                            </p>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                              c.status === 'active' ? 'bg-green-50 text-green-600' :
                              c.status === 'closed' ? 'bg-slate-100 text-slate-400' :
                              'bg-teal-50 text-teal-600'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-slate-400 font-mono">{c.clients?.phone || '--'}</p>
                            <p className="text-[10px] text-slate-400">{c.last_message_at ? timeAgo(c.last_message_at) : '--'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-sm">No conversations</div>
                  )}
                </div>

                {/* Recent Messages */}
                <div>
                  <h3 className="font-heading font-semibold text-xs text-slate-500 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                    Recent Messages
                  </h3>
                  {recentMessages.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {recentMessages.map(m => (
                        <div key={m.id} className="py-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                m.direction === 'inbound' ? 'bg-teal-400' : 'bg-slate-300'
                              }`} />
                              <p className="text-xs font-medium text-slate-700">
                                {m.clients?.name || 'Unknown'}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400">{timeAgo(m.created_at)}</p>
                          </div>
                          <p className="text-sm text-slate-600 truncate pl-3.5">{m.message}</p>
                          <p className="text-[10px] text-slate-400 pl-3.5 mt-0.5 capitalize">{m.direction}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-sm">No messages</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
