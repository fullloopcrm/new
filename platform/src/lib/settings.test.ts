import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * settings.ts (`getSettings(tenantId)`) is the per-tenant config resolver
 * consumed by 40+ call sites: booking rules, funnel routing, notification
 * defaults, pricing display, team defaults, proposal prefill, review
 * follow-up timing. It merges a `tenants` row + `selena_config` jsonb +
 * `service_types` rows into one typed object, with a 60s in-memory cache.
 *
 * Previously uncovered. supabaseAdmin is mocked with canned per-table
 * responses (not a recorder) since the surface under test is the merge/
 * fallback/derivation logic, not query shape.
 */

const tenantsResponse = vi.hoisted(() => ({ value: { data: null as Record<string, unknown> | null } }))
const serviceTypesResponse = vi.hoisted(() => ({ value: { data: null as unknown[] | null } }))

vi.mock('@/lib/supabase', () => {
  // Both query chains terminate in a method that itself returns the promise
  // (.single() for tenants, .order() for service_types) — no need to make the
  // intermediate builder itself thenable.
  function builder() {
    const b: Record<string, (...a: unknown[]) => unknown> = {}
    b.select = () => b
    b.eq = () => b
    b.order = () => Promise.resolve(serviceTypesResponse.value)
    b.single = () => Promise.resolve(tenantsResponse.value)
    return b
  }
  return {
    supabaseAdmin: {
      from: () => builder(),
    },
  }
})

import { getSettings, clearSettingsCache } from './settings'

function baseTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tenant-1',
    name: 'Acme Cleaning',
    phone: '5551234',
    email: 'owner@acme.test',
    website_url: 'https://acme.test',
    owner_email: 'owner@acme.test',
    selena_config: {},
    notification_preferences: null,
    ...overrides,
  }
}

beforeEach(() => {
  clearSettingsCache()
  tenantsResponse.value = { data: baseTenant() }
  serviceTypesResponse.value = { data: [] }
})

describe('getSettings', () => {
  it('maps core business fields from the tenants row', async () => {
    const settings = await getSettings('tenant-1')
    expect(settings.business_name).toBe('Acme Cleaning')
    expect(settings.business_phone).toBe('5551234')
    expect(settings.business_email).toBe('owner@acme.test')
    expect(settings.tenant_id).toBe('tenant-1')
  })

  it('falls back email_from_address to email_from, then email', async () => {
    tenantsResponse.value = {
      data: baseTenant({ email_from: 'from@acme.test', email: 'owner@acme.test' }),
    }
    expect((await getSettings('tenant-1')).email_from_address).toBe('from@acme.test')

    clearSettingsCache()
    tenantsResponse.value = { data: baseTenant({ email_from: null }) }
    expect((await getSettings('tenant-1')).email_from_address).toBe('owner@acme.test')
  })

  it('falls back lead_notification_email to owner_email when unset', async () => {
    tenantsResponse.value = {
      data: baseTenant({ lead_notification_email: null, owner_email: 'owner@acme.test' }),
    }
    expect((await getSettings('tenant-1')).lead_notification_email).toBe('owner@acme.test')
  })

  it('handles a null tenant row without throwing (all string fields empty)', async () => {
    tenantsResponse.value = { data: null }
    const settings = await getSettings('missing-tenant')
    expect(settings.business_name).toBe('')
    expect(settings.tenant_id).toBe('missing-tenant')
    expect(settings.payment_methods).toEqual(['zelle', 'stripe'])
  })
})

describe('getSettings — business hours parsing', () => {
  it.each([
    ['09:00', 9],
    ['9', 9],
    ['09', 9],
    ['17:30', 17],
    [null, 9],
    [undefined, 9],
    ['not-a-time', 9],
  ])('parses business_hours_start %s -> %i', async (input, expected) => {
    tenantsResponse.value = { data: baseTenant({ business_hours_start: input }) }
    expect((await getSettings('tenant-1')).business_hours_start).toBe(expected)
  })
})

