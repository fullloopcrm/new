/**
 * GET /api/cron/comms-monitor — concurrent-invocation duplicate-alert race.
 *
 * The dedup step was a plain check-then-insert: SELECT `notifications` for
 * an existing type='comms_monitor_alert' row whose message contains the
 * current fingerprint, then call alertOwner() (real Telegram DM) + INSERT
 * unconditionally — no DB constraint behind the check. This cron has no
 * maxDuration override and runs every 15 min; two overlapping invocations
 * (a slow DB round-trip bleeding into the next tick, a manual re-trigger)
 * can both read zero prior alerts for the same fingerprint and both DM the
 * platform admin, doubling a real incident alert.
 *
 * Fix: insert-first claim on comms_monitor_alerts(fingerprint) (migration
 * 2026_07_18_comms_monitor_alerts_dedup.sql) before alertOwner()/notify —
 * a 23505 unique violation means another invocation already claimed this
 * exact failure-batch fingerprint, so the loser skips as an idempotent
 * no-op, same pattern as this session's other claim-before-send fixes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
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

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/comms-monitor', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.alertOwner.mockClear()

  h.fake = createFakeSupabase({
    notifications: [
      { id: 'fail-1', type: 'comms_fail', message: 'SMS send failed', created_at: new Date().toISOString() },
    ],
    comms_monitor_alerts: [],
  })
  h.fake._addUniqueConstraint('comms_monitor_alerts', 'fingerprint')
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('concurrent comms-monitor invocations racing the same failure batch', () => {
  it('alerts the platform admin exactly once', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    const claims = h.fake!._all('comms_monitor_alerts')
    expect(claims).toHaveLength(1)

    const alertNotifs = h.fake!._all('notifications').filter((r) => r.type === 'comms_monitor_alert')
    expect(alertNotifs).toHaveLength(1)

    const firstJson = await first.json()
    const secondJson = await second.json()
    // Exactly one invocation should report alerted:true; the loser reports
    // alreadyAlerted:true instead of alerting a second time.
    const alertedCount = [firstJson.alerted, secondJson.alerted].filter(Boolean).length
    expect(alertedCount).toBe(1)
  })
})
