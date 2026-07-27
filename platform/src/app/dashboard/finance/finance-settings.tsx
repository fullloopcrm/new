'use client'

import { useState } from 'react'
import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'
import { useTenantSettings } from '@/lib/use-tenant-settings'

type FinanceViewPrefs = {
  default_range: string
}

const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'

export default function FinanceSettings() {
  const settings = usePageSettings('finance')
  const viewPrefs = useUserPrefs<FinanceViewPrefs>('finance', { default_range: 'month' })
  const tenantSettings = useTenantSettings()
  const selena = (tenantSettings.tenant?.selena_config as Record<string, unknown> | null) || {}
  const fiscalYearStart = String(selena.fiscal_year_start ?? '1')
  const taxRate = Number(selena.tax_rate ?? 0)
  const expenseCategories: string[] = Array.isArray(tenantSettings.tenant?.expense_categories)
    ? (tenantSettings.tenant?.expense_categories as string[])
    : []
  const [newCategory, setNewCategory] = useState('')

  function addCategory() {
    const trimmed = newCategory.trim()
    if (!trimmed || expenseCategories.includes(trimmed)) return
    tenantSettings.updateField('expense_categories', [...expenseCategories, trimmed])
    setNewCategory('')
  }

  function removeCategory(cat: string) {
    tenantSettings.updateField('expense_categories', expenseCategories.filter((c) => c !== cat))
  }

  return (
    <PageSettingsPanel
      {...settings}
      title="Finance"
      tips={[
        'Which date range Finance opens to.',
        'Fiscal year and tax rate feed reporting and tax-line calculations tenant-wide.',
        'Expense categories appear in the dropdown wherever an expense is logged.',
      ]}
    >
      {() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">View</p>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default date range</span>
              <select
                className={selectCls}
                value={viewPrefs.prefs.default_range}
                onChange={(e) => viewPrefs.updatePref('default_range', e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="ytd">Year-to-date</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Reporting</p>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Fiscal year start month</span>
              <select
                className={selectCls}
                value={fiscalYearStart}
                onChange={(e) => tenantSettings.updateSelenaConfig({ fiscal_year_start: Number(e.target.value) })}
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Tax rate (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={taxRate}
                onChange={(e) => tenantSettings.updateSelenaConfig({ tax_rate: e.target.value === '' ? 0 : Number(e.target.value) })}
                className={inputCls}
              />
              <span className="block text-xs text-white/60 mt-1">Applied to tax-line calculations in reporting.</span>
            </label>
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Expense Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {expenseCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1.5 rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-200">
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)} aria-label={`Remove ${cat}`} className="text-gray-400 hover:text-white">&times;</button>
                </span>
              ))}
              {expenseCategories.length === 0 && <span className="text-xs text-gray-500">No categories yet.</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
                placeholder="Add a category…"
                className={inputCls}
              />
              <button type="button" onClick={addCategory} className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 flex-shrink-0">Add</button>
            </div>
          </div>

          {tenantSettings.saveMsg && <p className="text-xs text-emerald-400">{tenantSettings.saveMsg}</p>}
        </div>
      )}
    </PageSettingsPanel>
  )
}
