'use client'

import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'

const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'

export default function EcommerceSettings() {
  const settings = usePageSettings('ecommerce')

  return (
    <PageSettingsPanel
      {...settings}
      title="Store"
      tips={[
        'Turn the storefront off to hide the Shop page and cart from your site without deleting your products.',
        'Physical items collect a shipping address at checkout automatically — digital items never do.',
      ]}
    >
      {({ config, updateConfig }) => {
        const storefrontEnabled = config.storefront_enabled !== false
        const shippingFlatCents = typeof config.shipping_flat_cents === 'number' ? config.shipping_flat_cents : 0

        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Storefront</p>
              <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storefrontEnabled}
                  onChange={(e) => updateConfig('storefront_enabled', e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                />
                Shop page is live on my site
              </label>
            </div>

            <div className="space-y-3 border-t border-gray-800 pt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Shipping</p>
              <label className="block">
                <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Flat shipping rate ($, physical items only — 0 = free)</span>
                <input
                  type="text"
                  className={inputCls}
                  value={shippingFlatCents ? String(shippingFlatCents / 100) : ''}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^\d.]/g, ''))
                    updateConfig('shipping_flat_cents', Number.isFinite(n) ? Math.round(n * 100) : 0)
                  }}
                  placeholder="0"
                />
              </label>
            </div>

            <div className="space-y-3 border-t border-gray-800 pt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Order Notifications</p>
              <label className="block">
                <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Notify on new order</span>
                <select
                  className={selectCls}
                  value={(config.order_notify as string) || 'email'}
                  onChange={(e) => updateConfig('order_notify', e.target.value)}
                >
                  <option value="email">Email</option>
                  <option value="sms">Text</option>
                  <option value="both">Both</option>
                  <option value="none">Off</option>
                </select>
              </label>
            </div>

            {settings.saveMsg && <p className="text-xs text-emerald-400 mt-1">{settings.saveMsg}</p>}
          </div>
        )
      }}
    </PageSettingsPanel>
  )
}
