'use client'

import { ReactNode, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { PageSettingsPanel, usePageSettingsOpen } from '@/components/page-settings'
import { useTenantSettings } from '@/lib/use-tenant-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'

type FieldType = 'text' | 'number' | 'toggle' | 'select' | 'textarea'

// Where the field's value actually lives:
// - 'user'           → user_preferences.prefs[<key>] (per-team-member view state)
// - 'tenant_column'  → tenants.<key> (real column on tenants)
// - 'tenant_selena'  → tenants.selena_config.<key> (jsonb on tenants)
//
// Default is 'user' — most auto-gear fields are view defaults.
type FieldLayer = 'user' | 'tenant_column' | 'tenant_selena'

type FieldDef = {
  key: string
  label: string
  type: FieldType
  layer?: FieldLayer
  helper?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  default?: unknown
}

type PageEntry = {
  page: string
  title: string
  tips: string[]
  fields?: FieldDef[]
}

// Pages that render their own custom settings panel content (real fields,
// not the generic PAGE_MAP fallback) — we skip the auto-registrar for these
// so the drawer doesn't show two competing bodies. Every other page falls
// back to the generic PAGE_MAP-driven panel below.
const PAGES_WITH_CUSTOM_PANEL = new Set([
  'bookings', 'campaigns', 'catalog', 'clients', 'finance', 'notifications', 'referrals', 'reviews', 'sms', 'team',
])

const PAGE_MAP: Record<string, PageEntry> = {
  '': {
    page: 'overview', title: 'Overview',
    tips: ['This is your tenant home — server-rendered, nothing configurable here yet.'],
    fields: [],
  },
  'activity': {
    page: 'activity', title: 'Activity',
    tips: ['Recent client and team actions.'],
    fields: [
      { key: 'page_size', label: 'Items per page', type: 'number', layer: 'user', min: 10, max: 200, step: 10, default: 30, helper: 'How many activity rows load per page.' },
    ],
  },
  'ai': {
    page: 'ai', title: 'AI Assistant',
    tips: ['Quick-action AI chat for drafting content — nothing configurable here yet.'],
    fields: [],
  },
  'analytics': {
    page: 'analytics', title: 'Analytics',
    tips: ['A fixed-content dashboard — nothing configurable here yet.'],
    fields: [],
  },
  'books': {
    page: 'books', title: 'Books',
    tips: ['Default tab and filters for the ledger.'],
    fields: [
      { key: 'default_tab', label: 'Default tab', type: 'select', layer: 'user', helper: 'Which Books tab opens by default.', options: [
        { value: 'overview', label: 'Overview' }, { value: 'ledger', label: 'Ledger' }, { value: 'payroll', label: 'Payroll' }, { value: 'expenses', label: 'Expenses' }, { value: 'reconcile', label: 'Reconcile' }, { value: 'tax', label: 'Tax' }, { value: 'statements', label: 'Statements' }, { value: 'cleaners', label: 'Cleaners' },
      ], default: 'ledger' },
      { key: 'default_status_filter', label: 'Default status filter', type: 'select', layer: 'user', helper: 'Which ledger rows show by default.', options: [
        { value: 'all', label: 'All' }, { value: 'review', label: 'Needs Review' }, { value: 'ready', label: 'Ready' }, { value: 'synced', label: 'Synced' },
      ], default: 'all' },
      { key: 'default_type_filter', label: 'Default type filter', type: 'select', layer: 'user', helper: 'Which row types show by default.', options: [
        { value: 'all', label: 'All' }, { value: 'revenue', label: 'Revenue' }, { value: 'payroll', label: 'Payroll' }, { value: 'expense', label: 'Expense' },
      ], default: 'all' },
    ],
  },
  'calendar': {
    page: 'calendar', title: 'Calendar',
    tips: ['Pick which view the calendar opens to.', 'Scheduling rules below apply tenant-wide — they control what clients and the booking form can actually do, not just this view.'],
    fields: [
      { key: 'default_view', label: 'Default view', type: 'select', layer: 'user', helper: 'Which calendar view opens by default.', options: [
        { value: 'month', label: 'Month' }, { value: 'timeline', label: 'Timeline' }, { value: 'kanban', label: 'Kanban' },
      ], default: 'month' },
      { key: 'booking_buffer_minutes', label: 'Booking buffer (minutes)', type: 'number', layer: 'tenant_column', min: 0, max: 240, step: 15, default: 60, helper: 'Minimum notice, in minutes, before a slot can be booked.' },
      { key: 'default_duration_hours', label: 'Default job duration (hours)', type: 'number', layer: 'tenant_column', min: 0.5, max: 12, step: 0.5, default: 2, helper: 'Prefilled duration for a new booking when the service has none set.' },
      { key: 'min_days_ahead', label: 'Minimum days ahead', type: 'number', layer: 'tenant_column', min: 0, max: 30, step: 1, default: 1, helper: 'Earliest a client can book relative to today.' },
      { key: 'allow_same_day', label: 'Allow same-day booking', type: 'toggle', layer: 'tenant_column', default: false, helper: 'Overrides minimum days ahead for today only.' },
      { key: 'open_365', label: 'Open 365 days/year', type: 'toggle', layer: 'tenant_selena', default: false, helper: 'When off, federal holidays block booking/availability.' },
      { key: 'smart_recurring_assign', label: 'Smart-assign recurring jobs', type: 'toggle', layer: 'tenant_selena', default: false, helper: 'Each generated recurring occurrence gets the best-available team member instead of hard-locking the schedule’s original assignee.' },
      { key: 'recurring_writes_paused', label: 'Pause automated recurring writes', type: 'toggle', layer: 'tenant_selena', default: false, helper: 'Kill switch: instantly blocks Yinez from pausing/resuming/cancelling recurring schedules and stops the auto-generation cron from creating or reassigning bookings. Existing schedules/bookings are untouched, and you can still act manually. Takes effect immediately.' },
    ],
  },
  'changelog': {
    page: 'changelog', title: 'Changelog',
    tips: ['Stay current with platform updates from FullLoop — nothing configurable here yet.'],
    fields: [],
  },
  'comhub': {
    page: 'comhub', title: 'ComHub',
    tips: ['Default inbox filter and channel.'],
    fields: [
      { key: 'default_filter', label: 'Default filter', type: 'select', layer: 'user', helper: 'Which threads show by default.', options: [
        { value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }, { value: 'unresponded', label: 'Unresponded' },
      ], default: 'all' },
      { key: 'default_channel', label: 'Default channel', type: 'select', layer: 'user', helper: 'Which channel the inbox opens filtered to.', options: [
        { value: 'all', label: 'All' }, { value: 'sms', label: 'SMS' }, { value: 'web', label: 'Web' }, { value: 'email', label: 'Email' }, { value: 'voice', label: 'Voice' }, { value: 'admin', label: 'Admin' },
      ], default: 'all' },
    ],
  },
  'connect': {
    page: 'connect', title: 'Loop Connect',
    tips: ['Team chat, announcements, and the team directory.'],
    fields: [
      { key: 'default_tab', label: 'Default tab', type: 'select', layer: 'user', helper: 'Which tab Loop Connect opens to.', options: [
        { value: 'chat', label: 'Chat' }, { value: 'announcements', label: 'Announcements' }, { value: 'directory', label: 'Directory' },
      ], default: 'chat' },
    ],
  },
  'docs': {
    page: 'docs', title: 'Docs',
    tips: ['Static reference content — nothing configurable here yet.'],
    fields: [],
  },
  'feedback': {
    page: 'feedback', title: 'Feedback',
    tips: ['Which feedback items show by default.'],
    fields: [
      { key: 'default_filter', label: 'Default filter', type: 'select', layer: 'user', helper: 'Which feedback items the list opens showing.', options: [
        { value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' },
      ], default: 'all' },
    ],
  },
  'find-cleaner': {
    page: 'find-cleaner', title: 'Find a Team Member',
    tips: ['Broadcasts a job to available team members — nothing configurable here yet.'],
    fields: [],
  },
  'go-live': {
    page: 'go-live', title: 'Go Live',
    tips: ['Tenant go-live checklist — nothing configurable here yet.'],
    fields: [],
  },
  'google': {
    page: 'google', title: 'Google Profile',
    tips: ['Which tab the Google Profile page opens to.', 'Place ID and review link power review pulls and the review-request comm.'],
    fields: [
      { key: 'default_tab', label: 'Default tab', type: 'select', layer: 'user', helper: 'Reviews or Posts — which tab opens by default.', options: [
        { value: 'reviews', label: 'Reviews' }, { value: 'posts', label: 'Posts' },
      ], default: 'reviews' },
      { key: 'google_place_id', label: 'Google Place ID', type: 'text', layer: 'tenant_column', default: '', helper: 'Your business’s Google Place ID — used to pull reviews and posts.' },
      { key: 'google_review_link', label: 'Review link', type: 'text', layer: 'tenant_selena', default: '', helper: 'Direct link clients use to leave a Google review — sent in review-request messages.' },
    ],
  },
  'hr': {
    page: 'hr', title: 'HR',
    tips: ['Team guidelines appear wherever team members are pointed to policy — onboarding, the team portal, etc.'],
    fields: [
      { key: 'guidelines_en', label: 'Team guidelines', type: 'textarea', layer: 'tenant_column', default: '', helper: 'Your team handbook / policy text — shown to team members in the portal.' },
    ],
  },
  'jobs': {
    page: 'jobs', title: 'Production',
    tips: ['Production totals overview — nothing configurable here yet.'],
    fields: [],
  },
  'leads': {
    page: 'leads', title: 'Leads',
    tips: ['This route redirects to Sales — manage its settings from the Sales page.'],
    fields: [],
  },
  'map': {
    page: 'map', title: 'Map',
    tips: ['Default filters for the job map.'],
    fields: [
      { key: 'default_status_filter', label: 'Default status filter', type: 'select', layer: 'user', helper: 'Which job status the map opens filtered to.', options: [
        { value: '', label: 'All' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'paid', label: 'Paid' }, { value: 'cancelled', label: 'Canceled' },
      ], default: '' },
      { key: 'default_date_range', label: 'Default date range', type: 'select', layer: 'user', helper: 'Which date range the map opens to.', options: [
        { value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'all', label: 'All Time' },
      ], default: 'all' },
      { key: 'show_stats', label: 'Show stats panel', type: 'toggle', layer: 'user', helper: 'Show the stats sidebar alongside the map (mobile only — always on for desktop).', default: true },
    ],
  },
  'messages': {
    page: 'messages', title: 'Messages',
    tips: ['Platform ↔ tenant owner messaging — nothing configurable here yet.'],
    fields: [],
  },
  'onboarding': {
    page: 'onboarding', title: 'Onboarding',
    tips: ['Tenant onboarding checklist — nothing configurable here yet.'],
    fields: [],
  },
  'sales': {
    page: 'sales', title: 'Sales',
    tips: ['Which step of the pipeline the Sales page opens to.', 'Quote defaults below prefill every new proposal in Quotes.'],
    fields: [
      { key: 'default_tab', label: 'Default tab', type: 'select', layer: 'user', helper: 'Which step of the pipeline opens by default (a ?tab= link always overrides this).', options: [
        { value: 'pipeline', label: 'Pipeline' }, { value: 'leads', label: 'Leads' }, { value: 'qualify', label: 'Qualify' }, { value: 'quotes', label: 'Quotes' }, { value: 'sales', label: 'Sales' }, { value: 'schedule', label: 'Schedule' },
      ], default: 'pipeline' },
      { key: 'proposal_valid_days', label: 'Quote valid for (days)', type: 'number', layer: 'tenant_selena', min: 1, max: 180, step: 1, default: 30, helper: 'How long a new quote stays valid before it expires.' },
      { key: 'proposal_deposit_type', label: 'Deposit type', type: 'select', layer: 'tenant_selena', helper: 'Whether new quotes default to requiring a deposit.', options: [
        { value: 'none', label: 'None' }, { value: 'percent', label: 'Percent of total' }, { value: 'flat', label: 'Flat amount' },
      ], default: 'none' },
      { key: 'proposal_deposit_value', label: 'Deposit value', type: 'number', layer: 'tenant_selena', min: 0, step: 1, default: 0, helper: 'Percent (0-100) or flat dollar amount, depending on deposit type.' },
      { key: 'currency_symbol', label: 'Currency symbol', type: 'text', layer: 'tenant_selena', default: '$', helper: 'Shown on every quote and proposal total.' },
      { key: 'proposal_terms', label: 'Default quote terms', type: 'textarea', layer: 'tenant_selena', default: '', helper: 'Prefilled terms & conditions text on every new quote — leave blank for none.' },
    ],
  },
  'sales-partners': {
    page: 'sales-partners', title: 'Sales Partners',
    tips: ['Which tab Sales Partners opens to.'],
    fields: [
      { key: 'default_tab', label: 'Default tab', type: 'select', layer: 'user', helper: 'Which tab Sales Partners opens to.', options: [
        { value: 'partners', label: 'Partners' }, { value: 'payouts', label: 'Payouts' },
      ], default: 'partners' },
    ],
  },
  'schedules': {
    page: 'schedules', title: 'Recurring Schedules',
    tips: ['Default recurrence cadence and status filter.'],
    fields: [
      { key: 'default_recurring_frequency', label: 'Default frequency', type: 'select', layer: 'user', helper: 'Preselected cadence when creating a new recurring schedule.', options: [
        { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every 2 weeks' }, { value: 'triweekly', label: 'Every 3 weeks' }, { value: 'monthly_date', label: 'Monthly (date)' }, { value: 'monthly_weekday', label: 'Monthly (weekday)' },
      ], default: 'weekly' },
      { key: 'default_status_filter', label: 'Default status filter', type: 'select', layer: 'user', helper: 'Which schedules show by default.', options: [
        { value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'inactive', label: 'Inactive' },
      ], default: '' },
    ],
  },
  'selena': {
    page: 'selena', title: 'AI Assistant',
    tips: ['This page already has its own Settings button (top right of the page) for voice/SMS/web config — nothing additional here yet.'],
    fields: [],
  },
  'settings': {
    page: 'settings', title: 'Settings',
    tips: ['Tenant-wide settings. Page-specific settings live on each page.'],
    fields: [],
  },
  'social': {
    page: 'social', title: 'Social Media',
    tips: ['Which connected platform the composer opens to.', 'Auto-post settings control whether completed jobs post to your connected accounts automatically.'],
    fields: [
      { key: 'default_platform', label: 'Default platform', type: 'select', layer: 'user', helper: 'Which platform the post composer opens to.', options: [
        { value: 'facebook', label: 'Facebook' }, { value: 'instagram', label: 'Instagram' },
      ], default: 'facebook' },
      { key: 'social_autopost_enabled', label: 'Auto-post on job completion', type: 'toggle', layer: 'tenant_selena', default: false, helper: 'When a crew member checks out of a job with an "after" photo, automatically post it to your connected Facebook/Instagram accounts. No client name or address is ever included.' },
      { key: 'social_autopost_caption_template', label: 'Auto-post caption', type: 'textarea', layer: 'tenant_selena', default: 'Another job done! ✨ {service_type}', helper: 'Use {service_type} to insert the job\'s service type. Kept generic on purpose — never include client details.' },
    ],
  },
  'users': {
    page: 'users', title: 'Users',
    tips: ['Default role for new invites.'],
    fields: [
      { key: 'default_invite_role', label: 'Default invite role', type: 'select', layer: 'tenant_selena', helper: 'Preselected role on the invite form, and the fallback used platform-wide when no role is specified.', options: [
        { value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' }, { value: 'staff', label: 'Staff' },
      ], default: 'manager' },
      { key: 'require_2fa_for_new_users', label: 'Require 2FA for new users', type: 'toggle', layer: 'tenant_selena', default: false, helper: 'New invites must set up two-factor authentication before their first login.' },
    ],
  },
  'websites': {
    page: 'websites', title: 'Websites',
    tips: ['Default period for site visit stats.'],
    fields: [
      { key: 'default_period', label: 'Default period', type: 'select', layer: 'user', helper: 'Which time period the visits chart opens to.', options: [
        { value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' },
      ], default: 'week' },
    ],
  },
}

function FieldEditor({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'
  const v = value === undefined ? field.default : value

  if (field.type === 'toggle') {
    const on = !!v
    return (
      <label className="flex items-start justify-between gap-4 cursor-pointer">
        <span className="flex-1">
          <span className="block text-sm font-medium text-white">{field.label}</span>
          {field.helper && <span className="block text-xs text-white/60 mt-0.5">{field.helper}</span>}
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

  if (field.type === 'select') {
    return (
      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">{field.label}</span>
        <select value={(v as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {field.helper && <span className="block text-xs text-white/60 mt-1">{field.helper}</span>}
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">{field.label}</span>
        <textarea
          rows={3}
          value={(v as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputCls}
        />
        {field.helper && <span className="block text-xs text-white/60 mt-1">{field.helper}</span>}
      </label>
    )
  }

  if (field.type === 'number') {
    return (
      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">{field.label}</span>
        <input
          type="number"
          value={v === null || v === undefined ? '' : String(v)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          className={inputCls}
        />
        {field.helper && <span className="block text-xs text-white/60 mt-1">{field.helper}</span>}
      </label>
    )
  }

  // text
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">{field.label}</span>
      <input
        type="text"
        value={(v as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputCls}
      />
      {field.helper && <span className="block text-xs text-white/60 mt-1">{field.helper}</span>}
    </label>
  )
}

function buildUserDefaults(fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if ((f.layer || 'user') === 'user') {
      out[f.key] = f.default
    }
  }
  return out
}

function AutoPanel({ entry }: { entry: PageEntry }) {
  const fields = entry.fields || []
  const tenantSettings = useTenantSettings()
  const userPrefs = useUserPrefs<Record<string, unknown>>(entry.page, buildUserDefaults(fields))
  const { open, setOpen } = usePageSettingsOpen()

  const tenant = tenantSettings.tenant
  const selena = (tenant?.selena_config as Record<string, unknown> | null) || {}

  // Merge config view: per-field, pull from the right layer.
  const config: Record<string, unknown> = {}
  for (const f of fields) {
    const layer = f.layer || 'user'
    if (layer === 'user') {
      config[f.key] = userPrefs.prefs[f.key] ?? f.default
    } else if (layer === 'tenant_column') {
      config[f.key] = tenant?.[f.key] ?? f.default
    } else {
      // tenant_selena
      config[f.key] = selena[f.key] ?? f.default
    }
  }

  function updateConfig(key: string, value: unknown) {
    const f = fields.find((x) => x.key === key)
    const layer = f?.layer || 'user'
    if (layer === 'user') {
      userPrefs.updatePref(key, value)
    } else if (layer === 'tenant_column') {
      tenantSettings.updateField(key, value)
    } else {
      tenantSettings.updateSelenaConfig({ [key]: value })
    }
  }

  const loaded = userPrefs.loaded && tenantSettings.loaded
  const saving = userPrefs.saving || tenantSettings.saving
  const saveMsg = tenantSettings.saveMsg || userPrefs.saveMsg
  const columns = columnsForFieldCount(fields.length)

  return (
    <PageSettingsPanel
      open={open}
      setOpen={setOpen}
      loaded={loaded}
      saving={saving}
      saveMsg={saveMsg}
      config={config}
      updateConfig={updateConfig}
      title={entry.title}
      tips={entry.tips}
      columns={columns}
    >
      {fields.length > 0
        ? renderFields(fields, columns)
        : undefined}
    </PageSettingsPanel>
  )
}

// 1 column while a page has a handful of settings, growing to 2 then 3 as
// more get added — the drawer widens to match (see DRAWER_WIDTH_BY_COLUMNS
// in page-settings.tsx).
function columnsForFieldCount(count: number): 1 | 2 | 3 {
  if (count <= 3) return 1
  if (count <= 6) return 2
  return 3
}

function renderFields(fields: FieldDef[], columns: 1 | 2 | 3): (props: { config: Record<string, unknown>; updateConfig: (key: string, value: unknown) => void; saving: boolean }) => ReactNode {
  return ({ config, updateConfig }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1.25rem 1.5rem' }}>
      {fields.map((f, i) => (
        <FieldRow key={f.key} field={f} index={i} value={config[f.key]} onChange={(v) => updateConfig(f.key, v)} />
      ))}
    </div>
  )
}

// A SettingsHint out on a page's own content can target one specific field
// by key — this row scrolls itself into view and highlights when it's the
// current target, so "click the hint" lands you right on the setting.
function FieldRow({ field, index, value, onChange }: { field: FieldDef; index: number; value: unknown; onChange: (v: unknown) => void }) {
  const { targetKey } = usePageSettingsOpen()
  const ref = useRef<HTMLDivElement>(null)
  const isTarget = targetKey === field.key

  useEffect(() => {
    if (isTarget && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isTarget])

  return (
    <div
      ref={ref}
      className="flex items-start gap-2.5 transition-shadow"
      style={{
        ...(field.type === 'textarea' ? { gridColumn: `1 / -1` } : {}),
        ...(isTarget ? { boxShadow: '0 0 0 2px #FFD60A', borderRadius: 8, padding: 8, margin: -8 } : {}),
      }}
    >
      <span
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 18, height: 18, marginTop: 2, fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 700, color: '#1C1C1C', background: '#FFD60A' }}
      >
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <FieldEditor field={field} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

export default function AutoPageSettings() {
  const pathname = usePathname() || '/dashboard'
  const segment = pathname.replace(/^\/dashboard\/?/, '').split('/')[0] || ''
  if (PAGES_WITH_CUSTOM_PANEL.has(segment)) return null
  const entry = PAGE_MAP[segment]
  if (!entry) return null
  return <AutoPanel entry={entry} />
}
