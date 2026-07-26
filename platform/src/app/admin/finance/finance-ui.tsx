export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatBps(bps: number): string {
  const pct = bps / 100
  return `${pct >= 0 ? '' : ''}${pct.toFixed(1)}%`
}

export function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const toneClass = tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : 'text-slate-900'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
    </div>
  )
}

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-8 text-gray-400">{children}</div>
}

export function BarTrend({ points, valueKey }: { points: { month: string; [k: string]: number | string }[]; valueKey: string }) {
  const values = points.map((p) => Number(p[valueKey]) || 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)

  return (
    <div className="flex items-end gap-2 h-48 p-5">
      {points.map((p, i) => {
        const v = Number(p[valueKey]) || 0
        const height = ((v - min) / range) * 100
        const negative = v < 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">{v !== 0 ? formatCurrency(v) : ''}</span>
            <div
              className={`w-full rounded-t-md transition-all min-h-[2px] ${negative ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`}
              style={{ height: `${Math.max(height, 1)}%` }}
              title={`${p.month}: ${formatCurrency(v)}`}
            />
            <span className="text-xs text-gray-400 mt-1">{p.month}</span>
          </div>
        )
      })}
    </div>
  )
}

export const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
]
