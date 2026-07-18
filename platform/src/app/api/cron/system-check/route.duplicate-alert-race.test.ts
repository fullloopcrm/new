/**
 * GET /api/cron/system-check — no-dedup alert spam, plus proof the 6h
 * re-alert window still works after the fix.
 *
 * Previously alertOwner() fired unconditionally on EVERY hourly run while
 * any of the 10 checks kept failing -- zero dedup at all, not even a racy
 * check-then-act window. A single persistent condition (an env var silently
 * unset, DB connectivity degraded) re-alerted the owner every hour for as
 * long as it stayed broken.
 *
 * Fix: two-step atomic claim on system_check_alerts(fingerprint) -- fresh
 * insert first (fingerprint = sorted failing check names), then (on a 23505
 * conflict) an UPDATE ... WHERE alerted_at is stale reclaims the row. The
 * failing-check SET is a stable identifier that legitimately re-fires after
 * recovery -- so the reclaim path needs its own coverage, see
 * 2026_07_18_system_check_alerts_dedup.sql.
 *
 * trackError is mocked out entirely so its own separate, internally-gated
 * alert path (an unrelated pre-existing issue, flagged not fixed in the
 * migration header) can't confound assertions about THIS route's own
 * alertOwner() call.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
  alertOwner: vi.fn().mockResolvedValue({ ok: true }),
  trackError: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/telegram', () => ({
  alertOwner: (...args: unknown[]) => h.alertOwner(...args),
}))

vi.mock('@/lib/error-tracking', () => ({
  trackError: (...args: unknown[]) => h.trackError(...args),
}))

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/system-check', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

const REQUIRED_ENVS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'PORTAL_SECRET', 'TEAM_PORTAL_SECRET']
const CLERK_ENVS = ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY']
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of [...REQUIRED_ENVS, ...CLERK_ENVS]) saved[k] = process.env[k]
  process.env.CRON_SECRET = 'cron-secret-test'
  for (const k of REQUIRED_ENVS) if (!process.env[k]) process.env[k] = 'test-value'
  // Deliberately leave Clerk keys unset -> "Auth (Clerk)" fails AND
  // "Environment" fails (both required-env checks) -> a deterministic
  // 2-check fingerprint, independent of any DB state.
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  delete process.env.CLERK_SECRET_KEY

  h.alertOwner.mockClear()
  h.trackError.mockClear()

  // Every DB-backed check queries an empty table -> count 0 -> each passes
  // on its own terms, leaving Auth+Environment as the only failures.
  h.fake = createFakeSupabase({
    tenants: [],
    tenant_members: [],
    bookings: [],
    notifications: [],
    error_logs: [],
    campaigns: [],
    system_check_alerts: [],
  })
  h.fake._addUniqueConstraint('system_check_alerts', 'fingerprint')

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'))
})

afterEach(() => {
  for (const k of [...REQUIRED_ENVS, ...CLERK_ENVS]) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  vi.useRealTimers()
})

describe('concurrent system-check invocations racing the same failing-check set', () => {
  it('alerts the platform admin exactly once', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    const claims = h.fake!._all('system_check_alerts')
    expect(claims).toHaveLength(1)
    expect(claims[0].fingerprint).toBe('Auth (Clerk),Environment')
  })

  it('does not re-alert for the same failing set within the 6h window', async () => {
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T14:00:00.000Z')) // +2h, still inside 6h
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1) // still just the one alert
  })

  it('re-alerts for the same failing set once the 6h window has passed', async () => {
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T18:00:01.000Z')) // +6h1s, past the window
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(2)

    // Reclaimed the SAME row (fingerprint unchanged, still one PK row), not
    // a second one -- proves the fix isn't a permanent unique-constraint
    // block that would silently swallow every future occurrence.
    const claims = h.fake!._all('system_check_alerts')
    expect(claims).toHaveLength(1)
  })
})
