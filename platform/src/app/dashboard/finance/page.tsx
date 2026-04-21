'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { downloadCSV } from '@/lib/csv'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'
import AskBar from './ask-bar'

type PayrollItem = {
  id: string
  name: string
  pending_hours: number
  pending_pay: number
  jobs: number
}

type Expense = {
  id: string
  category: string
  amount: number
  description: string | null
  date: string
}

const CATEGORIES = ['supplies', 'transport', 'insurance', 'software', 'marketing', 'meals', 'rent', 'utilities', 'other']

const categoryIcons: Record<string, string> = {
  supplies: 'S', transport: 'T', insurance: 'I', software: 'W', marketing: 'M',
  meals: 'F', rent: 'R', utilities: 'U', other: 'O',
}

const TABS = ['revenue', 'payroll', 'expenses', 'pnl', '1099'] as const

export default function FinancePage() {
  const [tab, setTab] = useState<typeof TABS[number]>('revenue')
  const [revenue, setRevenue] = useState({ today: 0, week: 0, month: 0, year: 0, todayCount: 0, weekCount: 0, monthCount: 0, yearCount: 0 })
  const [payroll, setPayroll] = useState<PayrollItem[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ category: 'supplies', amount: '', description: '', date: '' })
  const [saving, setSaving] = useState(false)
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; amount: number }[]>([])

  const financeSettings = usePageSettings('finance')

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/revenue?period=today').then((r) => r.json()),
      fetch('/api/finance/revenue?period=week').then((r) => r.json()),
      fetch('/api/finance/revenue?period=month').then((r) => r.json()),
      fetch('/api/finance/revenue?period=year').then((r) => r.json()),
    ]).then(([t, w, m, y]) => {
      setRevenue({
        today: t.total_revenue || 0, todayCount: t.booking_count || 0,
        week: w.total_revenue || 0, weekCount: w.booking_count || 0,
        month: m.total_revenue || 0, monthCount: m.booking_count || 0,
        year: y.total_revenue || 0, yearCount: y.booking_count || 0,
      })
    })
    // Generate monthly revenue data from paid bookings
    fetch('/api/finance/revenue?monthly=true')
      .then(r => r.json())
      .then(data => {
        if (data.monthly) {
          setMonthlyRevenue(data.monthly)
        }
      })
      .catch(() => {})
    fetch('/api/finance/payroll').then((r) => r.json()).then((d) => setPayroll(d.payroll || []))
    fetch('/api/finance/expenses').then((r) => r.json()).then((d) => setExpenses(d.expenses || []))
  }, [])

  async function addExpense(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseForm),
    })
    if (res.ok) {
      const { expense } = await res.json()
      setExpenses((prev) => [expense, ...prev])
      setShowAddExpense(false)
      setExpenseForm({ category: 'supplies', amount: '', description: '', date: '' })
    }
    setSaving(false)
  }

  async function markPaid(memberId: string, amount: number) {
    const method = prompt('Payment method (zelle/apple_cash/cash):')
    if (!method) return
    await fetch('/api/finance/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_member_id: memberId,
        amount,
        method,
        period_end: new Date().toISOString().split('T')[0],
      }),
    })
    setPayroll((prev) => prev.map((p) => p.id === memberId ? { ...p, pending_pay: 0, pending_hours: 0, jobs: 0 } : p))
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' })
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })

  // P&L calculations
  const totalRevenue = revenue.year
  const totalLabor = payroll.reduce((sum, p) => sum + p.pending_pay * 100, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const grossProfit = totalRevenue - totalLabor
  const netProfit = grossProfit - totalExpenses
  const grossMargin = totalRevenue > 0 ? ((grossProfit) / totalRevenue * 100) : 0
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0

  // Expense breakdown
  const expenseByCategory: Record<string, number> = {}
  for (const exp of expenses) {
    expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + exp.amount
  }

  const pendingPayTotal = payroll.reduce((s, p) => s + p.pending_pay, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Finance</h2>
            <p className="text-sm text-slate-400">Revenue, payroll, expenses & P&L</p>
          </div>
          <PageSettingsGear open={financeSettings.open} setOpen={financeSettings.setOpen} title="Finance" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/dashboard/finance/transactions" className="px-3 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700">
            Transactions →
          </a>
          <a href="/dashboard/finance/import" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Import
          </a>
          <a href="/dashboard/finance/receipts" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Receipts
          </a>
          <a href="/dashboard/finance/reconcile" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Reconcile
          </a>
          <a href="/dashboard/finance/accounts" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Bank Accounts
          </a>
          <a href="/dashboard/finance/reports" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Reports
          </a>
          <a href="/dashboard/finance/recurring" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Recurring
          </a>
          <a href="/dashboard/finance/entities" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Entities
          </a>
          <a href="/dashboard/finance/close" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Close
          </a>
          <a href="/dashboard/finance/audit" className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Audit
          </a>
          <a href={`/api/finance/year-end-zip?year=${new Date().getUTCFullYear() - 1}`} className="px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50">
            Year-End Zip
          </a>
        </div>
      </div>
      <AskBar />

      <PageSettingsPanel
        {...financeSettings}
        title="Finance"
        tips={[
          'Revenue is calculated from completed and paid bookings',
          'Mark team member payroll as paid to track labor costs',
          'Add expenses with categories to see accurate P&L',
          'Export 1099 data for contractors earning over $600/yr',
        ]}
      >
        {({ config, updateConfig }) => (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Fiscal Year Start Month</label>
              <select
                value={(config.fiscal_year_start as string) || '1'}
                onChange={(e) => updateConfig('fiscal_year_start', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                  <option key={i + 1} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Default Expense Categories</label>
              <input
                type="text"
                value={(config.expense_categories as string) || 'supplies, transport, insurance, software, marketing, meals, rent, utilities, other'}
                onChange={(e) => updateConfig('expense_categories', e.target.value)}
                placeholder="Comma-separated list"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full"
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated list of expense categories</p>
            </div>
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Tax Rate % (for estimates)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(config.tax_rate as number) ?? ''}
                onChange={(e) => updateConfig('tax_rate', parseFloat(e.target.value) || 0)}
                placeholder="e.g. 8.5"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-32"
              />
              <span className="text-xs text-slate-400 ml-2">%</span>
            </div>
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Currency Symbol</label>
              <input
                type="text"
                value={(config.currency_symbol as string) || '$'}
                onChange={(e) => updateConfig('currency_symbol', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-20"
                maxLength={3}
              />
            </div>
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-3 block">Payment Methods Accepted</label>
              <div className="flex flex-wrap gap-3">
                {['Zelle', 'Apple Pay', 'Venmo', 'Cash', 'Check', 'Card'].map((method) => {
                  const key = method.toLowerCase().replace(' ', '_')
                  const methods = (config.payment_methods as string[]) || []
                  const checked = methods.includes(key)
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const updated = checked ? methods.filter(m => m !== key) : [...methods, key]
                          updateConfig('payment_methods', updated)
                        }}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      {method}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Zelle Email</label>
              <input
                type="email"
                value={(config.zelle_email as string) || ''}
                onChange={(e) => updateConfig('zelle_email', e.target.value)}
                placeholder="your@email.com"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Apple Cash Phone</label>
              <input
                type="tel"
                value={(config.apple_cash_phone as string) || ''}
                onChange={(e) => updateConfig('apple_cash_phone', e.target.value)}
                placeholder="(555) 555-5555"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-xs placeholder-gray-600"
              />
            </div>
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Commission Rate for Referrals</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={(config.referral_commission_rate as number) ?? ''}
                  onChange={(e) => updateConfig('referral_commission_rate', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 10"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-32"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Percentage paid out on referral bookings</p>
            </div>
          </div>
        )}
      </PageSettingsPanel>

      {/* REVENUE OVERVIEW — always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Today', value: revenue.today, count: revenue.todayCount, color: 'border-l-green-500' },
          { label: 'This Week', value: revenue.week, count: revenue.weekCount, color: 'border-l-blue-500' },
          { label: 'This Month', value: revenue.month, count: revenue.monthCount, color: 'border-l-purple-500' },
          { label: 'Year to Date', value: revenue.year, count: revenue.yearCount, color: 'border-l-orange-500' },
        ].map((card) => (
          <div key={card.label} className={`border border-slate-200 rounded-lg border-l-4 ${card.color} p-5`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(card.value)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.count} paid job{card.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-1 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-50'
            }`}>
            {t === 'pnl' ? 'P&L' : t === '1099' ? '1099' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* REVENUE TAB */}
      {tab === 'revenue' && (
        <div className="border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Today', value: revenue.today, count: revenue.todayCount, pct: revenue.month > 0 ? (revenue.today / revenue.month * 100) : 0 },
              { label: 'This Week', value: revenue.week, count: revenue.weekCount, pct: revenue.month > 0 ? (revenue.week / revenue.month * 100) : 0 },
              { label: 'This Month', value: revenue.month, count: revenue.monthCount, pct: 100 },
              { label: 'Year to Date', value: revenue.year, count: revenue.yearCount, pct: 100 },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="font-medium text-slate-900">{fmt(row.value)} <span className="text-slate-400 text-xs">({row.count} jobs)</span></span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full">
                  <div className="h-1.5 bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(row.pct, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVENUE TREND CHART */}
      {tab === 'revenue' && monthlyRevenue.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-5 mb-6 mt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Revenue Trend (Last 12 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* PAYROLL TAB */}
      {tab === 'payroll' && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 text-sm">Pending Payroll</h3>
            <span className="text-xs text-slate-400">${pendingPayTotal.toFixed(2)} pending</span>
          </div>
          {payroll.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No team members</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {payroll.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.jobs} job{p.jobs !== 1 ? 's' : ''} &middot; {p.pending_hours.toFixed(1)} hrs</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900">${p.pending_pay.toFixed(2)}</span>
                    {p.pending_pay > 0 && (
                      <button onClick={() => markPaid(p.id, p.pending_pay)}
                        className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-500/30">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXPENSES TAB */}
      {tab === 'expenses' && (
        <div>
          {/* Expense breakdown */}
          {Object.keys(expenseByCategory).length > 0 && (
            <div className="border border-slate-200 rounded-lg p-5 mb-4">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">By Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <span className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                      {categoryIcons[cat] || 'O'}
                    </span>
                    <div>
                      <p className="text-xs text-slate-400 capitalize">{cat}</p>
                      <p className="text-sm font-medium text-slate-900">{fmt(amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EXPENSE BREAKDOWN PIE CHART */}
          {expenses.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-5 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Expense Breakdown</h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        expenses.reduce<Record<string, number>>((acc, e) => {
                          acc[e.category] = (acc[e.category] || 0) + e.amount
                          return acc
                        }, {})
                      ).map(([name, value]) => ({ name, value: value / 100 }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'].map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mb-4">
            <button onClick={() => downloadCSV(
              expenses.map(e => ({ ...e, amount: (e.amount / 100).toFixed(2) })) as unknown as Record<string, unknown>[],
              'expenses',
              ['category', 'description', 'amount', 'date', 'created_at']
            )} className="text-sm text-slate-400 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg">
              Export Expenses
            </button>
            <button onClick={() => setShowAddExpense(!showAddExpense)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 transition-colors">
              {showAddExpense ? 'Cancel' : '+ Add Expense'}
            </button>
          </div>

          {showAddExpense && (
            <form onSubmit={addExpense} className="border border-slate-200 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-slate-900 mb-4">Add Expense</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Category</label>
                  <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Amount ($) *</label>
                  <input placeholder="0.00" type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Description</label>
                  <input placeholder="What was this for?" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase mb-1 block">Date</label>
                  <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !expenseForm.amount}
                  className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Expense'}
                </button>
                <button type="button" onClick={() => setShowAddExpense(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-900">Cancel</button>
              </div>
            </form>
          )}

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                    <td className="px-4 py-3 capitalize text-slate-900 font-medium">{exp.category}</td>
                    <td className="px-4 py-3 text-slate-400">{exp.description || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{fmt(exp.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteExpense(exp.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No expenses recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P&L TAB */}
      {tab === 'pnl' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-slate-200 rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Profit & Loss (YTD)</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Revenue</span>
                <span className="font-medium text-green-600">{fmt(totalRevenue)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Labor Cost</span>
                <span className="text-red-600">-{fmt(totalLabor)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between py-1.5">
                <span className="text-slate-400">Gross Profit</span>
                <span className="font-medium">{fmt(grossProfit)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Gross Margin</span>
                <span className="font-medium">{grossMargin.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Operating Expenses</span>
                <span className="text-red-600">-{fmt(totalExpenses)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="font-bold text-slate-900">Net Profit</span>
                <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(netProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Margin</span>
                <span className={`font-medium ${netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="space-y-3">
            {[
              { label: 'Total Revenue', value: fmt(totalRevenue), color: 'border-l-green-500', sub: `${revenue.yearCount} paid jobs` },
              { label: 'Total Labor', value: fmt(totalLabor), color: 'border-l-red-500', sub: `${payroll.length} team members` },
              { label: 'Total Expenses', value: fmt(totalExpenses), color: 'border-l-orange-500', sub: `${expenses.length} entries` },
              { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? 'border-l-green-500' : 'border-l-red-500', sub: `${netMargin.toFixed(1)}% margin` },
            ].map((card) => (
              <div key={card.label} className={`border border-slate-200 rounded-lg border-l-4 ${card.color} p-5`}>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide">{card.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{card.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1099 TAB */}
      {tab === '1099' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">Per-contractor YTD totals</p>
            <button
              onClick={() => {
                const csv = ['Name,YTD Earnings,Threshold Met']
                  .concat(payroll.map((p) => `${p.name},${p.pending_pay.toFixed(2)},${p.pending_pay >= 600 ? 'Yes' : 'No'}`))
                  .join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = '1099-report.csv'
                a.click()
              }}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold hover:bg-teal-700 transition-colors">
              Export CSV
            </button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">YTD Earnings</th>
                  <th className="px-4 py-3 font-medium">$600 Threshold</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((p) => (
                  <tr key={p.id} className="border-b border-slate-200/50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-slate-400">${p.pending_pay.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        p.pending_pay >= 600 ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {p.pending_pay >= 600 ? '1099 Required' : 'Below Threshold'}
                      </span>
                    </td>
                  </tr>
                ))}
                {payroll.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No contractors</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
