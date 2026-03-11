'use client'

import { useEffect, useState } from 'react'

interface Referral {
  id: string
  tenant_id: string
  tenant_name: string
  referrer_name: string
  referrer_email: string
  referee_name: string
  referee_email: string
  status: 'pending' | 'active' | 'converted' | 'expired'
  reward_amount: number
  reward_status: 'pending' | 'paid' | 'n/a'
  revenue_generated: number
  created_at: string
  converted_at: string | null
}

interface Tenant {
  id: string
  name: string
}

export default function AdminReferralsPage() {
  useEffect(() => { document.title = 'Referrals | FullLoop Admin' }, [])

  const [referrals, setReferrals] = useState<Referral[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/referrals')
      if (res.ok) {
        const data = await res.json()
        setReferrals(data.referrals || [])
        setTenants(data.tenants || [])
      }
    } catch (err) {
      console.error('Failed to fetch referrals:', err)
    }
    setLoading(false)
  }

  const filteredReferrals = referrals.filter(r => {
    const matchesSearch = r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.referee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTenant = selectedTenant === 'all' || r.tenant_id === selectedTenant
    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus
    return matchesSearch && matchesTenant && matchesStatus
  })

  const totalReferrals = referrals.length
  const activeCount = referrals.filter(r => r.status === 'active').length
  const convertedCount = referrals.filter(r => r.status === 'converted').length
  const pendingCount = referrals.filter(r => r.status === 'pending').length
  const totalRevenue = referrals.reduce((sum, r) => sum + (r.revenue_generated || 0), 0)
  const totalRewards = referrals.reduce((sum, r) => sum + (r.reward_amount || 0), 0)
  const pendingRewards = referrals.filter(r => r.reward_status === 'pending').reduce((sum, r) => sum + (r.reward_amount || 0), 0)
  const conversionRate = totalReferrals > 0 ? ((convertedCount / totalReferrals) * 100).toFixed(1) : '0'

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-100"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Pending</span>
      case 'active':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Active</span>
      case 'converted':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Converted</span>
      case 'expired':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-100"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Expired</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">{status}</span>
    }
  }

  const getRewardBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Paid</span>
      case 'pending':
        return <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">Pending</span>
      default:
        return <span className="text-xs text-gray-400">-</span>
    }
  }

  return (
    <main className="p-3 md:p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Referral Program</h2>
          <p className="text-sm text-gray-500">{totalReferrals} referrals across all tenants &middot; {pendingCount} pending</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
        <div className="rounded-xl p-4 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-white/70 mb-1">Total Referrals</p>
          <p className="text-2xl font-bold">{totalReferrals}</p>
          <p className="text-xs text-white/50 mt-0.5">All time</p>
        </div>
        <div className="rounded-xl p-4 bg-blue-50 border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-blue-700">{activeCount}</p>
          <p className="text-xs text-blue-400 mt-0.5">In progress</p>
        </div>
        <div className="rounded-xl p-4 bg-green-50 border border-green-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-green-600 mb-1">Converted</p>
          <p className="text-2xl font-bold text-green-700">{convertedCount}</p>
          <p className="text-xs text-green-400 mt-0.5">{conversionRate}% rate</p>
        </div>
        <div className="rounded-xl p-4 bg-teal-50 border border-teal-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-teal-600 mb-1">Revenue</p>
          <p className="text-2xl font-bold text-teal-700">{formatMoney(totalRevenue)}</p>
          <p className="text-xs text-teal-400 mt-0.5">From referrals</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 mb-1">Rewards Paid</p>
          <p className="text-2xl font-bold text-emerald-700">{formatMoney(totalRewards)}</p>
          <p className="text-xs text-emerald-400 mt-0.5">All time</p>
        </div>
        <div className="rounded-xl p-4 bg-yellow-50 border border-yellow-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-100/50 rounded-full -translate-y-6 translate-x-6" />
          <p className="text-xs font-medium uppercase tracking-wider text-yellow-600 mb-1">Pending Rewards</p>
          <p className="text-2xl font-bold text-yellow-700">{formatMoney(pendingRewards)}</p>
          <p className="text-xs text-yellow-400 mt-0.5">To pay out</p>
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
            placeholder="Search referrers, referees, or tenants..."
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
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="converted">Converted</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Section Header */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900/50 mb-3 flex items-center gap-2">
        <span>REFERRAL LIST</span>
        <span className="text-xs font-normal bg-slate-900/5 text-slate-900/60 px-2 py-0.5 rounded-full">
          {filteredReferrals.length} referrals
        </span>
      </h3>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Referral Table */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-5 py-3.5">Referrer</th>
                    <th className="px-5 py-3.5">Referee</th>
                    <th className="px-5 py-3.5">Tenant</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Reward</th>
                    <th className="px-5 py-3.5">Reward Status</th>
                    <th className="px-5 py-3.5 text-right">Revenue</th>
                    <th className="px-5 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredReferrals.map(referral => (
                    <tr key={referral.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{referral.referrer_name}</p>
                          <p className="text-xs text-gray-400">{referral.referrer_email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{referral.referee_name}</p>
                          <p className="text-xs text-gray-400">{referral.referee_email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{referral.tenant_name}</td>
                      <td className="px-5 py-3.5">{getStatusBadge(referral.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {referral.reward_amount > 0 ? formatMoney(referral.reward_amount) : '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">{getRewardBadge(referral.reward_status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-medium text-teal-600">
                          {referral.revenue_generated > 0 ? formatMoney(referral.revenue_generated) : '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-400">
                        {formatDate(referral.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredReferrals.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">&#129309;</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No referrals found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </>
      )}
    </main>
  )
}