describe('getSettings — service types + standard_rate derivation', () => {
  it('maps service_types with default_hours fallback and active flag', async () => {
    serviceTypesResponse.value = {
      data: [
        { name: 'Standard Clean', default_duration_hours: 3, default_hourly_rate: 50, active: true },
        { name: 'Deep Clean', default_duration_hours: null, default_hourly_rate: 80, active: true },
        { name: 'Retired Service', default_duration_hours: 2, default_hourly_rate: 40, active: false },
      ],
    }
    const settings = await getSettings('tenant-1')
    expect(settings.service_types).toEqual([
      { name: 'Standard Clean', default_hours: 3, active: true },
      { name: 'Deep Clean', default_hours: 2, active: true }, // null -> fallback 2
      { name: 'Retired Service', default_hours: 2, active: false },
    ])
  })

  it('averages standard_rate across active services only, rounded', async () => {
    serviceTypesResponse.value = {
      data: [
        { name: 'A', default_duration_hours: 2, default_hourly_rate: 50, active: true },
        { name: 'B', default_duration_hours: 2, default_hourly_rate: 65, active: true },
        { name: 'Inactive', default_duration_hours: 2, default_hourly_rate: 1000, active: false },
      ],
    }
    // (50 + 65) / 2 = 57.5 -> rounds to 58, inactive excluded entirely
    expect((await getSettings('tenant-1')).standard_rate).toBe(58)
  })

  it('defaults standard_rate to 0 when there are no active-rated services', async () => {
    serviceTypesResponse.value = { data: [] }
    expect((await getSettings('tenant-1')).standard_rate).toBe(0)
  })

  it('excludes services with a null hourly rate from the average', async () => {
    serviceTypesResponse.value = {
      data: [
        { name: 'A', default_duration_hours: 2, default_hourly_rate: null, active: true },
        { name: 'B', default_duration_hours: 2, default_hourly_rate: 100, active: true },
      ],
    }
    expect((await getSettings('tenant-1')).standard_rate).toBe(100)
  })
})

