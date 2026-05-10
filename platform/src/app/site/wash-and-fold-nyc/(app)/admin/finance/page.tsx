// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'

interface PaymentHistoryItem {
  id: string
  cleaner_paid_at: string
  cleaner_pay: number
  actual_hours: number
  start_time: string
  client_name: string
  cleaner_name: string
}

interface FinanceSummary {
  // Revenue
  weekRevenue: number
  monthRevenue: number
  yearRevenue: number
  // Labor
  weekLabor: number
  monthLabor: number
  yearLabor: number
  // Labor paid/owed breakdown
  weekLaborPaid: number
  monthLaborPaid: number
  yearLaborPaid: number
  weekLaborOwed: number
  monthLaborOwed: number
  yearLaborOwed: number
  // Counts
  weekJobs: number
  monthJobs: number
  yearJobs: number
  // Pending payments
  pendingClientPayments: number
  pendingCleanerPayments: number
  // Referral commissions
  monthReferralCommissions: number
  yearReferralCommissions: number
  // Per-cleaner breakdown
  cleanerTotals: { cleaner_id: string; name: string; total: number; count: number }[]
  // Payment history
  recentPayments: PaymentHistoryItem[]
}

interface Expense {
  id: string
  date: string
  amount: number
  category: string
  description: string
  vendor: string | null
  receipt_url: string | null
  created_at: string
}

interface BankStatement {
  id: string
  month: string
  account_name: string
  file_url: string | null
  notes: string | null
  created_at: string
}

interface PendingPayment {
  id: string
  client_name: string
  cleaner_name: string
  amount: number
  cleaner_pay: number
  date: string
  actual_hours: number
  payment_status: string | null
  cleaner_paid: boolean | null
}

interface CleanerSummary {
  cleaner_id: string
  name: string
  totalPay: number
  totalHours: number
  jobCount: number
  paidTotal: number
  unpaidTotal: number
}

interface CleanerIncomeBooking {
  id: string
  date: string
  client_name: string
  cleaner_name: string
  cleaner_id: string
  hours: number
  cleaner_pay: number
  paid: boolean
}

interface CleanerOption {
  id: string
  name: string
}

const EXPENSE_CATEGORIES = [
  'Supplies',
  'Equipment',
  'Transportation',
  'Marketing',
  'Software',
  'Insurance',
  'Phone/Internet',
  'Office',
  'Other'
]

