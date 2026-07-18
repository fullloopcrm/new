/**
 * GET /api/cron/email-monitor — heartbeat tick must survive the
 * zero-enabled-tenants precheck.
 *
 * 3 separate consumers (admin/monitoring/status/route.ts,
 * cron/health-monitor/route.ts, lib/jefe/health.ts) treat the
 * `email_monitor_tick` notification as proof this every-minute cron ran,
 * alerting (Telegram DM + dashboard red) if it's silent for 60min. The
 * route used to write that tick AFTER the "any tenant has email monitoring
 * enabled?" precheck, inside the branch that only runs when count > 0. A
 * fully legitimate zero-enabled-tenants state (feature unused, or the last
 * tenant just disabled it) would therefore starve the tick forever, and all
 * 3 consumers would falsely report this cron as permanently dead —
 * indistinguishable from a real outage, re-alerting every 6h forever.
 *
 * Fix: write the tick unconditionally, before the precheck, so it proves
 * "the cron executed on schedule" rather than "the cron executed AND found
 * work to do."
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({ fake: null as FakeSupabase | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

const fetchMock = vi.fn(async () => new Response(JSON.stringify({ checked: 0 }), { status: 200 }))
vi.stubGlobal('fetch', fetchMock)

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/email-monitor', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined
let savedUrl: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  savedUrl = process.env.NEXT_PUBLIC_APP_URL
  process.env.CRON_SECRET = 'cron-secret-test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://x.test'
  fetchMock.mockClear()
  h.fake = createFakeSupabase({ tenants: [] })
})

afterEach(() => {
  process.env.CRON_SECRET = savedCron
  process.env.NEXT_PUBLIC_APP_URL = savedUrl
})

describe('cron/email-monitor heartbeat', () => {
  it('writes the health-monitor tick even when zero tenants have email monitoring enabled', async () => {
    const res = await GET(cronReq())
    const body = await res.json()

    expect(body.skipped).toBe('no enabled tenants')
    expect(fetchMock).not.toHaveBeenCalled()

    const ticks = h.fake!._all('notifications').filter((n) => n.type === 'email_monitor_tick')
    expect(ticks).toHaveLength(1)
  })

  it('still writes the tick and forwards to /api/email/monitor when a tenant is enabled', async () => {
    h.fake!._seed('tenants', [
      { id: 't1', email_monitor_enabled: true, imap_host: 'imap.example.com' },
    ])

    const res = await GET(cronReq())
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const ticks = h.fake!._all('notifications').filter((n) => n.type === 'email_monitor_tick')
    expect(ticks).toHaveLength(1)
  })
})