describe('getSettings — selena_config derived fields', () => {
  it('defaults funnel_mode to booking for unknown/missing values', async () => {
    tenantsResponse.value = { data: baseTenant({ selena_config: {} }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('booking')

    clearSettingsCache()
    tenantsResponse.value = { data: baseTenant({ selena_config: { funnel_mode: 'not-real' } }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('booking')
  })

  it('respects explicit pipeline and lead_only funnel_mode', async () => {
    tenantsResponse.value = { data: baseTenant({ selena_config: { funnel_mode: 'pipeline' } }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('pipeline')

    clearSettingsCache()
    tenantsResponse.value = { data: baseTenant({ selena_config: { funnel_mode: 'lead_only' } }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('lead_only')
  })

  it('validates proposal_deposit_type, defaulting invalid values to none', async () => {
    tenantsResponse.value = {
      data: baseTenant({ selena_config: { proposal_deposit_type: 'percent' } }),
    }
    expect((await getSettings('tenant-1')).proposal_deposit_type).toBe('percent')

    clearSettingsCache()
    tenantsResponse.value = {
      data: baseTenant({ selena_config: { proposal_deposit_type: 'bogus' } }),
    }
    expect((await getSettings('tenant-1')).proposal_deposit_type).toBe('none')
  })

  it('defaults array-shaped config fields when selena_config value is not an array', async () => {
    tenantsResponse.value = {
      data: baseTenant({
        selena_config: {
          default_working_days: 'not-an-array',
          team_roles: null,
          team_pay_rates: {},
        },
      }),
    }
    const settings = await getSettings('tenant-1')
    expect(settings.default_working_days).toEqual([1, 2, 3, 4, 5])
    expect(settings.team_roles).toEqual(['worker', 'lead', 'manager'])
    expect(settings.team_pay_rates).toEqual([])
  })

  it('passes through valid array-shaped config fields untouched', async () => {
    tenantsResponse.value = {
      data: baseTenant({
        selena_config: {
          default_working_days: [0, 6],
          team_roles: ['owner'],
          team_pay_rates: [{ label: 'lead', amount: 25 }],
        },
      }),
    }
    const settings = await getSettings('tenant-1')
    expect(settings.default_working_days).toEqual([0, 6])
    expect(settings.team_roles).toEqual(['owner'])
    expect(settings.team_pay_rates).toEqual([{ label: 'lead', amount: 25 }])
  })

  it('campaign_auto_unsubscribe defaults true, only explicit false turns it off', async () => {
    tenantsResponse.value = { data: baseTenant({ selena_config: {} }) }
    expect((await getSettings('tenant-1')).campaign_auto_unsubscribe).toBe(true)

    clearSettingsCache()
    tenantsResponse.value = {
      data: baseTenant({ selena_config: { campaign_auto_unsubscribe: false } }),
    }
    expect((await getSettings('tenant-1')).campaign_auto_unsubscribe).toBe(false)
  })

  it('derives reschedule_notice_hours from reschedule_notice_days * 24', async () => {
    tenantsResponse.value = { data: baseTenant({ reschedule_notice_days: 3 }) }
    expect((await getSettings('tenant-1')).reschedule_notice_hours).toBe(72)
  })
})

/**
 * F1 — getSettings().funnel_mode. When a tenant's selena_config carries no
 * explicit funnel_mode (every tenant provisioned before funnel_mode was seeded),
 * the resolved funnel must come from the TRADE ARCHETYPE: project/lead verticals
 * quote-first ('pipeline'), everything else books. An explicit selena_config
 * choice always wins.
 */
describe('getSettings funnel_mode — archetype default (F1)', () => {
  it('project vertical with empty selena_config resolves to pipeline (quote-first)', async () => {
    tenantsResponse.value = { data: baseTenant({ industry: 'roofing', selena_config: {} }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('pipeline')
  })

  it('booking trade with empty selena_config stays on booking', async () => {
    tenantsResponse.value = { data: baseTenant({ industry: 'cleaning', selena_config: {} }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('booking')
  })

  it('explicit selena_config.funnel_mode overrides the archetype default', async () => {
    // Owner deliberately set a roofing tenant to direct booking — honor it.
    tenantsResponse.value = { data: baseTenant({ industry: 'roofing', selena_config: { funnel_mode: 'booking' } }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('booking')
  })

  it('explicit lead_only is preserved', async () => {
    tenantsResponse.value = { data: baseTenant({ industry: 'roofing', selena_config: { funnel_mode: 'lead_only' } }) }
    expect((await getSettings('tenant-1')).funnel_mode).toBe('lead_only')
  })
})

describe('getSettings — notification_preferences integration (normalizePrefs)', () => {
  it('derives reminder timing + booking_reminder/daily_summary flags from real defaults', async () => {
    tenantsResponse.value = { data: baseTenant({ notification_preferences: null }) }
    const settings = await getSettings('tenant-1')
    expect(settings.reminder_days).toEqual([3, 1])
    expect(settings.reminder_hours_before).toEqual([2])
    expect(settings.client_reminder_email).toBe(true)
    expect(settings.client_reminder_sms).toBe(true)
    // owner_daily_summary defaults email:true, in_app:false -> daily_summary_enabled true
    expect(settings.daily_summary_enabled).toBe(true)
  })

  it('reflects an explicitly disabled booking_reminder channel', async () => {
    tenantsResponse.value = {
      data: baseTenant({
        notification_preferences: {
          comms: { booking_reminder: { email: false, sms: false } },
        },
      }),
    }
    const settings = await getSettings('tenant-1')
    expect(settings.client_reminder_email).toBe(false)
    expect(settings.client_reminder_sms).toBe(false)
  })
})

describe('getSettings — caching', () => {
  it('serves a second call within the TTL from cache without re-querying', async () => {
    tenantsResponse.value = { data: baseTenant({ name: 'First' }) }
    const first = await getSettings('tenant-1')
    expect(first.business_name).toBe('First')

    // Mutate the mock response; a cached call should NOT see this change.
    tenantsResponse.value = { data: baseTenant({ name: 'Second' }) }
    const second = await getSettings('tenant-1')
    expect(second.business_name).toBe('First')
  })

  it('clearSettingsCache(tenantId) forces a fresh fetch for that tenant only', async () => {
    tenantsResponse.value = { data: baseTenant({ name: 'First' }) }
    await getSettings('tenant-1')

    tenantsResponse.value = { data: baseTenant({ name: 'Second' }) }
    clearSettingsCache('tenant-1')
    const refreshed = await getSettings('tenant-1')
    expect(refreshed.business_name).toBe('Second')
  })

  it('caches per-tenant independently', async () => {
    tenantsResponse.value = { data: baseTenant({ name: 'Tenant A', id: 'tenant-a' }) }
    const a = await getSettings('tenant-a')
    expect(a.business_name).toBe('Tenant A')

    tenantsResponse.value = { data: baseTenant({ name: 'Tenant B', id: 'tenant-b' }) }
    const b = await getSettings('tenant-b')
    expect(b.business_name).toBe('Tenant B')

    // tenant-a still cached with its own value, unaffected by tenant-b's fetch
    tenantsResponse.value = { data: baseTenant({ name: 'Should Not Apply' }) }
    const aAgain = await getSettings('tenant-a')
    expect(aAgain.business_name).toBe('Tenant A')
  })

  it('clearSettingsCache() with no args clears every tenant', async () => {
    tenantsResponse.value = { data: baseTenant({ name: 'First' }) }
    await getSettings('tenant-1')

    tenantsResponse.value = { data: baseTenant({ name: 'Second' }) }
    clearSettingsCache()
    const refreshed = await getSettings('tenant-1')
    expect(refreshed.business_name).toBe('Second')
  })
})
