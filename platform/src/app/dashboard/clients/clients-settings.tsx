'use client'

import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import { usePageComms, CommsSubsetSection } from '@/components/page-comms-settings'

// Client-relationship messages, not tied to a specific booking's lifecycle
// (those live on the Bookings drawer instead) — payment nudges, post-service
// follow-up, and win-back/retention.
const CLIENT_COMM_KEYS = ['payment_receipt', 'payment_reminder', 'rating_prompt', 'thank_you', 'retention']

type ClientsViewPrefs = {
  default_tab: string
  default_stage_filter: string
  default_type_filter: string
}

const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'

function ToggleRow({ label, helper, on, onChange }: { label: string; helper: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span className="flex-1">
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-white/60 mt-0.5">{helper}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-gray-600'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`} />
      </button>
    </label>
  )
}

export default function ClientsSettings() {
  const settings = usePageSettings('clients')
  const viewPrefs = useUserPrefs<ClientsViewPrefs>('clients', {
    default_tab: 'all',
    default_stage_filter: 'all',
    default_type_filter: 'all',
  })
  const comms = usePageComms(settings.open)
  const tenantSettings = useTenantSettings()
  const selena = (tenantSettings.tenant?.selena_config as Record<string, unknown> | null) || {}
  const defaultClientStatus = (selena.default_client_status as string) || 'active'
  const requireClientPhone = !!selena.require_client_phone
  const requireClientEmail = !!selena.require_client_email

  return (
    <PageSettingsPanel
      {...settings}
      title="Clients"
      tips={[
        'View defaults control which tab and filters the Clients page opens to.',
        'Communication toggles here mirror the tenant-wide Communications tab — changing one changes the other.',
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
                <option value="all">All Clients</option>
                <option value="lifecycle">Lifecycle</option>
                <option value="cohorts">Cohorts</option>
                <option value="conversations">Conversations</option>
                <option value="reviews">Reviews</option>
                <option value="referrals">Referrals</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default stage filter</span>
              <select
                className={selectCls}
                value={viewPrefs.prefs.default_stage_filter}
                onChange={(e) => viewPrefs.updatePref('default_stage_filter', e.target.value)}
              >
                <option value="all">All stages</option>
                <option value="lead">Lead</option>
                <option value="first">First-Time</option>
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="risk">At-Risk</option>
                <option value="lapsed">Lapsed</option>
                <option value="dns">DNS</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default type filter</span>
              <select
                className={selectCls}
                value={viewPrefs.prefs.default_type_filter}
                onChange={(e) => viewPrefs.updatePref('default_type_filter', e.target.value)}
              >
                <option value="all">All</option>
                <option value="recurring">Recurring</option>
                <option value="one-time">One-Time</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Client Creation Rules</p>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default status for new clients</span>
              <select
                className={selectCls}
                value={defaultClientStatus}
                onChange={(e) => tenantSettings.updateSelenaConfig({ default_client_status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="lead">Lead</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <ToggleRow
              label="Require phone number"
              helper="A new client cannot be created without a phone number."
              on={requireClientPhone}
              onChange={(v) => tenantSettings.updateSelenaConfig({ require_client_phone: v })}
            />
            <ToggleRow
              label="Require email address"
              helper="A new client cannot be created without an email address."
              on={requireClientEmail}
              onChange={(v) => tenantSettings.updateSelenaConfig({ require_client_email: v })}
            />
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Communication</p>
            {comms.error && <p className="text-sm text-red-400">{comms.error}</p>}
            {!comms.prefs && !comms.error && <p className="text-sm text-gray-400">Loading&hellip;</p>}
            {comms.prefs && (
              <CommsSubsetSection keys={CLIENT_COMM_KEYS} prefs={comms.prefs} saving={comms.saving} onToggle={comms.toggleChannel} />
            )}
            {comms.savedAt && <p className="text-xs text-emerald-400">Saved.</p>}
          </div>
        </div>
      )}
    </PageSettingsPanel>
  )
}
