import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * admin/comhub/send POST — DNS (do_not_service) gate.
 *
 * 2026-08-01: a client marked do_not_service must get zero ComHub
 * communications, not just skipped auto-replies (that was the pre-existing
 * behavior for Selena/AI sends). Checked at the API layer, not just the UI,
 * so a direct call can't bypass it.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'comhub_get_or_create_thread') return { data: `thread-for-${args.p_contact_id}`, error: null }
      return { data: null, error: { message: 'unexpected rpc' } }
    },
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ data: { id: 'sms-1' } })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ id: 'email-1' })) }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: vi.fn(() => '<html></html>') }))

import { sendSMS } from '@/lib/sms'
import { POST } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT, name: 'Tenant A', telnyx_api_key: 'key-a', telnyx_phone: '+18885550000', resend_api_key: 'resend-a' },
    ],
    clients: [
      { id: 'client-dns', tenant_id: TENANT, phone: '+15551119999', do_not_service: true },
      { id: 'client-ok', tenant_id: TENANT, phone: '+15551110000', do_not_service: false },
    ],
    comhub_contacts: [
      { id: 'contact-dns', tenant_id: TENANT, phone: '+15551119999', client_id: 'client-dns' },
      { id: 'contact-ok', tenant_id: TENANT, phone: '+15551110000', client_id: 'client-ok' },
    ],
    comhub_threads: [],
    comhub_messages: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  vi.mocked(sendSMS).mockClear()
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/send POST — DNS gate', () => {
  it('BLOCKED: sending to a contact linked to a do_not_service client 403s, no SMS sent, no message created', async () => {
    const res = await POST(req({ contact_id: 'contact-dns', channel: 'sms', body: 'hi' }))
    expect(res.status).toBe(403)
    expect(sendSMS).not.toHaveBeenCalled()
    expect(h.capture.inserts.find((i) => i.table === 'comhub_messages')).toBeUndefined()
  })

  it('CONTROL: a non-DNS linked client still sends normally', async () => {
    const res = await POST(req({ contact_id: 'contact-ok', channel: 'sms', body: 'hi' }))
    expect(res.status).toBe(200)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
