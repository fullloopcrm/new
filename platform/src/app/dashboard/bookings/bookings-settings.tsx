'use client'

import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'
import { usePageComms, CommsSubsetSection } from '@/components/page-comms-settings'
import { useTenantSettings } from '@/lib/use-tenant-settings'

// The booking-lifecycle messages — everything tied to a specific
// appointment's own timeline. Client-relationship messages that aren't
// about one booking (payment nudges, win-back, ratings) live on the
// Clients drawer instead.
const BOOKING_COMM_KEYS = ['booking_received', 'booking_confirmed', 'confirmation_reminder', 'booking_reminder', 'reschedule', 'cancellation']

type BookingsViewPrefs = {
  default_status_filter: string
}

const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'

export default function BookingsSettings() {
  const settings = usePageSettings('bookings')
  const viewPrefs = useUserPrefs<BookingsViewPrefs>('bookings', { default_status_filter: 'scheduled' })
  const comms = usePageComms(settings.open)
  const tenantSettings = useTenantSettings()
  const autoBookingOn = !!(tenantSettings.tenant?.selena_config as Record<string, unknown> | null)?.auto_booking_enabled

  return (
    <PageSettingsPanel
      {...settings}
      title="Bookings"
      tips={[
        'The default status filter controls which status the Bookings list opens showing.',
        'Communication toggles here mirror the tenant-wide Communications tab — changing one changes the other.',
        'Auto booking assigns a team member and schedules the job the instant a client books — skip it if you want every new booking to land as Pending for a human to review first.',
      ]}
    >
      {() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">View</p>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default status filter</span>
              <select
                className={selectCls}
                value={viewPrefs.prefs.default_status_filter}
                onChange={(e) => viewPrefs.updatePref('default_status_filter', e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Canceled</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Booking</p>
            <label className="flex items-start justify-between gap-4 cursor-pointer">
              <span className="flex-1">
                <span className="block text-sm font-medium text-white">Auto booking</span>
                <span className="block text-xs text-white/60 mt-0.5">
                  New bookings skip Pending — the best-available team member is assigned automatically and the job goes straight to Scheduled.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={autoBookingOn}
                disabled={!tenantSettings.loaded}
                onClick={() => tenantSettings.updateSelenaConfig({ auto_booking_enabled: !autoBookingOn })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${autoBookingOn ? 'bg-emerald-500' : 'bg-gray-600'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoBookingOn ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`} />
              </button>
            </label>
            {tenantSettings.saveMsg && <p className="text-xs text-emerald-400">{tenantSettings.saveMsg}</p>}
          </div>

          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Communication</p>
            {comms.error && <p className="text-sm text-red-400">{comms.error}</p>}
            {!comms.prefs && !comms.error && <p className="text-sm text-gray-400">Loading&hellip;</p>}
            {comms.prefs && (
              <CommsSubsetSection keys={BOOKING_COMM_KEYS} prefs={comms.prefs} saving={comms.saving} onToggle={comms.toggleChannel} />
            )}
            {comms.savedAt && <p className="text-xs text-emerald-400">Saved.</p>}
          </div>
        </div>
      )}
    </PageSettingsPanel>
  )
}
