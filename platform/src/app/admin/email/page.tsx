'use client'

import { useEffect, useState, useCallback } from 'react'

type TenantEmail = {
  tenant_id: string
  tenant_name: string
  configured: boolean
  domain: string | null
  email_from: string | null
}

type EmailLog = {
  id: string
  to_email: string
  subject: string
  status: string
  created_at: string
}

type TenantConfig = {
  configured: boolean
  domain: string | null
  email_from: string | null
  has_api_key: boolean
}

export default function AdminEmailPage() {
  const [tenants, setTenants] = useState<TenantEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ resend_api_key: '', resend_domain: '', email_from: '' })
  const [saving, setSaving] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [tenantConfig, setTenantConfig] = useState<TenantConfig | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/email')
      const data = await res.json()
      setTenants(data.tenants || [])
    } catch (err) {
      console.error('Failed to fetch email tenants', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  const fetchTenantDetail = useCallback(async (tenantId: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/email?tenant_id=${tenantId}`)
      const data = await res.json()
      setTenantConfig(data.config || null)
      setEmailLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to fetch tenant email detail', err)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const handleSelectTenant = (tenantId: string) => {
    if (selectedTenant === tenantId) {
      setSelectedTenant(null)
      setTenantConfig(null)
      setEmailLogs([])
    } else {
      setSelectedTenant(tenantId)
      fetchTenantDetail(tenantId)
    }
  }

  const handleEdit = (t: TenantEmail) => {
    setEditingId(t.tenant_id)
    setEditForm({
      resend_api_key: '',
      resend_domain: t.domain || '',
      email_from: t.email_from || '',
    })
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const body: Record<string, string> = { tenant_id: editingId }
      if (editForm.resend_api_key) body.resend_api_key = editForm.resend_api_key
      if (editForm.resend_domain) body.resend_domain = editForm.resend_domain
      if (editForm.email_from) body.email_from = editForm.email_from

      const res = await fetch('/api/admin/email', {
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
      console.error('Failed to update email config', err)
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
      <div className="py-20 text-center text-slate-400 text-sm">Loading email configurations...</div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Email Configuration</h1>
        <p className="text-sm text-slate-500">Resend email setup across all tenants</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="border-l-4 border-l-teal-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total Tenants</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{tenants.length}</p>
        </div>
        <div className="border-l-4 border-l-green-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Configured</p>
          <p className="text-2xl font-bold font-mono mt-1 text-slate-900">{configuredCount}</p>
        </div>
        <div className="border-l-4 border-l-yellow-500 pl-4 py-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Not Configured</p>
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
              <th className="text-left px-4 py-2 text-[11px] text-slate-500 uppercase tracking-wide font-semibold">Domain</th>
              <th className="text-left px-4 py-2 text-[11px] text-slate-500 uppercase tracking-wide font-semibold">From</th>
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
                    t.configured
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {t.configured ? 'Configured' : 'Not Set'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.domain || <span className="text-slate-300">--</span>}</td>
                <td className="px-4 py-3 text-slate-600">{t.email_from || <span className="text-slate-300">--</span>}</td>
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
              Edit Email Config
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {tenants.find(t => t.tenant_id === editingId)?.tenant_name}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                  Resend API Key
                </label>
                <input
                  type="password"
                  placeholder="re_..."
                  value={editForm.resend_api_key}
                  onChange={e => setEditForm(f => ({ ...f, resend_api_key: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave blank to keep existing key</p>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  placeholder="mail.example.com"
                  value={editForm.resend_domain}
                  onChange={e => setEditForm(f => ({ ...f, resend_domain: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 uppercase tracking-wide font-semibold mb-1">
                  Email From
                </label>
                <input
                  type="text"
                  placeholder="noreply@example.com"
                  value={editForm.email_from}
                  onChange={e => setEditForm(f => ({ ...f, email_from: e.target.value }))}
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
                Email Logs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {tenants.find(t => t.tenant_id === selectedTenant)?.tenant_name}
              </p>
            </div>
            <button onClick={() => { setSelectedTenant(null); setTenantConfig(null); setEmailLogs([]) }}
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
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Domain</p>
                    <p className="text-sm text-slate-900 mt-1">{tenantConfig.domain || '--'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">From</p>
                    <p className="text-sm text-slate-900 mt-1">{tenantConfig.email_from || '--'}</p>
                  </div>
                </div>
              )}

              {/* Logs Table */}
              {emailLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 text-[10px] text-slate-400 uppercase tracking-wide font-semibold">To</th>
                        <th className="text-left py-2 text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Subject</th>
                        <th className="text-left py-2 text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Status</th>
                        <th className="text-right py-2 text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {emailLogs.map(log => (
                        <tr key={log.id}>
                          <td className="py-2 text-slate-700">{log.to_email}</td>
                          <td className="py-2 text-slate-600 truncate max-w-[200px]">{log.subject}</td>
                          <td className="py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                              log.status === 'delivered' ? 'bg-green-50 text-green-600' :
                              log.status === 'sent' ? 'bg-teal-50 text-teal-600' :
                              log.status === 'failed' ? 'bg-red-50 text-red-500' :
                              'bg-slate-100 text-slate-400'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2 text-right text-xs text-slate-400">{timeAgo(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">No email logs found</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
