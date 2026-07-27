'use client'

import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'
import { useTenantSettings } from '@/lib/use-tenant-settings'

// Same canonical list as the tenant-wide Settings page (PAYMENT_METHOD_OPTIONS
// in dashboard/settings/page.tsx) — kept in sync manually since payment
// methods rarely change; both write to the same tenants.payment_methods column.
const PAYMENT_METHOD_OPTIONS = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
]

type CatalogViewPrefs = {
  default_tab: string
}

const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'

export default function CatalogSettings() {
  const settings = usePageSettings('catalog')
  const viewPrefs = useUserPrefs<CatalogViewPrefs>('catalog', { default_tab: 'services' })
  const tenantSettings = useTenantSettings()
  const paymentMethods: string[] = Array.isArray(tenantSettings.tenant?.payment_methods)
    ? (tenantSettings.tenant?.payment_methods as string[])
    : ['zelle', 'stripe']

  function togglePaymentMethod(value: string) {
    const next = paymentMethods.includes(value)
      ? paymentMethods.filter((m) => m !== value)
      : [...paymentMethods, value]
    tenantSettings.updateField('payment_methods', next)
  }

  return (
    <PageSettingsPanel
      {...settings}
      title="Catalog"
      tips={[
        'The default tab controls which view Catalog opens to.',
        'Payment methods here also drive what a client sees at checkout.',
      ]}
    >
      {() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">View</p>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default tab</span>
              <select
                className={selectCls}
                value={viewPrefs.prefs.default_tab}
                onChange={(e) => viewPrefs.updatePref('default_tab', e.target.value)}
              >
                <option value="services">Services</option>
                <option value="budgets">Budgets</option>
                <option value="vendors">Vendors</option>
                <option value="categories">Categories</option>
                <option value="inventory">Inventory</option>
                <option value="equipment">Equipment</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Payment Methods Accepted</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHOD_OPTIONS.map((pm) => (
                <label key={pm.value} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(pm.value)}
                    onChange={() => togglePaymentMethod(pm.value)}
                    className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  {pm.label}
                </label>
              ))}
            </div>
            {tenantSettings.saveMsg && <p className="text-xs text-emerald-400 mt-1">{tenantSettings.saveMsg}</p>}
          </div>
        </div>
      )}
    </PageSettingsPanel>
  )
}
