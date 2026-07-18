/**
 * GET /api/cron/tenant-health — "Fortress" alert had ZERO dedup at all (not
 * even a racy check-then-act one): alertOwner() fired on every 15-min tick
 * for as long as any tenant kept failing its health check, re-alerting the
 * owner every 15 min for the duration of a single ongoing outage.
 *
 * Fix: two-step atomic claim on tenant_health_alerts(fingerprint) — fresh
 * insert first, then (on a 23505 conflict) an UPDATE ... WHERE alerted_at is
 * stale reclaims the row, same idiom as cron/health-monitor's
 * cron_health_alerts. The failing-slug set is stable (the same tenant can
 * go down, recover, and go down again days later), so the reclaim path (not
 * just the initial-alert fix) needs its own coverage, see
 * 2026_07_18_tenant_health_alerts_dedup.sql.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'
import type { TenantHealth } from '@/lib/tenant-health'

const h = vi.hoisted(() => ({
  fake: null as FakeSupabase | null,
  alertOwner: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/telegram', () => ({
  alertOwner: (...args: unknown[]) => h.alertOwner(...args),
}))

vi.mock('@/lib/tenant-health', () => ({
  checkTenant: vi.fn(async (slug: string, domain: string): Promise<TenantHealth> => ({
    slug,
    domain,
    status: 'fail',
    matchedPath: null,
    checks: { reachable: false, routing: false, noLoop: true, formWired: false },
    detail: 'unreachable',
  })),
}))

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/tenant-health', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.alertOwner.mockClear()

  h.fake = createFakeSupabase({
    tenants: [{ id: 't1', slug: 'acme', domain: 'acme.com', status: 'active' }],
    tenant_domains: [],
    tenant_health: [],
    tenant_health_alerts: [],
  })
  h.fake._addUniqueConstraint('tenant_health_alerts', 'fingerprint')

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'))
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
  vi.useRealTimers()
})

describe('concurrent tenant-health invocations racing the same failing-tenant set', () => {
  it('alerts the owner exactly once', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    const claims = h.fake!._all('tenant_health_alerts')
    expect(claims).toHaveLength(1)
  })

  it('does not re-alert for the same failing set within the 1h window', async () => {
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T12:45:00.000Z')) // +45min, still inside 1h
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1) // still just the one alert
  })

  it('re-alerts for the same failing set once the 1h window has passed', async () => {
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T13:00:01.000Z')) // +1h1s, past the window
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(2)

    // Reclaimed the SAME row (fingerprint unchanged, still one PK row) — not
    // a second row — proving this isn't a permanent unique-constraint block
    // that would silently swallow every future recurrence.
    const claims = h.fake!._all('tenant_health_alerts')
    expect(claims).toHaveLength(1)
  })
})
