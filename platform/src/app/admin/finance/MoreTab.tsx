'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, StatCard, Panel, EmptyState } from './finance-ui'

interface MoreData {
  vendorSpend: { total: number; vendorCount: number; topVendors: { vendor: string; spend: number; transactionCount: number }[] }
  inventory: { totalValue: number; lowStockCount: number; byTenant: { tenant_id: string; tenant_name: string; value: number }[] }
  equipment: { netBookValue: number; byStatus: Record<string, number> }
  catalog: { activeItemCount: number }
  note: string
}

export default function MoreTab({ period }: { period: string }) {
  const [data, setData] = useState<MoreData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/finance/more?period=${period}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => console.error('Failed to load operational finance data:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period])

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>
  if (!data) return <div className="text-center py-16 text-gray-500">Failed to load operational finance data</div>

  return (
    <>
      <div className="mb-4 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">{data.note}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Vendor Spend (period)" value={formatCurrency(data.vendorSpend.total)} />
        <StatCard label="Inventory Value" value={formatCurrency(data.inventory.totalValue)} />
        <StatCard label="Equipment Net Value" value={formatCurrency(data.equipment.netBookValue)} />
        <StatCard label="Active Catalog Items" value={String(data.catalog.activeItemCount)} />
      </div>

      <Panel title="Top Vendors by Spend">
        {data.vendorSpend.topVendors.length === 0 ? (
          <EmptyState>No vendor spend for this period</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Vendor</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Spend</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-gray-400 font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data.vendorSpend.topVendors.map((v, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{v.vendor}</td>
                    <td className="px-5 py-3 text-sm text-right text-slate-900">{formatCurrency(v.spend)}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-600">{v.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6">
        <Panel title="Inventory Value by Tenant">
          {data.inventory.byTenant.length === 0 ? (
            <EmptyState>No inventory tracked</EmptyState>
          ) : (
            <div className="p-5 space-y-2">
              {data.inventory.byTenant.slice(0, 10).map((t) => (
                <div key={t.tenant_id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{t.tenant_name}</span>
                  <span className="font-medium text-slate-900">{formatCurrency(t.value)}</span>
                </div>
              ))}
              {data.inventory.lowStockCount > 0 && (
                <p className="text-xs text-amber-700 pt-2">{data.inventory.lowStockCount} item(s) at or below reorder threshold platform-wide.</p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Equipment by Status">
          {Object.keys(data.equipment.byStatus).length === 0 ? (
            <EmptyState>No equipment tracked</EmptyState>
          ) : (
            <div className="p-5 space-y-2">
              {Object.entries(data.equipment.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 capitalize">{status.replace('_', ' ')}</span>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  )
}
