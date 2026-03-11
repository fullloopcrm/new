'use client'

import { useEffect, useState } from 'react'

interface Campaign {
  id: string
  tenant_id: string
  tenant_name: string
  name: string
  type: 'email' | 'sms' | 'both'
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  subject: string | null
  total_recipients: number
  sent_count: number
  opened_count: number
  clicked_count: number
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
}

interface Tenant {
  id: string
  name: string
}

export default function AdminMarketingPage() {
  useEffect(() => { document.title = 'Marketing | FullLoop Admin' }, [])

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/marketing')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
        setTenants(data.tenants || [])
      }
    } catch (err) {
      console.error('Failed to fetch marketing data:', err)
    }
    setLoading(false)
  }

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTenant = selectedTenant === 'all' || c.tenant_id === selectedTenant
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus
    return matchesSearch && matchesTenant && matchesStatus
  })

  const totalCampaigns = campaigns.length
  const draftCount = campaigns.filter(c => c.status === 'draft').length
  const sentCount = campaigns.filter(c => c.status === 'sent').length
  const scheduledCount = campaigns.filter(c => c.status === 'scheduled').length
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0)
  const overallOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-100"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Draft</span>
      case 'scheduled':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Scheduled</span>
      case 'sending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />Sending</span>
      case 'sent':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Sent</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">{status}</span>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'email':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-600">Email</span>
      case 'sms':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-600">SMS</span>
      case 'both':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-600">Email + SMS</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-600">{type}</span>
    }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <main className="p-3 md:p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Marketing Campaigns</h2>
          <p className="text-sm text-gray-500">Manage campaigns across all tenant businesses</p>
        </div>
        <button
          className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-medium text-sm shadow-sm transition-colors"
        >
          + Create Campaign
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-8">
        <div className="rounded-xl p-4 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-white/70 mb-1">Total Campaigns</p>
          <p className="text-3xl font-bold">{totalCampaigns}</p>
          <p className="text-xs text-white/50 mt-1">All tenants</p>
        </div>
        <div className="rounded-xl p-4 bg-gray-50 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gray-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">Draft</p>
          <p className="text-3xl font-bold text-gray-700">{draftCount}</p>
          <p className="text-xs text-gray-400 mt-1">In progress</p>
        </div>
        <div className="rounded-xl p-4 bg-green-50 border border-green-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-green-600 mb-1">Sent</p>
          <p className="text-3xl font-bold text-green-700">{sentCount}</p>
          <p className="text-xs text-green-400 mt-1">{totalSent.toLocaleString()} messages</p>
        </div>
        <div className="rounded-xl p-4 bg-blue-50 border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 mb-1">Scheduled</p>
          <p className="text-3xl font-bold text-blue-700">{scheduledCount}</p>
          <p className="text-xs text-blue-400 mt-1">Queued</p>
        </div>
        <div className="rounded-xl p-4 bg-teal-50 border border-teal-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-teal-600 mb-1">Open Rate</p>
          <p className="text-3xl font-bold text-teal-700">{overallOpenRate}%</p>
          <p className="text-xs text-teal-400 mt-1">{totalOpened.toLocaleString()} opened</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search campaigns or tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/30 transition"
          />
        </div>
        <select
          value={selectedTenant}
          onChange={(e) => setSelectedTenant(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/30 transition"
        >
          <option value="all">All Tenants</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600/30 transition"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      {/* Section Header */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900/50 mb-3 flex items-center gap-2">
        <span>CAMPAIGNS</span>
        <span className="text-xs font-normal bg-slate-900/5 text-slate-900/60 px-2 py-0.5 rounded-full">
          {filteredCampaigns.length} campaigns
        </span>
      </h3>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Campaign Table */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-5 py-3.5">Campaign</th>
                    <th className="px-5 py-3.5">Tenant</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Sent</th>
                    <th className="px-5 py-3.5 text-right">Opened</th>
                    <th className="px-5 py-3.5 text-right">Clicked</th>
                    <th className="px-5 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCampaigns.map(campaign => {
                    const openRate = campaign.sent_count > 0 ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1) : '-'
                    const clickRate = campaign.sent_count > 0 ? ((campaign.clicked_count / campaign.sent_count) * 100).toFixed(1) : '-'
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{campaign.name}</p>
                            {campaign.subject && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]">{campaign.subject}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">{campaign.tenant_name}</td>
                        <td className="px-5 py-3.5">{getTypeBadge(campaign.type)}</td>
                        <td className="px-5 py-3.5">{getStatusBadge(campaign.status)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-medium text-slate-900">{campaign.sent_count.toLocaleString()}</span>
                          <span className="text-xs text-gray-400 ml-1">/ {campaign.total_recipients.toLocaleString()}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-medium text-slate-900">{campaign.opened_count.toLocaleString()}</span>
                          {openRate !== '-' && (
                            <span className="text-xs text-gray-400 ml-1">({openRate}%)</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-medium text-slate-900">{campaign.clicked_count.toLocaleString()}</span>
                          {clickRate !== '-' && (
                            <span className="text-xs text-gray-400 ml-1">({clickRate}%)</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-400">
                          {campaign.sent_at ? formatDate(campaign.sent_at) : campaign.scheduled_at ? formatDate(campaign.scheduled_at) : formatDate(campaign.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredCampaigns.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">&#128233;</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No campaigns found</h3>
              <p className="text-sm text-gray-500">Try adjusting your filters or create a new campaign</p>
            </div>
          )}
        </>
      )}
    </main>
  )
}
