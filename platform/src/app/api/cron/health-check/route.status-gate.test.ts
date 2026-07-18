import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * health-check cron's self-healing notification-retry step (section 1) calls
 * notify() — a real sendEmail/sendSMS — for whatever tenant_id a failed
 * notification carries, up to 3 retries within the hour, with NO tenant
 * status check at all. Same messaging-on-behalf-of-a-dead-tenant gap class
 * fixed across Telegram/Telnyx/comhub-email/email-monitor this session: a
 * suspended/cancelled/deleted tenant's failed sends kept getting
 * re-attempted indefinitely.
 */

const notifyMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-credentials', () => ({ hasTenantSms: () => true }))

const chainMethods = ['select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'ilike', 'order', 'limit']

function genericBuilder(selectData: unknown[], updateCaptures?: Array<{ patch: Record<string, unknown>; col: string; val: unknown }>) {
  const obj: Record<string, unknown> = {}
  for (const m of chainMethods) obj[m] = () => obj
  obj.update = (patch: Record<string, unknown>) => {
    const updateChain: Record<string, unknown> = {}
    for (const m of chainMethods) {
      updateChain[m] = (...args: unknown[]) => {
        if ((m === 'eq' || m === 'in') && updateCaptures) {
          updateCaptures.push({ patch, col: args[0] as string, val: args[1] })
        }
        return updateChain
      }
    }
    updateChain.select = () => Promise.resolve({ data: [], error: null })
    updateChain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve)
    return updateChain
  }
  obj.insert = () => Promise.resolve({ data: null, error: null })
  obj.maybeSingle = () => Promise.resolve({ data: selectData[0] ?? null, error: null })
  obj.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: selectData, error: null, count: selectData.length }).then(resolve, reject)
  return obj
}

let failedNotifs: Array<{ id: string; tenant_id: string; type: string; title: string; message: string; channel: string; recipient_type: string; recipient_id: string | null; booking_id: string | null; metadata: Record<string, unknown>; retry_count: number }>
let tenantRows: Array<{ id: string; status: string | null }>
const notifUpdateCaptures: Array<{ patch: Record<string, unknown>; col: string; val: unknown }> = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'notifications') return genericBuilder(failedNotifs, notifUpdateCaptures)
      if (table === 'tenants') return genericBuilder(tenantRows)
      if (table === 'clients') return genericBuilder([])
      if (table === 'bookings') return genericBuilder([])
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
const { GET } = await import('./route')

function req() {
  return new Request('http://t/api/cron/health-check', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

function notif(id: string, tenantId: string) {
  return {
    id, tenant_id: tenantId, type: 'booking_reminder', title: 'Reminder', message: 'msg',
    channel: 'email', recipient_type: 'client', recipient_id: null, booking_id: null,
    metadata: {}, retry_count: 0,
  }
}

beforeEach(() => {
  notifyMock.mockClear()
  notifUpdateCaptures.length = 0
})

describe('health-check cron — tenantServesSite() status gate on notification retry', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'does not retry-send a %s tenant\'s failed notification, but still retries an active tenant\'s',
    async (status) => {
      tenantRows = [{ id: 't-dead', status }, { id: 't-live', status: 'active' }]
      failedNotifs = [notif('n-dead', 't-dead'), notif('n-live', 't-live')]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(notifyMock).toHaveBeenCalledTimes(1)
      expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-live' }))
      expect(notifUpdateCaptures.some((c) => c.col === 'id' && c.val === 'n-dead')).toBe(false)
      expect(notifUpdateCaptures.some((c) => c.col === 'id' && c.val === 'n-live')).toBe(true)
      expect(body.fixes.join(' ')).toContain('Retried 1 failed notifications, 1 succeeded')
    },
  )

  it.each(['active', 'setup', 'pending'])('still retries a %s tenant\'s failed notification', async (status) => {
    tenantRows = [{ id: 't-live', status }]
    failedNotifs = [notif('n-live', 't-live')]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifUpdateCaptures.some((c) => c.col === 'id' && c.val === 'n-live')).toBe(true)
    expect(body.fixes.join(' ')).toContain('Retried 1 failed notifications, 1 succeeded')
  })

  it("wrong-tenant probe: a live tenant's retry never fires on behalf of a co-seeded dead tenant's notification", async () => {
    tenantRows = [{ id: 't-dead', status: 'cancelled' }, { id: 't-live', status: 'active' }]
    failedNotifs = [notif('n-dead', 't-dead'), notif('n-live', 't-live')]

    await GET(req())

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-live' }))
    expect(notifyMock).not.toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-dead' }))
  })
})