export default function FinancePage() {
  useEffect(() => { document.title = 'Finance | Wash and Fold NYC' }, [])

  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [statements, setStatements] = useState<BankStatement[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'Supplies',
    description: '',
    vendor: ''
  })
  const [statementForm, setStatementForm] = useState({
    month: new Date().toISOString().slice(0, 7) + '-01',
    account_name: 'Business Checking',
    notes: ''
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [statementFile, setStatementFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'payroll' | 'statements' | '1099' | 'cleaner-income'>('overview')
  const [backfilling, setBackfilling] = useState(false)
  // Cleaner Income state
  const [cleanerIncomeData, setCleanerIncomeData] = useState<{ cleanerSummaries: CleanerSummary[]; bookings: CleanerIncomeBooking[] } | null>(null)
  const [cleanersList, setCleanersList] = useState<CleanerOption[]>([])
  const [incomeCleanerFilter, setIncomeCleanerFilter] = useState('')
  const [incomeDateRange, setIncomeDateRange] = useState<'this_week' | 'this_month' | 'this_year' | 'custom'>('this_month')
  const [incomeCustomFrom, setIncomeCustomFrom] = useState('')
  const [incomeCustomTo, setIncomeCustomTo] = useState('')
  const [incomePaidFilter, setIncomePaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [incomeLoading, setIncomeLoading] = useState(false)

  useEffect(() => {
    loadData()
    loadCleanersList()
  }, [])

  // Load cleaner income when tab is active or filters change
  useEffect(() => {
    if (activeTab === 'cleaner-income') {
      if (incomeDateRange === 'custom') {
        if (incomeCustomFrom.length === 10 && incomeCustomTo.length === 10) {
          loadCleanerIncome()
        }
      } else {
        loadCleanerIncome()
      }
    }
  }, [activeTab, incomeCleanerFilter, incomeDateRange, incomeCustomFrom, incomeCustomTo, incomePaidFilter])

  const loadCleanersList = async () => {
    try {
      const res = await fetch('/api/cleaners')
      if (res.ok) {
        const data = await res.json()
        setCleanersList(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }
    } catch (err) {
      console.error('Failed to load cleaners:', err)
    }
  }

  const loadCleanerIncome = async () => {
    setIncomeLoading(true)
    try {
      const params = new URLSearchParams()
      if (incomeCleanerFilter) params.set('cleaner_id', incomeCleanerFilter)
      if (incomePaidFilter !== 'all') params.set('paid_status', incomePaidFilter)

      const now = new Date()
      if (incomeDateRange === 'this_week') {
        const dayOfWeek = now.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset)
        params.set('from', weekStart.toISOString().split('T')[0])
        params.set('to', now.toISOString().split('T')[0])
      } else if (incomeDateRange === 'this_month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        params.set('from', monthStart.toISOString().split('T')[0])
        params.set('to', now.toISOString().split('T')[0])
      } else if (incomeDateRange === 'this_year') {
        const yearStart = new Date(now.getFullYear(), 0, 1)
        params.set('from', yearStart.toISOString().split('T')[0])
        params.set('to', now.toISOString().split('T')[0])
      } else if (incomeDateRange === 'custom') {
        if (incomeCustomFrom) params.set('from', incomeCustomFrom)
        if (incomeCustomTo) params.set('to', incomeCustomTo)
      }

      const res = await fetch(`/api/finance/cleaner-income?${params.toString()}`)
      if (res.ok) {
        setCleanerIncomeData(await res.json())
      }
    } catch (err) {
      console.error('Failed to load cleaner income:', err)
    }
    setIncomeLoading(false)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [summaryRes, expensesRes, pendingRes, statementsRes] = await Promise.all([
        fetch('/api/finance/summary'),
        fetch('/api/finance/expenses'),
        fetch('/api/finance/pending'),
        fetch('/api/finance/statements')
      ])

      if (summaryRes.ok) setSummary(await summaryRes.json())
      if (expensesRes.ok) setExpenses(await expensesRes.json())
      if (pendingRes.ok) setPendingPayments(await pendingRes.json())
      if (statementsRes.ok) setStatements(await statementsRes.json())
    } catch (err) {
      console.error('Failed to load finance data:', err)
    }
    setLoading(false)
  }

  const uploadFile = async (file: File, type: 'receipt' | 'statement'): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const res = await fetch('/api/finance/upload', {
      method: 'POST',
      body: formData
    })

    if (res.ok) {
      const data = await res.json()
      return data.url
    }
    return null
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    let receipt_url = null
    if (receiptFile) {
      setUploading(true)
      receipt_url = await uploadFile(receiptFile, 'receipt')
      setUploading(false)
    }

    const res = await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...expenseForm,
        amount: Math.round(parseFloat(expenseForm.amount) * 100),
        receipt_url
      })
    })

    if (res.ok) {
      setShowExpenseModal(false)
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: 'Supplies',
        description: '',
        vendor: ''
      })
      setReceiptFile(null)
      loadData()
    }
    setSaving(false)
  }

  const handleAddStatement = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    let file_url = null
    if (statementFile) {
      setUploading(true)
      file_url = await uploadFile(statementFile, 'statement')
      setUploading(false)
    }

    const res = await fetch('/api/finance/statements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...statementForm,
        file_url
      })
    })

    if (res.ok) {
      setShowStatementModal(false)
      setStatementForm({
        month: new Date().toISOString().slice(0, 7) + '-01',
        account_name: 'Business Checking',
        notes: ''
      })
      setStatementFile(null)
      loadData()
    }
    setSaving(false)
  }

  const handleDeleteStatement = async (id: string) => {
    if (!confirm('Delete this statement?')) return
    await fetch(`/api/finance/statements?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/finance/expenses?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  const handleMarkPaid = async (bookingId: string, type: 'client' | 'cleaner') => {
    await fetch('/api/finance/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, type })
    })
    loadData()
  }

  const handleBackfill = async () => {
    if (!confirm('This will calculate cleaner_pay for all historical completed bookings. Continue?')) return
    setBackfilling(true)
    const res = await fetch('/api/finance/backfill', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      alert(`Updated ${data.updated} bookings`)
      loadData()
    }
    setBackfilling(false)
  }

  const exportCSV = (type: 'expenses' | 'payroll' | '1099' | 'cleaner-income') => {
    let csv = ''
    let filename = ''

    if (type === 'expenses') {
      csv = 'Date,Category,Description,Vendor,Amount\n'
      expenses.forEach(e => {
        csv += `${e.date},${e.category},"${e.description}",${e.vendor || ''},$${(e.amount / 100).toFixed(2)}\n`
      })
      filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`
    } else if (type === 'payroll') {
      csv = 'Date,Client,Cleaner,Hours,Client Amount,Cleaner Pay\n'
      pendingPayments.forEach(p => {
        csv += `${p.date},"${p.client_name}","${p.cleaner_name}",${p.actual_hours},$${(p.amount / 100).toFixed(2)},$${(p.cleaner_pay / 100).toFixed(2)}\n`
      })
      filename = `payroll_pending_${new Date().toISOString().split('T')[0]}.csv`
    } else if (type === '1099') {
      csv = 'Cleaner,Total Paid YTD\n'
      summary?.cleanerTotals?.forEach(c => {
        csv += `"${c.name}",$${(c.total / 100).toFixed(2)}\n`
      })
      filename = `1099_summary_${new Date().getFullYear()}.csv`
    } else if (type === 'cleaner-income') {
      csv = 'Date,Client,Cleaner,Hours,Pay,Status\n'
      cleanerIncomeData?.bookings?.forEach(b => {
        csv += `${new Date(b.date).toLocaleDateString()},"${b.client_name}","${b.cleaner_name}",${b.hours},$${(b.cleaner_pay / 100).toFixed(2)},${b.paid ? 'Paid' : 'Unpaid'}\n`
      })
      filename = `cleaner_income_${new Date().toISOString().split('T')[0]}.csv`
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (cents: number) => {
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatCurrencyDecimal = (cents: number) => {
    return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Calculate totals
  const monthExpenses = expenses
    .filter(e => {
      const d = new Date(e.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const yearExpenses = expenses
    .filter(e => new Date(e.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, e) => sum + e.amount, 0)

  const monthCommissions = summary?.monthReferralCommissions || 0
  const yearCommissions = summary?.yearReferralCommissions || 0
  const monthProfit = (summary?.monthRevenue || 0) - (summary?.monthLabor || 0) - monthExpenses - monthCommissions
  const yearProfit = (summary?.yearRevenue || 0) - (summary?.yearLabor || 0) - yearExpenses - yearCommissions

  return (
    <>
      <main className="p-3 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Finance</h2>
          <div className="flex gap-2">
            <button
              onClick={handleBackfill}
              disabled={backfilling}
              className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm transition-colors"
            >
              {backfilling ? 'Backfilling...' : 'Backfill History'}
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 text-sm transition-colors"
            >
              + Add Expense
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto flex-nowrap pb-1">
          {([
            { key: 'overview' as const, label: 'Overview' },
            { key: 'payroll' as const, label: 'Payroll', badge: pendingPayments.length > 0 ? pendingPayments.length : null },
            { key: 'expenses' as const, label: 'Expenses' },
            { key: 'statements' as const, label: 'Statements' },
            { key: '1099' as const, label: '1099 Report' },
            { key: 'cleaner-income' as const, label: 'Cleaners Income' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#1E2A4A] text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-orange-400 text-white rounded-full text-xs">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Stat Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Revenue {new Date().toLocaleString('en-US', { month: 'short' })}</p>
                <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(summary?.monthRevenue || 0)}</p>
                <p className="text-xs text-green-600 mt-1">YTD {formatCurrency(summary?.yearRevenue || 0)}</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Labor Cost</p>
                <p className="text-2xl font-bold text-orange-800 mt-1">{formatCurrency(summary?.monthLabor || 0)}</p>
                <p className="text-xs text-orange-600 mt-1">Owed {formatCurrency(summary?.monthLaborOwed || 0)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Net Margin</p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(monthProfit)}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {summary?.monthRevenue ? Math.round((monthProfit / summary.monthRevenue) * 100) : 0}% margin
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Avg Ticket</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">
                  {summary?.monthJobs ? formatCurrency(Math.round((summary?.monthRevenue || 0) / summary.monthJobs)) : '$0'}
                </p>
                <p className="text-xs text-blue-600 mt-1">{summary?.monthJobs || 0} jobs this month</p>
              </div>
            </div>

            {/* Two-Column: Payroll + Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Payroll Panel */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">👥 PAYROLL</h3>
                  {pendingPayments.length > 0 && (
                    <button
                      onClick={() => setActiveTab('payroll')}
                      className="py-2 text-xs text-[#1E2A4A] hover:underline font-medium"
                    >
                      View all {pendingPayments.length} pending →
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {summary?.cleanerTotals && summary.cleanerTotals.length > 0 ? (
                    summary.cleanerTotals.map(c => (
                      <div key={c.cleaner_id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-medium text-[#1E2A4A] text-sm">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.count} jobs</p>
                        </div>
                        <span className="font-semibold text-green-600 text-sm">{formatCurrency(c.total)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-6 text-center text-gray-400 text-sm">No payroll data this period</div>
                  )}
                </div>
                {summary?.cleanerTotals && summary.cleanerTotals.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <span className="font-bold text-[#1E2A4A] text-sm">Total Owed</span>
                    <span className="font-bold text-orange-600">{formatCurrency(summary?.pendingCleanerPayments || 0)}</span>
                  </div>
                )}
              </div>

              {/* Right: Expenses Panel */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">🧾 EXPENSES</h3>
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className="py-2 text-xs text-[#1E2A4A] hover:underline font-medium"
                  >
                    View all →
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {expenses.length > 0 ? (
                    expenses.slice(0, 6).map(exp => (
                      <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-medium text-[#1E2A4A] text-sm">{exp.description}</p>
                          <p className="text-xs text-gray-400">{exp.category} · {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        <span className="font-semibold text-red-500 text-sm">-{formatCurrencyDecimal(exp.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-6 text-center text-gray-400 text-sm">No expenses recorded</div>
                  )}
                </div>
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <span className="font-bold text-[#1E2A4A] text-sm">Total (Month)</span>
                  <span className="font-bold text-red-600">-{formatCurrency(monthExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Pending Payments & Margin Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Payments */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">⏳ PENDING</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Client Payments Due</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(summary?.pendingClientPayments || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Team Payroll Due</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(summary?.pendingCleanerPayments || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Referral Commissions</span>
                    <span className="font-semibold text-red-500">-{formatCurrency(monthCommissions)}</span>
                  </div>
                </div>
                {pendingPayments.length > 0 && (
                  <div className="px-5 py-3 bg-orange-50 border-t border-orange-100">
                    <button
                      onClick={() => setActiveTab('payroll')}
                      className="py-2 text-sm text-orange-700 hover:underline font-medium w-full text-left"
                    >
                      {pendingPayments.length} bookings need action →
                    </button>
                  </div>
                )}
              </div>

              {/* Margin Analysis */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">📊 MARGIN ANALYSIS</h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Gross Margin</p>
                      <p className="text-2xl font-bold text-[#1E2A4A]">
                        {summary?.monthRevenue ? Math.round(((summary.monthRevenue - (summary?.monthLabor || 0)) / summary.monthRevenue) * 100) : 0}%
                      </p>
                      <p className="text-xs text-gray-400">Revenue - Labor</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Net Margin</p>
                      <p className="text-2xl font-bold text-[#1E2A4A]">
                        {summary?.monthRevenue ? Math.round((monthProfit / summary.monthRevenue) * 100) : 0}%
                      </p>
                      <p className="text-xs text-gray-400">After all costs</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Job Revenue</p>
                      <p className="text-2xl font-bold text-[#1E2A4A]">
                        {summary?.monthJobs ? formatCurrency(Math.round((summary?.monthRevenue || 0) / summary.monthJobs)) : '$0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Labor Cost</p>
                      <p className="text-2xl font-bold text-[#1E2A4A]">
                        {summary?.monthJobs ? formatCurrency(Math.round((summary?.monthLabor || 0) / summary.monthJobs)) : '$0'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Month + Year Detail Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">💰 THIS MONTH</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Revenue</span>
                    <span className="font-semibold text-green-600">{formatCurrency(summary?.monthRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Labor Paid</span>
                    <span className="font-semibold text-green-600">-{formatCurrency(summary?.monthLaborPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Labor Owed</span>
                    <span className="font-semibold text-orange-600">-{formatCurrency(summary?.monthLaborOwed || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expenses</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(monthExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Referral Comm.</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(monthCommissions)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <span className="font-bold text-[#1E2A4A]">Profit</span>
                    <span className={`font-bold text-lg ${monthProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(monthProfit)}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{summary?.monthJobs || 0} jobs completed</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">📅 YEAR TO DATE</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Revenue</span>
                    <span className="font-semibold text-green-600">{formatCurrency(summary?.yearRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Labor Paid</span>
                    <span className="font-semibold text-green-600">-{formatCurrency(summary?.yearLaborPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Labor Owed</span>
                    <span className="font-semibold text-orange-600">-{formatCurrency(summary?.yearLaborOwed || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Expenses</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(yearExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Referral Comm.</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(yearCommissions)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <span className="font-bold text-[#1E2A4A]">Profit</span>
                    <span className={`font-bold text-lg ${yearProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(yearProfit)}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{summary?.yearJobs || 0} jobs completed</p>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'payroll' ? (
          <div className="space-y-4">
            {/* Per-Cleaner Summary */}
            {summary?.cleanerTotals && summary.cleanerTotals.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-orange-800 uppercase tracking-wider">💸 TEAM PAY DUE</h4>
                  <button onClick={() => exportCSV('payroll')} className="text-xs text-orange-700 hover:underline font-medium">Export CSV</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {summary.cleanerTotals.map(c => (
                    <div key={c.cleaner_id} className="bg-white rounded-xl p-3 border border-orange-100">
                      <p className="font-medium text-[#1E2A4A]">{c.name}</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(c.total)}</p>
                      <p className="text-xs text-gray-500">{c.count} jobs</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                <strong>Pending payments:</strong> {pendingPayments.length} jobs need payment collection and/or team payroll
              </p>
            </div>

            {pendingPayments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">All caught up! No pending payments.</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cleaner</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Collect</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pay Team</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="p-4 text-gray-600">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="p-4 font-medium text-[#1E2A4A]">{p.client_name}</td>
                        <td className="p-4 text-gray-600">{p.cleaner_name}</td>
                        <td className="p-4 text-gray-600">{p.actual_hours}hrs</td>
                        <td className="p-4 font-semibold text-green-600">{formatCurrencyDecimal(p.amount)}</td>
                        <td className="p-4 font-semibold text-orange-600">{formatCurrencyDecimal(p.cleaner_pay)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {p.payment_status === 'paid' ? (
                              <span className="px-3 py-2.5 bg-green-50 text-green-500 rounded text-sm">Collected</span>
                            ) : (
                              <button
                                onClick={() => handleMarkPaid(p.id, 'client')}
                                className="px-3 py-2.5 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                              >
                                Collected
                              </button>
                            )}
                            {p.cleaner_paid ? (
                              <span className="px-3 py-2.5 bg-orange-50 text-orange-400 rounded text-sm">Paid</span>
                            ) : (
                              <button
                                onClick={() => handleMarkPaid(p.id, 'cleaner')}
                                className="px-3 py-2.5 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                              >
                                Paid Team
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* Recent Payment History */}
            {summary?.recentPayments && summary.recentPayments.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider mb-4">✅ RECENT PAYMENTS</h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Paid</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Date</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cleaner</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                        <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentPayments.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="p-4 text-gray-600">
                            {new Date(p.cleaner_paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-4 text-gray-600">
                            {new Date(p.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-4 font-medium text-[#1E2A4A]">{p.client_name}</td>
                          <td className="p-4 text-gray-600">{p.cleaner_name}</td>
                          <td className="p-4 text-gray-600">{p.actual_hours}hrs</td>
                          <td className="p-4 font-semibold text-green-600">{formatCurrencyDecimal(p.cleaner_pay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'expenses' ? (
          <div className="space-y-4">
            {/* Expense Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">This Month</p>
                <p className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(monthExpenses)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Year to Date</p>
                <p className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(yearExpenses)}</p>
              </div>
            </div>

            {/* Expense List */}
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No expenses recorded yet.</p>
                <button onClick={() => setShowExpenseModal(true)} className="mt-2 text-[#1E2A4A] hover:underline">Add your first expense</button>
              </div>
            ) : (
              <>
              <div className="flex justify-between items-center mb-4">
                <span></span>
                <button onClick={() => exportCSV('expenses')} className="text-sm text-[#1E2A4A] hover:underline">Export CSV</button>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-gray-100">
                        <td className="p-4 text-gray-600">{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-sm">{exp.category}</span></td>
                        <td className="p-4 text-[#1E2A4A]">{exp.description}</td>
                        <td className="p-4 text-gray-600">{exp.vendor || '-'}</td>
                        <td className="p-4 font-medium text-[#1E2A4A]">{formatCurrencyDecimal(exp.amount)}</td>
                        <td className="p-4">
                          {exp.receipt_url ? (
                            <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline text-sm">View</a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              </>
            )}
          </div>
        ) : activeTab === 'statements' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">🏦 BANK STATEMENTS</h3>
              <button
                onClick={() => setShowStatementModal(true)}
                className="px-4 py-2 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 text-sm"
              >
                Upload Statement
              </button>
            </div>

            {statements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No bank statements uploaded yet.</p>
                <button onClick={() => setShowStatementModal(true)} className="mt-2 text-[#1E2A4A] hover:underline">Upload your first statement</button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">File</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((stmt) => (
                      <tr key={stmt.id} className="border-b border-gray-100">
                        <td className="p-4 font-medium text-[#1E2A4A]">
                          {new Date(stmt.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-gray-600">{stmt.account_name}</td>
                        <td className="p-4 text-gray-600">{stmt.notes || '-'}</td>
                        <td className="p-4">
                          {stmt.file_url ? (
                            <a href={stmt.file_url} target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline text-sm">Download PDF</a>
                          ) : (
                            <span className="text-gray-400 text-sm">No file</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button onClick={() => handleDeleteStatement(stmt.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === '1099' ? (
          <div className="space-y-4">
            <div className="bg-[#A8F0DC]/20 border border-[#A8F0DC]/30 rounded-xl p-5 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-[#1E2A4A] uppercase tracking-wider">📋 1099 YEAR-END REPORT</h4>
                  <p className="text-sm text-[#1E2A4A] mt-1">Total paid to each contractor for tax year {new Date().getFullYear()}</p>
                </div>
                <button onClick={() => exportCSV('1099')} className="px-4 py-2 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 text-sm">
                  Export CSV
                </button>
              </div>
            </div>

            {!summary?.cleanerTotals || summary.cleanerTotals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No contractor payments recorded yet.</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contractor Name</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jobs Completed</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Paid YTD</th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">1099 Required?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.cleanerTotals.map((c) => (
                      <tr key={c.cleaner_id} className="border-b border-gray-100">
                        <td className="p-4 font-medium text-[#1E2A4A]">{c.name}</td>
                        <td className="p-4 text-gray-600">{c.count} jobs</td>
                        <td className="p-4 font-semibold text-[#1E2A4A]">{formatCurrency(c.total)}</td>
                        <td className="p-4">
                          {c.total >= 60000 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">Yes - Over $600</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">No - Under $600</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <p><strong>Note:</strong> IRS requires 1099-NEC forms for contractors paid $600+ in a calendar year. This report shows pending payments - make sure to also include any payments already made.</p>
            </div>
          </div>
        ) : activeTab === 'cleaner-income' ? (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={incomeCleanerFilter}
                onChange={(e) => setIncomeCleanerFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm"
              >
                <option value="">All Cleaners</option>
                {cleanersList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="flex gap-1">
                {(['this_week', 'this_month', 'this_year', 'custom'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setIncomeDateRange(range)}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      incomeDateRange === range
                        ? 'bg-[#1E2A4A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {range === 'this_week' ? 'This Week' : range === 'this_month' ? 'This Month' : range === 'this_year' ? 'This Year' : 'Custom'}
                  </button>
                ))}
              </div>

              {incomeDateRange === 'custom' && (
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={incomeCustomFrom}
                    onChange={(e) => setIncomeCustomFrom(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={incomeCustomTo}
                    onChange={(e) => setIncomeCustomTo(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm"
                  />
                </div>
              )}

              <div className="flex gap-1">
                {(['all', 'paid', 'unpaid'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setIncomePaidFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      incomePaidFilter === status
                        ? 'bg-[#1E2A4A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'paid' ? 'Paid' : 'Unpaid'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => exportCSV('cleaner-income')}
                className="ml-auto text-sm text-[#1E2A4A] hover:underline"
              >
                Export CSV
              </button>
            </div>

            {incomeLoading ? (
              <p className="text-gray-500 text-center py-8">Loading...</p>
            ) : cleanerIncomeData ? (
              <>
                {/* Per-cleaner summary cards */}
                {cleanerIncomeData.cleanerSummaries.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {cleanerIncomeData.cleanerSummaries.map(cs => (
                      <button
                        key={cs.cleaner_id}
                        onClick={() => setIncomeCleanerFilter(incomeCleanerFilter === cs.cleaner_id ? '' : cs.cleaner_id)}
                        className={`bg-white border rounded-xl p-4 text-left hover:shadow-sm transition-all ${
                          incomeCleanerFilter === cs.cleaner_id ? 'border-[#1E2A4A] ring-2 ring-[#1E2A4A]/20' : 'border-gray-200'
                        }`}
                      >
                        <p className="font-medium text-[#1E2A4A]">{cs.name}</p>
                        <p className="text-xl font-bold text-[#1E2A4A] mt-1">{formatCurrency(cs.totalPay)}</p>
                        <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                          <p>{cs.jobCount} jobs &middot; {cs.totalHours}hrs</p>
                          <p>Avg: {cs.jobCount ? formatCurrency(Math.round(cs.totalPay / cs.jobCount)) : '$0'}/job</p>
                          {cs.unpaidTotal > 0 && (
                            <p className="text-orange-600 font-medium">{formatCurrency(cs.unpaidTotal)} unpaid</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Totals bar */}
                {cleanerIncomeData.bookings.length > 0 && (() => {
                  const totals = cleanerIncomeData.bookings.reduce(
                    (acc, b) => ({
                      income: acc.income + b.cleaner_pay,
                      jobs: acc.jobs + 1,
                      hours: acc.hours + b.hours,
                      paid: acc.paid + (b.paid ? b.cleaner_pay : 0),
                      unpaid: acc.unpaid + (!b.paid ? b.cleaner_pay : 0),
                    }),
                    { income: 0, jobs: 0, hours: 0, paid: 0, unpaid: 0 }
                  )
                  return (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Total Income</p>
                          <p className="text-lg font-bold text-[#1E2A4A]">{formatCurrency(totals.income)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Jobs</p>
                          <p className="text-lg font-bold text-[#1E2A4A]">{totals.jobs}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Total Hours</p>
                          <p className="text-lg font-bold text-[#1E2A4A]">{totals.hours}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Paid</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(totals.paid)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unpaid</p>
                          <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.unpaid)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Detailed bookings table */}
                {cleanerIncomeData.bookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No bookings found for the selected filters.</p>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cleaner</th>
                            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pay</th>
                            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cleanerIncomeData.bookings.map((b) => (
                            <tr key={b.id} className="border-b border-gray-100">
                              <td className="p-4 text-gray-600">
                                {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </td>
                              <td className="p-4 font-medium text-[#1E2A4A]">{b.client_name}</td>
                              <td className="p-4 text-gray-600">{b.cleaner_name}</td>
                              <td className="p-4 text-gray-600">{b.hours}hrs</td>
                              <td className="p-4 font-semibold text-[#1E2A4A]">{formatCurrencyDecimal(b.cleaner_pay)}</td>
                              <td className="p-4">
                                {b.paid ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Paid</span>
                                ) : (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">Unpaid</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </main>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-[#1E2A4A]/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1E2A4A] mb-4">Add Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                  placeholder="What was this for?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Vendor (optional)</label>
                <input
                  type="text"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                  placeholder="Amazon, Home Depot, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Receipt (optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm"
                />
                {receiptFile && <p className="text-xs text-gray-500 mt-1">{receiptFile.name}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-[#1E2A4A] hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 px-4 py-2 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 transition-colors">
                  {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Statement Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 bg-[#1E2A4A]/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowStatementModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1E2A4A] mb-4">Upload Bank Statement</h3>
            <form onSubmit={handleAddStatement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Month</label>
                <input
                  type="month"
                  required
                  value={statementForm.month.slice(0, 7)}
                  onChange={(e) => setStatementForm({ ...statementForm, month: e.target.value + '-01' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Account</label>
                <select
                  value={statementForm.account_name}
                  onChange={(e) => setStatementForm({ ...statementForm, account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                >
                  <option value="Business Checking">Business Checking</option>
                  <option value="Business Savings">Business Savings</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Stripe">Stripe</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Statement PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setStatementFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm"
                />
                {statementFile && <p className="text-xs text-gray-500 mt-1">{statementFile.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={statementForm.notes}
                  onChange={(e) => setStatementForm({ ...statementForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A]"
                  placeholder="Any notes about this statement"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowStatementModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-[#1E2A4A] hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 px-4 py-2 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 transition-colors">
                  {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Upload Statement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
