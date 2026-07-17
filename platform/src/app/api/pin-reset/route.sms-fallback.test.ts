/**
 * PIN-RESET SEND_CODE — SMS delivery ignored tenants.sms_number.
 *
 * telnyx_phone is the newer dedicated SMS-number column; sms_number predates
 * it and is still independently writable via the admin settings API (see
 * lib/jefe/actions.ts's telnyx_phone||sms_number precedence, already
 * established as the correct convention elsewhere in this codebase). This
 * route read tenant.telnyx_phone alone, so a tenant configured only on the
 * legacy column silently fell through to the email fallback -- or a flat 503
 * if the member on file had no email -- even though the tenant genuinely has
 * SMS capability.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('next/headers', () => ({
  headers: async () => new Map([
    ['x-tenant-id', TENANT_ID],
    ['x-tenant-sig', 'sig'],
  ]),
}))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: () => true,
}))

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hash:${pin}`,
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 4 })),
}))

const sendSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/sms', () => ({
  sendSMS: (...args: unknown[]) => sendSMS(...args),
}))

const sendEmail = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const MEMBER_ID = 'member-1'
const MEMBER_PHONE = '+15550001111'

function seed(tenantOverrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: TENANT_ID,
      name: 'Test Co',
      telnyx_api_key: 'key-123',
      telnyx_phone: null,
      sms_number: '+15559998888',
      resend_api_key: 'resend-key',
      ...tenantOverrides,
    },
  ])
  fake._seed('tenant_members', [
    { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Test Member', phone: MEMBER_PHONE, email: null },
  ])
}

function sendCodeReq() {
  return new Request('http://x/api/pin-reset', {
    method: 'POST',
    body: JSON.stringify({ action: 'send_code', contact: MEMBER_PHONE }),
  })
}

beforeEach(() => {
  sendSMS.mockClear()
  sendEmail.mockClear()
  seed()
})

describe('POST /api/pin-reset send_code — telnyx_phone/sms_number fallback', () => {
  it('sends via SMS using the legacy sms_number column when telnyx_phone is unset', async () => {
    const res = await POST(sendCodeReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ sent: true, via: 'sms' })
    expect(sendSMS).toHaveBeenCalledWith(
      expect.objectContaining({ to: MEMBER_PHONE, telnyxPhone: '+15559998888' }),
    )
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('prefers telnyx_phone over sms_number when both are set', async () => {
    seed({ telnyx_phone: '+15551112222', sms_number: '+15559998888' })
    const res = await POST(sendCodeReq())
    await res.json()

    expect(sendSMS).toHaveBeenCalledWith(
      expect.objectContaining({ telnyxPhone: '+15551112222' }),
    )
  })

  it('falls through to email (or 503) when neither telnyx_phone nor sms_number is set and the member has no email', async () => {
    seed({ telnyx_phone: null, sms_number: null })
    const res = await POST(sendCodeReq())
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.error).toMatch(/no phone\/email on file/i)
    expect(sendSMS).not.toHaveBeenCalled()
  })
})
