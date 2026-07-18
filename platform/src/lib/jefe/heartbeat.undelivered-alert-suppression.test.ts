import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * runHeartbeat() dedups alerts against the fingerprints recorded in the last
 * jefe_snapshots row -- a fingerprint present there is treated as "already
 * told the group" and never re-sent while the issue stays steady-state. The
 * old code persisted that snapshot (with brand-new fingerprints included)
 * BEFORE ever checking JEFE_OWNER_CHAT_ID/JEFE_BOT_TOKEN and before calling
 * sendTelegram. sendTelegram never throws (it catches and returns
 * {ok:false}), so a missing token or a transient Telegram failure meant the
 * new alert's fingerprint was marked "seen" despite never being delivered --
 * permanently suppressing it, since every future run would see the fp already
 * in active_alerts and treat the (still-broken) issue as already reported.
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))

const sendTelegram = vi.fn()
vi.mock('@/lib/telegram', () => ({ sendTelegram: (...args: unknown[]) => sendTelegram(...args) }))

const getPlatformHealth = vi.fn()
vi.mock('@/lib/jefe/health', () => ({ getPlatformHealth: (...args: unknown[]) => getPlatformHealth(...args) }))

const HEALTHY = {
  provisioning: { fully_unprovisioned: 0 },
  comms: { failed_24h: 0, success_rate: 100 },
  crons: { silent: [] as { name: string; silent_hours: number | null; expected_hours: number }[] },
  errors: { last_1h: 0 },
  payments: { stuck_unpaid_24h: 0 },
  security: { events_24h: 0 },
}

const CRON_DOWN = {
  ...HEALTHY,
  crons: { silent: [{ name: 'reminders', silent_hours: 40, expected_hours: 36 }] },
}

let runHeartbeat: typeof import('./heartbeat').runHeartbeat
let tick = 0

// The fake's `order('created_at', ...).limit(1)` needs distinct, increasing
// values to pick the LATEST snapshot -- runHeartbeat() itself never sets
// created_at (relies on the real DB's `default now()`), so stamp it here
// after each call, same as Postgres would on insert.
async function run(): ReturnType<typeof runHeartbeat> {
  const result = await runHeartbeat()
  tick += 1
  const rows = h.fake!._all('jefe_snapshots')
  rows[rows.length - 1].created_at = new Date(2026, 0, 1, 0, 0, tick).toISOString()
  return result
}

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  tick = 0
  process.env.JEFE_OWNER_CHAT_ID = '555'
  process.env.JEFE_BOT_TOKEN = 'jefe-bot-token'
  h.fake = createFakeSupabase({})
  ;({ runHeartbeat } = await import('./heartbeat'))
})

describe('runHeartbeat — undelivered new-alert suppression', () => {
  it('a failed Telegram send does NOT mark the new alert as seen -- it retries next run', async () => {
    getPlatformHealth.mockResolvedValue(CRON_DOWN)
    sendTelegram.mockResolvedValue({ ok: false, status: 429, body: 'rate limited' })

    const first = await run()
    expect(first.alerts_new).toBe(1)
    expect(first.send_ok).toBe(false)

    // Same still-broken cron, second run: without the fix, the fp from run 1
    // would already be in active_alerts and this run would report 0 new
    // alerts (silently treating an undelivered alert as already handled).
    const second = await run()
    expect(second.alerts_new).toBe(1)
    expect(sendTelegram).toHaveBeenCalledTimes(2)
  })

  it('a missing bot token does NOT mark the new alert as seen -- it retries once configured', async () => {
    delete process.env.JEFE_BOT_TOKEN
    getPlatformHealth.mockResolvedValue(CRON_DOWN)

    const first = await run()
    expect(first.alerts_new).toBe(1)
    expect(first.sent).toBe(false)
    expect(sendTelegram).not.toHaveBeenCalled()

    process.env.JEFE_BOT_TOKEN = 'jefe-bot-token'
    sendTelegram.mockResolvedValue({ ok: true, status: 200, body: '{}' })
    const second = await run()
    expect(second.alerts_new).toBe(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('a SUCCESSFUL delivery marks the alert seen -- steady-state does not re-alert', async () => {
    getPlatformHealth.mockResolvedValue(CRON_DOWN)
    sendTelegram.mockResolvedValue({ ok: true, status: 200, body: '{}' })

    const first = await run()
    expect(first.alerts_new).toBe(1)
    expect(first.send_ok).toBe(true)

    const second = await run()
    expect(second.alerts_new).toBe(0)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('a delivery failure does not re-flag an already-delivered, still-active alert as new', async () => {
    getPlatformHealth.mockResolvedValue(CRON_DOWN)
    sendTelegram.mockResolvedValue({ ok: true, status: 200, body: '{}' })
    await run()

    // A second, distinct alert fires while the first one is still active but
    // this run's send fails -- the already-delivered fp must not be re-marked
    // new even though it isn't re-persisted via the "send.ok" branch.
    getPlatformHealth.mockResolvedValue({
      ...CRON_DOWN,
      errors: { last_1h: 15 },
    })
    sendTelegram.mockResolvedValue({ ok: false, status: 500, body: 'down' })
    const second = await run()
    expect(second.alerts_new).toBe(1)
    expect(second.alerts_active).toBe(2)

    // Third run, still both conditions active, delivery now succeeds: only
    // the still-undelivered error-spike alert should count as new.
    sendTelegram.mockResolvedValue({ ok: true, status: 200, body: '{}' })
    const third = await run()
    expect(third.alerts_new).toBe(1)
    expect(third.alerts_active).toBe(2)

    const fourth = await run()
    expect(fourth.alerts_new).toBe(0)
  })
})
