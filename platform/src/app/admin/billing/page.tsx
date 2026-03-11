'use client'

import { useEffect, useState } from 'react'
import { PLAN_COLORS } from '@/lib/constants'

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 49,
  pro: 99,
  enterprise: 249,
}

const PLAN_OPTIONS = ['free', 'starter', 'pro', 'enterprise']

const planColors = PLAN_COLORS

const barColors: Record<string, string> = {
  free: 'bg-slate-300',
  starter: 'bg-green-500',
  pro: 'bg-teal-600',
  enterprise: 'bg-purple-600',
}

type BillingTenant = {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  email: string | null
  mrr: number
  created_at: string
}

type BillingData = {
  mrr: number
  totalAccounts: number
  byPlan: { free: number; starter: number; pro: number; enterprise: number }
  recentChanges: { tenantId: string; name: string; plan: string; updatedAt: string }[]
  tenants: BillingTenant[]
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/admin/billing')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handlePlanChange = async (tenantId: string) => {
    setSaving(true)
    await fetch('/api/admin/billing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, plan: editPlan }),
    })
    setEditingId(null)
    setSaving(false)
    setLoading(true)
    load()
  }

  if (loading || !data) return <p className="text-slate-500">Loading...</p>

  const maxPlanCount = Math.max(data.byPlan.free, data.byPlan.starter, data.byPlan.pro, data.byPlan.enterprise, 1)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-slate-900 font-heading text-2xl font-bold">Billing</h1>
        <p className="text-sm text-slate-500">Revenue overview and plan management</p>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">MRR</p>
          <p className="text-2xl font-bold text-slate-900">${data.mrr.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Accounts</p>
          <p className="text-2xl font-bold text-slate-900">{data.totalAccounts}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Paid Accounts</p>
          <p className="text-2xl font-bold text-teal-600">
            {data.byPlan.starter + data.byPlan.pro + data.byPlan.enterprise}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Avg Revenue</p>
          <p className="text-2xl font-bold text-slate-900">
            ${data.totalAccounts > 0 ? Math.round(data.mrr / data.totalAccounts) : 0}
          </p>
        </div>
      </div>

      {/* Plan Distribution Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Plan Distribution</h2>
        <div className="space-y-3">
          {PLAN_OPTIONS.map((plan) => {
            const count = data.byPlan[plan as keyof typeof data.byPlan]
            const pct = maxPlanCount > 0 ? (count / maxPlanCount) * 100 : 0
            return (
              <div key={plan} className="flex items-center gap-3">
                <span className="w-20 text-xs font-medium text-slate-600 capitalize">{plan}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden">
                  <div
                    className={`h-full ${barColors[plan]} rounded-md transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs text-slate-500">
                  {count} ({data.totalAccounts > 0 ? Math.round((count / data.totalAccounts) * 100) : 0}%)
                </span>
                <span className="w-20 text-right text-xs font-medium text-slate-700">
                  ${(count * PLAN_PRICES[plan]).toLocaleString()}/mo
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">All Accounts</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">MRR</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{t.name}</p>
                  {t.email && <p className="text-xs text-slate-400">{t.email}</p>}
                </td>
                <td className="px-5 py-3">
                  {editingId === t.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      >
                        {PLAN_OPTIONS.map((p) => (
                          <option key={p} value={p}>{p} (${PLAN_PRICES[p]}/mo)</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handlePlanChange(t.id)}
                        disabled={saving}
                        className="px-2 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${planColors[t.plan] || planColors.free}`}>
                      {t.plan}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    t.status === 'active' ? 'bg-green-50 text-green-600 border border-green-200' :
                    t.status === 'setup' ? 'bg-teal-50 text-teal-600 border border-teal-200' :
                    t.status === 'suspended' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-slate-700">
                  ${t.mrr}
                </td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className="px-5 py-3">
                  {editingId !== t.id && (
                    <button
                      onClick={() => { setEditingId(t.id); setEditPlan(t.plan) }}
                      className="text-xs text-teal-600 hover:text-teal-700"
                    >
                      Change Plan
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data.tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-sm">
                  No accounts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Changes */}
      {data.recentChanges.length > 0 && (
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent Plan Changes</h2>
          <div className="space-y-2">
            {data.recentChanges.map((c) => (
              <div key={c.tenantId} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[c.plan] || planColors.free}`}>
                    {c.plan}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(c.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
