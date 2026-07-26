'use client'

import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import { usePageComms, CommsSubsetSection } from '@/components/page-comms-settings'

// Team-facing messages — job assignment, daily schedule, schedule changes,
// late check-in/out alerts, welcome/PIN. Client- and booking-facing messages
// live on the Clients and Bookings drawers instead.
const TEAM_COMM_KEYS = ['team_assignment', 'team_daily_summary', 'team_schedule_change', 'team_late_alert', 'team_welcome']

type TeamViewPrefs = {
  default_tab: string
}

const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'

export default function TeamSettings() {
  const settings = usePageSettings('team')
  const viewPrefs = useUserPrefs<TeamViewPrefs>('team', { default_tab: 'team' })
  const comms = usePageComms(settings.open)
  const tenantSettings = useTenantSettings()
  const selena = (tenantSettings.tenant?.selena_config as Record<string, unknown> | null) || {}
  const defaultPayRate = Number(selena.default_pay_rate ?? 0)

  return (
    <PageSettingsPanel
      {...settings}
      title="Team"
      tips={[
        'The default tab controls which view Team opens to.',
        'Communication toggles here mirror the tenant-wide Communications tab — changing one changes the other.',
        'Team welcome/PIN is transactional and always sends — it cannot be turned off.',
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
                <option value="team">Team</option>
                <option value="applications">Applications</option>
                <option value="sales_apps">Sales Apps</option>
                <option value="ops_admin">Ops Admin</option>
                <option value="performance">Performance</option>
                <option value="payroll">Payroll</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Defaults</p>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default pay rate ($/hr)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={defaultPayRate}
                onChange={(e) => tenantSettings.updateSelenaConfig({ default_pay_rate: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900"
              />
              <span className="block text-xs text-white/60 mt-1">Prefilled hourly rate when adding a new team member.</span>
            </label>
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Communication</p>
            {comms.error && <p className="text-sm text-red-400">{comms.error}</p>}
            {!comms.prefs && !comms.error && <p className="text-sm text-gray-400">Loading&hellip;</p>}
            {comms.prefs && (
              <CommsSubsetSection keys={TEAM_COMM_KEYS} prefs={comms.prefs} saving={comms.saving} onToggle={comms.toggleChannel} />
            )}
            {comms.savedAt && <p className="text-xs text-emerald-400">Saved.</p>}
          </div>
        </div>
      )}
    </PageSettingsPanel>
  )
}
