'use client'

import { useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'
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

// Pages that render their own custom settings panel — we skip the auto-gear
// for these so two gears don't show.
const PAGES_WITH_CUSTOM_PANEL = new Set([
  'bookings', 'campaigns', 'clients', 'finance', 'leads', 'referrals',
  'reviews', 'sms', 'team', 'notifications', 'selena', 'websites',
])

const PAGE_MAP: Record<string, PageEntry> = {
  '': {
    page: 'overview', title: 'Overview',
    tips: ['This is your tenant home.'],
    fields: [
      { key: 'show_setup_checklist', label: 'Show setup checklist', type: 'toggle', layer: 'user', helper: 'Hide once your tenant is fully configured.', default: true },
    ],
  },
  'activity': {
    page: 'activity', title: 'Activity',
    tips: ['Recent client and team actions.'],
    fields: [
      { key: 'page_size', label: 'Items per page', type: 'number', layer: 'user', min: 10, max: 200, step: 10, default: 50 },
      { key: 'channels_filter', label: 'Default channel filter', type: 'select', layer: 'user', options: [
        { value: 'all', label: 'All' }, { value: 'sms', label: 'SMS only' }, { value: 'email', label: 'Email only' }, { value: 'in_app', label: 'In-app only' },
      ], default: 'all' },
    ],
  },
  'ai': {
    page: 'ai', title: 'AI Assistant',
    tips: ['Configure the in-app AI assistant for your team.'],
    fields: [
      { key: 'ai_enabled', label: 'AI assistant enabled', type: 'toggle', layer: 'tenant_selena', default: true },
      { key: 'verbose_replies', label: 'Verbose replies', type: 'toggle', layer: 'user', helper: 'Longer, more explanatory answers.', default: false },
    ],
  },
  'analytics': {
    page: 'analytics', title: 'Analytics',
    tips: ['Default date ranges and chart preferences live here.'],
    fields: [
      { key: 'default_range', label: 'Default range', type: 'select', layer: 'user', options: [
        { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }, { value: 'ytd', label: 'Year-to-date' }, { value: '12m', label: 'Last 12 months' },
      ], default: '30d' },
      { key: 'default_view', label: 'Default view', type: 'select', layer: 'user', options: [
        { value: 'overview', label: 'Overview' }, { value: 'revenue', label: 'Revenue' }, { value: 'pipeline', label: 'Pipeline' },
      ], default: 'overview' },
    ],
  },
  'calendar': {
    page: 'calendar', title: 'Calendar',
    tips: ['Pick your default view, week start, and timezone.'],
    fields: [
      { key: 'default_view', label: 'Default view', type: 'select', layer: 'user', options: [
        { value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' }, { value: 'list', label: 'List' },
      ], default: 'week' },
      { key: 'first_day', label: 'Week starts on', type: 'select', layer: 'user', options: [
        { value: '0', label: 'Sunday' }, { value: '1', label: 'Monday' },
      ], default: '0' },
      { key: 'show_weekends', label: 'Show weekends', type: 'toggle', layer: 'user', default: true },
    ],
  },
  'changelog': {
    page: 'changelog', title: 'Changelog',
    tips: ['Stay current with platform updates from FullLoop.'],
    fields: [
      { key: 'notify_on_new', label: 'Email me on new entries', type: 'toggle', layer: 'user', default: false },
    ],
  },
  'connect': {
    page: 'connect', title: 'Connect',
    tips: ['Manage third-party integrations.'],
    fields: [
      { key: 'show_unconnected', label: 'Show available (unconnected) integrations', type: 'toggle', layer: 'user', default: true },
    ],
  },
  'docs': {
    page: 'docs', title: 'Docs',
    tips: ['Pin frequently used docs.'],
    fields: [
      { key: 'language', label: 'Default language', type: 'select', layer: 'user', options: [
        { value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' },
      ], default: 'en' },
    ],
  },
  'feedback': {
    page: 'feedback', title: 'Feedback',
    tips: ['Configure auto-reply text, escalation thresholds.'],
    fields: [
      { key: 'feedback_auto_respond', label: 'Auto-respond on new feedback', type: 'toggle', layer: 'tenant_selena', default: false },
      { key: 'feedback_auto_response_text', label: 'Auto-response text', type: 'textarea', layer: 'tenant_selena', placeholder: 'Thanks for your feedback — we received it and will follow up shortly.' },
      { key: 'feedback_escalate_below', label: 'Escalate when rating ≤', type: 'number', layer: 'tenant_selena', min: 1, max: 5, default: 3, helper: 'Sends an admin alert for ratings at or below this score.' },
    ],
  },
  'google': {
    page: 'google', title: 'Google Profile',
    tips: ['Sync interval and default review reply.'],
    fields: [
      { key: 'auto_reply_reviews', label: 'Auto-reply to new reviews', type: 'toggle', layer: 'tenant_selena', default: false },
      { key: 'review_sync_interval_hours', label: 'Sync interval (hours)', type: 'number', layer: 'tenant_selena', min: 1, max: 168, default: 24 },
    ],
  },
  'map': {
    page: 'map', title: 'Map',
    tips: ['Default zoom and clustering.'],
    fields: [
      { key: 'default_zoom', label: 'Default zoom', type: 'number', layer: 'user', min: 1, max: 20, default: 11 },
      { key: 'cluster_markers', label: 'Cluster markers', type: 'toggle', layer: 'user', default: true },
    ],
  },
  'sales': {
    page: 'sales', title: 'Sales',
    tips: ['Default funnel stage filter and pipeline view.'],
    fields: [
      { key: 'default_stage_filter', label: 'Default stage filter', type: 'select', layer: 'user', options: [
        { value: 'all', label: 'All stages' }, { value: 'open', label: 'Open' }, { value: 'qualified', label: 'Qualified' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' },
      ], default: 'open' },
      { key: 'view_mode', label: 'View mode', type: 'select', layer: 'user', options: [
        { value: 'kanban', label: 'Kanban' }, { value: 'list', label: 'List' },
      ], default: 'kanban' },
    ],
  },
  'schedules': {
    page: 'schedules', title: 'Recurring Schedules',
    tips: ['Default recurrence cadence and visibility.'],
    fields: [
      { key: 'default_recurring_frequency', label: 'Default frequency', type: 'select', layer: 'tenant_selena', options: [
        { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Every 2 weeks' }, { value: 'triweekly', label: 'Every 3 weeks' }, { value: 'monthly_date', label: 'Monthly (date)' }, { value: 'monthly_weekday', label: 'Monthly (weekday)' },
      ], default: 'biweekly' },
      { key: 'show_paused', label: 'Show paused schedules by default', type: 'toggle', layer: 'user', default: false },
    ],
  },
  'settings': {
    page: 'settings', title: 'Settings',
    tips: ['Tenant-wide settings. Page-specific settings live on each page.'],
    fields: [],
  },
  'social': {
    page: 'social', title: 'Social Media',
    tips: ['Connected accounts and posting cadence.'],
    fields: [
      { key: 'auto_post_5_star_reviews', label: 'Auto-share new 5-star reviews', type: 'toggle', layer: 'tenant_selena', default: false },
      { key: 'default_posting_time', label: 'Default posting time (24h)', type: 'text', layer: 'tenant_selena', placeholder: '09:00', default: '10:00' },
    ],
  },
  'users': {
    page: 'users', title: 'Users',
    tips: ['Default role for new invites.'],
    fields: [
      { key: 'default_invite_role', label: 'Default invite role', type: 'select', layer: 'tenant_selena', options: [
        { value: 'owner', label: 'Owner' }, { value: 'manager', label: 'Manager' }, { value: 'staff', label: 'Staff' }, { value: 'viewer', label: 'Viewer' },
      ], default: 'staff' },
      { key: 'require_2fa_for_new_users', label: 'Require 2FA for new users', type: 'toggle', layer: 'tenant_selena', default: false, helper: 'Recommended for any role above viewer.' },
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
          <span className="block text-sm font-medium text-gray-200">{field.label}</span>
          {field.helper && <span className="block text-xs text-gray-500 mt-0.5">{field.helper}</span>}
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
        <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">{field.label}</span>
        <select value={(v as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {field.helper && <span className="block text-xs text-gray-500 mt-1">{field.helper}</span>}
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">{field.label}</span>
        <textarea
          rows={3}
          value={(v as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputCls}
        />
        {field.helper && <span className="block text-xs text-gray-500 mt-1">{field.helper}</span>}
      </label>
    )
  }

  if (field.type === 'number') {
    return (
      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">{field.label}</span>
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
        {field.helper && <span className="block text-xs text-gray-500 mt-1">{field.helper}</span>}
      </label>
    )
  }

  // text
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">{field.label}</span>
      <input
        type="text"
        value={(v as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputCls}
      />
      {field.helper && <span className="block text-xs text-gray-500 mt-1">{field.helper}</span>}
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
  const [open, setOpen] = useState(false)

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

  return (
    <>
      <PageSettingsGear open={open} setOpen={setOpen} title={entry.title} />
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
      >
        {fields.length > 0
          ? renderFields(fields)
          : undefined}
      </PageSettingsPanel>
    </>
  )
}

function renderFields(fields: FieldDef[]): (props: { config: Record<string, unknown>; updateConfig: (key: string, value: unknown) => void; saving: boolean }) => ReactNode {
  return ({ config, updateConfig }) => (
    <div className="space-y-4">
      {fields.map((f) => (
        <FieldEditor key={f.key} field={f} value={config[f.key]} onChange={(v) => updateConfig(f.key, v)} />
      ))}
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
