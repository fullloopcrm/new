/**
 * POST /api/portal/auth send_code — unchecked insert() reported false success.
 *
 * The code row insert into portal_auth_codes was never checked for an error.
 * A failed insert (RLS denial, transient DB error) still fell through to
 * send the SMS/email and return {sent: true} — the client is told a code
 * was sent, but nothing was ever persisted, so verify_code always 400s with
 * "Code expired or not found" and there's zero server-side signal anything
 * went wrong. Same false-success-on-unchecked-write shape fixed elsewhere
 * this session (Yinez SMS assistant, document duplicate, referrer ledger).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const real = createFakeSupabase()
  const wrapped = {
    ...real,
    from(table: string) {
      const builder = real.from(table) as unknown as Record<string, unknown>
      if (table !== 'portal_auth_codes') return builder
      const origInsert = (builder.insert as (...args: unknown[]) => Record<string, unknown>).bind(builder)
      builder.insert = (...args: unknown[]) => {
        if (forceInsertError) {
          return { then: (resolve: (r: unknown) => void) => resolve({ data: null, error: { message: 'insert failed', code: '42501' } }) }
        }
        return origInsert(...args)
      }
      return builder
    },
  }
  return { supabase: wrapped, supabaseAdmin: wrapped, __fake: real }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })),
}))

const sendSMSMock = vi.fn(async () => ({ success: true }))
const sendEmailMock = vi.fn(async () => ({ id: 'em_1' }))
vi.mock('@/lib/sms', () => ({ sendSMS: sendSMSMock }))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const PHONE = '+15551234567'
const TENANT_ID = 'tenant-1'
const TENANT_SLUG = 'test-tenant'

let forceInsertError = false

function seed(clients: Partial<Row>[]) {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: TENANT_ID, slug: TENANT_SLUG, status: 'active', name: 'Test Tenant',
      telnyx_api_key: 'key', telnyx_phone: '+18005551000', resend_api_key: 'k',
    },
  ])
  fake._seed('clients', clients)
  fake._seed('portal_auth_codes', [])
}

function sendCodeReq() {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'send_code', phone: PHONE, tenant_slug: TENANT_SLUG }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'portal-test-secret'
  forceInsertError = false
  sendSMSMock.mockClear()
  sendEmailMock.mockClear()
  seed([{ id: 'client-1', tenant_id: TENANT_ID, name: 'Test Client', phone: PHONE, email: 'c1@x.com' }])
})

describe('POST /api/portal/auth send_code — insert failure', () => {
  it('fails closed instead of sending a code that was never persisted', async () => {
    forceInsertError = true

    const res = await POST(sendCodeReq())
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.sent).toBeUndefined()
    expect(sendSMSMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('a genuinely successful insert still sends the code (no regression)', async () => {
    const res = await POST(sendCodeReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(true)
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
  })
})
