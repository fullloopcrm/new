import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Archetype depth: 'quote_sent' has been a declared NotificationType in
 * notify.ts since forever, but this route — the only place a proposal is
 * ever sent — only ever called ownerAlert() (email+SMS to the admin's own
 * inbox/phone), never notify() (the call that inserts the `notifications`
 * row the in-app /dashboard/notifications feed reads from). Every other
 * step of a proposal's lifecycle (viewed/accepted/declined/expired) fires
 * BOTH; "sent" — the FIRST step — was silently missing from the admin's
 * in-app activity trail. Proves the fix: a successful send now fires
 * notify(quote_sent) in addition to the existing ownerAlert(), and a send
 * where neither channel succeeds still 400s without firing either.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const QUOTE_ID = 'quote-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = { quotes: [], tenants: [] }

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        if (kind === 'update') {
          const idx = (store[table] || []).findIndex(match)
          if (idx === -1) return { data: null, error: { message: 'not found' } }
          store[table][idx] = { ...store[table][idx], ...payload }
          return { data: store[table][idx], error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      // The route's status-transition update is awaited directly on the
      // `.eq()` chain with no trailing `.single()` — a thenable is needed
      // so that commit actually applies (matching real supabase-js, where
      // the query builder itself is awaitable).
      then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') {
          for (let i = 0; i < (store[table] || []).length; i++) {
            if (match(store[table][i])) store[table][i] = { ...store[table][i], ...payload }
          }
          return resolve({ data: null, error: null })
        }
        return resolve({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

vi.mock('@/lib/quote', async (orig) => {
  const actual = await orig<typeof import('@/lib/quote')>()
  return { ...actual, logQuoteEvent: async () => {} }
})

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

const sendEmailMock = vi.fn(async (..._args: unknown[]) => ({ id: 'email-1' }))
vi.mock('@/lib/email', () => ({ sendEmail: (...args: unknown[]) => sendEmailMock(...args) }))

const sendSMSMock = vi.fn(async (..._args: unknown[]) => ({ id: 'sms-1' }))
vi.mock('@/lib/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMSMock(...args) }))

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

const ownerAlertMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: (...args: unknown[]) => ownerAlertMock(...args) }))

import { POST } from '@/app/api/quotes/[id]/send/route'

function jsonReq(body: Row): Request {
  return new Request(`http://t.test/api/quotes/${QUOTE_ID}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: QUOTE_ID })

beforeEach(() => {
  sendEmailMock.mockClear()
  sendSMSMock.mockClear()
  notifyMock.mockClear()
  ownerAlertMock.mockClear()
  store.quotes = [
    {
      id: QUOTE_ID, tenant_id: TENANT, status: 'draft', quote_number: 'Q-2001',
      contact_name: 'Alex Rivera', contact_email: 'alex@client.test', contact_phone: null,
      total_cents: 15000, deposit_cents: 0, deal_id: null, public_token: 'tok-1',
    },
  ]
  store.tenants = [
    {
      id: TENANT, name: 'Acme', slug: 'acme', domain: null, phone: null, email: null,
      address: null, logo_url: null, primary_color: null, telnyx_api_key: null, telnyx_phone: null,
      resend_api_key: 'key-1', email_from: null, selena_config: null,
    },
  ]
})

describe('POST /api/quotes/[id]/send — owner in-app feed gets the "sent" event', () => {
  it('fires notify(quote_sent) in addition to the existing ownerAlert() on a successful send', async () => {
    const res = await POST(jsonReq({ via: 'email' }), { params })
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ type: 'quote_sent', tenantId: TENANT, recipientType: 'admin' })

    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
    expect(ownerAlertMock.mock.calls[0][0]).toMatchObject({ tenantId: TENANT })

    expect(store.quotes[0].status).toBe('sent')
  })

  it('does NOT fire notify() or ownerAlert() when the only requested channel fails to send', async () => {
    sendEmailMock.mockRejectedValueOnce(new Error('resend down'))

    const res = await POST(jsonReq({ via: 'email' }), { params })
    expect(res.status).toBe(400)

    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
    expect(store.quotes[0].status).toBe('draft')
  })
})
