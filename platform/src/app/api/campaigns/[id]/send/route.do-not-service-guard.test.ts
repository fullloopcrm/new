import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * campaigns/[id]/send POST — bulk email/SMS campaigns never checked
 * do_not_service (P1/W2 fresh-ground audit). do_not_service is the
 * codebase-wide "NEVER contact" flag enforced on every other outbound
 * fan-out (payment-processor.ts, selena-legacy-core's DNS filter,
 * client-auth) — campaigns only checked the per-channel marketing
 * opt-outs (email_marketing_opt_out / sms_marketing_opt_out / sms_consent),
 * so a client the business explicitly banned still received bulk marketing
 * email AND SMS campaigns.
 *
 * FIX: both channel gates now also require `!client.do_not_service`.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: A,
      tenant: { id: A, name: 'Biz A', telnyx_api_key: 'k', telnyx_phone: 'p', resend_api_key: 'r', email_from: 'a@x.com' },
      role: 'owner',
      userId: 'u1',
    },
    error: null,
  })),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ campaign_approval_required: false, campaign_sender_name: null, campaign_auto_unsubscribe: false })),
}))
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async () => {}), sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))
vi.mock('@/lib/email', () => ({ sendEmail: spies.sendEmail }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    campaigns: [
      { id: 'camp-both', tenant_id: A, status: 'draft', type: 'both', name: 'Sale', subject: 'Sale!', body: 'Hi {name}' },
    ],
    clients: [
      { id: 'cli-dns', tenant_id: A, name: 'Banned Client', email: 'dns@x.com', phone: '5551110000', status: 'active', sms_consent: true, email_marketing_opt_out: false, sms_marketing_opt_out: false, do_not_service: true },
      { id: 'cli-control', tenant_id: A, name: 'Good Client', email: 'ok@x.com', phone: '5552220000', status: 'active', sms_consent: true, email_marketing_opt_out: false, sms_marketing_opt_out: false, do_not_service: false },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
  spies.sendEmail.mockClear()
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}
function send(id: string) {
  return POST(new Request('http://t', { method: 'POST' }), params(id))
}

describe('campaigns/[id]/send POST — do_not_service gate on both channels', () => {
  it('BLOCKED: do_not_service=true client receives neither the email nor SMS leg of a "both" campaign', async () => {
    const res = await send('camp-both')
    expect(res.status).toBe(200)
    expect(spies.sendEmail).not.toHaveBeenCalledWith(expect.objectContaining({ to: 'dns@x.com' }))
    expect(spies.sendSMS).not.toHaveBeenCalledWith(expect.objectContaining({ to: '5551110000' }))
  })

  it('CONTROL: a non-do_not_service client still receives both legs', async () => {
    const res = await send('camp-both')
    expect(res.status).toBe(200)
    expect(spies.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'ok@x.com' }))
    expect(spies.sendSMS).toHaveBeenCalledWith(expect.objectContaining({ to: '5552220000' }))
  })

  it('sentCount reflects only the non-banned recipient (1 email + 1 sms = 2), not the banned client', async () => {
    const res = await send('camp-both')
    const body = await res.json()
    expect(body.sent).toBe(2)
  })
})
