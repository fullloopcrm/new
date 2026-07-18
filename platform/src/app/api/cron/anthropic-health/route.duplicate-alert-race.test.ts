/**
 * GET /api/cron/anthropic-health — no-dedup alert spam, plus proof the 1h
 * re-alert window still works after the fix.
 *
 * Previously notifyOwnerOnTelegram() fired unconditionally on EVERY 15-min
 * tick while the Anthropic API kept failing a credit/auth/rate-limit check
 * -- zero dedup at all, not even a racy check-then-act window. A multi-hour
 * credit-exhaustion outage (Yinez silent across every tenant) re-sent the
 * same URGENT DM every 15 min for as long as it lasted.
 *
 * Fix: two-step atomic claim on anthropic_health_alerts(fingerprint) --
 * fresh insert first (fingerprint = failure type), then (on a 23505
 * conflict) an UPDATE ... WHERE alerted_at is stale reclaims the row. The
 * failure TYPE is a stable identifier that legitimately re-fires after
 * recovery (credits topped up, then rate-limited again days later) -- so the
 * reclaim path needs its own coverage, see
 * 2026_07_18_anthropic_health_alerts_dedup.sql.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
  notifyOwnerOnTelegram: vi.fn().mockResolvedValue({ ok: true }),
  create: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/telegram', () => ({
  notifyOwnerOnTelegram: (...args: unknown[]) => h.notifyOwnerOnTelegram(...args),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => h.create(...a) }
  },
}))

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/anthropic-health', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.notifyOwnerOnTelegram.mockClear()
  h.create.mockReset()
  h.create.mockRejectedValue(new Error('Your credit balance is too low to access the Anthropic API'))

  h.fake = createFakeSupabase({ anthropic_health_alerts: [] })
  h.fake._addUniqueConstraint('anthropic_health_alerts', 'fingerprint')

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'))
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
  vi.useRealTimers()
})

describe('concurrent anthropic-health invocations racing the same failure type', () => {
  it('DMs the owner exactly once', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(500)
    expect(second.status).toBe(500)
    expect(h.notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)

    const claims = h.fake!._all('anthropic_health_alerts')
    expect(claims).toHaveLength(1)
    expect(claims[0].fingerprint).toBe('credit')
  })

  it('does not re-alert for the same failure type within the 1h window', async () => {
    await GET(cronReq())
    expect(h.notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T12:30:00.000Z')) // +30min, still inside 1h
    await GET(cronReq())
    expect(h.notifyOwnerOnTelegram).toHaveBeenCalledTimes(1) // still just the one alert
  })

  it('re-alerts for the same failure type once the 1h window has passed', async () => {
    await GET(cronReq())
    expect(h.notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T13:00:01.000Z')) // +1h1s, past the window
    await GET(cronReq())
    expect(h.notifyOwnerOnTelegram).toHaveBeenCalledTimes(2)

    // Reclaimed the SAME row (fingerprint unchanged, still one PK row), not
    // a second one -- proves the fix isn't a permanent unique-constraint
    // block that would silently swallow every future occurrence.
    const claims = h.fake!._all('anthropic_health_alerts')
    expect(claims).toHaveLength(1)
  })

  it('alerts again immediately when the failure type changes', async () => {
    await GET(cronReq())
    expect(h.notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)

    h.create.mockRejectedValue(new Error('rate limit exceeded, 429'))
    await GET(cronReq())
    expect(h.notifyOwnerOnTelegram).toHaveBeenCalledTimes(2) // different fingerprint, not suppressed

    const claims = h.fake!._all('anthropic_health_alerts')
    expect(claims).toHaveLength(2)
  })
})
