import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — POST /api/admin/send-apology-batch had no cap on `client_ids`
 * count (unlike its sibling mass-SMS routes find-cleaner/send (cap 50) and
 * message-applicants/send (cap 25)) and no length cap on the caller-supplied
 * `message`, which is the literal SMS body billed per-character per
 * recipient by Telnyx. A single call could stuff an oversized string into
 * every recipient's SMS and/or blast an unbounded recipient list.
 *
 * FIXED: BROADCAST_CAP (50) on client_ids.length, MESSAGE_MAX_LENGTH (1600)
 * on message, and capString(reason, 2000) on the DB-only apology_credit_reason.
 */

const { sendSMS } = vi.hoisted(() => ({
  sendSMS: vi.fn(async (_opts: { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }) => {}),
}))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tid-a' }, error: null })),
}))

const clientsHolder = vi.hoisted(() => ({
  rows: [] as { id: string; name: string; phone: string | null }[],
  lastUpdate: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }, error: null }) }) }) }
      }
      if (table === 'clients') {
        return {
          select: () => ({ eq: () => ({ in: async () => ({ data: clientsHolder.rows, error: null }) }) }),
          update: (values: Record<string, unknown>) => {
            clientsHolder.lastUpdate = values
            return { eq: () => ({ eq: async () => ({ data: null, error: null }) }) }
          },
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/admin/send-apology-batch', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  sendSMS.mockClear()
  clientsHolder.rows = [{ id: 'c-active', name: 'Active Client', phone: '+15559990003' }]
  clientsHolder.lastUpdate = null
})

describe('POST /api/admin/send-apology-batch — recipient/message caps', () => {
  it('LOCK: client_ids over the 50-recipient cap is rejected before any DB write or SMS send', async () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `c${i}`)
    const res = await POST(req({ client_ids: tooMany }) as never)
    expect(res.status).toBe(400)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('CONTROL: exactly 50 client_ids is allowed through the cap check', async () => {
    clientsHolder.rows = Array.from({ length: 50 }, (_, i) => ({ id: `c${i}`, name: `Client ${i}`, phone: '+15559990000' }))
    const ids = clientsHolder.rows.map(r => r.id)
    const res = await POST(req({ client_ids: ids }) as never)
    expect(res.status).toBe(200)
  })

  it('LOCK: an oversized message (>1600 chars) is rejected before any SMS send', async () => {
    const res = await POST(req({ client_ids: ['c-active'], message: 'm'.repeat(1601) }) as never)
    expect(res.status).toBe(400)
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('CONTROL: a message at exactly 1600 chars is accepted', async () => {
    const res = await POST(req({ client_ids: ['c-active'], message: 'm'.repeat(1600) }) as never)
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })

  it('LOCK: an oversized reason is truncated to 2000 chars in the DB write, not rejected', async () => {
    const oversized = 'r'.repeat(3000)
    const res = await POST(req({ client_ids: ['c-active'], reason: oversized }) as never)
    expect(res.status).toBe(200)
    expect(clientsHolder.lastUpdate?.apology_credit_reason).toHaveLength(2000)
  })
})
