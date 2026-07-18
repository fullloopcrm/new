import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/admin/comhub/send stored `body`/`subject` raw into
 * comhub_messages with no type/length cap, same class as connect/messages'
 * body gap. Worse here: `body.body.slice(0, 140)` was called directly on
 * the raw value, so a non-string body would throw an uncaught TypeError
 * (500) instead of a clean 400.
 *
 * FIXED: capString(body, 5000) / capString(subject, 200) — truncate rather
 * than reject; non-string or empty body coerces to null and is rejected by
 * the existing "channel and body are required" check.
 */

const TENANT_A = 'tid-a'
const CHANNEL_THREAD = 'thread-internal-1'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string) => {
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-email-1', error: null }
      return { data: null, error: { message: 'unexpected rpc' } }
    },
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ data: { id: 'sms-1' } })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ id: 'email-1' })) }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: vi.fn(() => '<html></html>') }))

import { sendEmail } from '@/lib/email'
import { POST } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, name: 'Tenant A', resend_api_key: 'resend-a', email_from: 'a@tenant-a.test' },
    ],
    comhub_contacts: [
      { id: 'contact-a', tenant_id: TENANT_A, phone: '+15551110000', email: 'a@tenant-a.test' },
    ],
    comhub_threads: [
      { id: CHANNEL_THREAD, tenant_id: TENANT_A, kind: 'channel', name: 'general', slug: 'general' },
    ],
    comhub_messages: [] as Record<string, unknown>[],
    comhub_mentions: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  vi.mocked(sendEmail).mockClear()
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/send POST — body/subject cap (internal channel)', () => {
  it('LOCK: an oversized body is truncated to 5000 chars before insert', async () => {
    const oversized = 'x'.repeat(6000)
    const res = await POST(req({ channel: 'internal', thread_id: CHANNEL_THREAD, body: oversized }))
    expect(res.status).toBe(200)
    const insert = h.seed.comhub_messages.find((m) => m.thread_id === CHANNEL_THREAD)
    expect(insert?.body).toHaveLength(5000)
    expect(insert?.body).toBe(oversized.slice(0, 5000))
  })

  it('CONTROL: a non-string body is rejected (400) instead of crashing on .slice()', async () => {
    const res = await POST(req({ channel: 'internal', thread_id: CHANNEL_THREAD, body: { evil: 'payload' } }))
    expect(res.status).toBe(400)
    expect(h.seed.comhub_messages.length).toBe(0)
  })

  it('CONTROL: a whitespace-only body is rejected', async () => {
    const res = await POST(req({ channel: 'internal', thread_id: CHANNEL_THREAD, body: '   ' }))
    expect(res.status).toBe(400)
    expect(h.seed.comhub_messages.length).toBe(0)
  })

  it('CONTROL: a normal-length body passes through untouched', async () => {
    const res = await POST(req({ channel: 'internal', thread_id: CHANNEL_THREAD, body: 'Standup at 9am.' }))
    expect(res.status).toBe(200)
    expect(h.seed.comhub_messages[0].body).toBe('Standup at 9am.')
  })
})

describe('admin/comhub/send POST — subject cap (email channel)', () => {
  it('LOCK: an oversized subject is truncated to 200 chars before insert and send', async () => {
    const oversizedSubject = 'y'.repeat(300)
    const res = await POST(req({ channel: 'email', contact_id: 'contact-a', subject: oversizedSubject, body: 'hello' }))
    expect(res.status).toBe(200)
    const insert = h.seed.comhub_messages.find((m) => m.channel === 'email')
    expect(insert?.subject).toHaveLength(200)
    expect(vi.mocked(sendEmail).mock.calls[0][0].subject).toHaveLength(200)
  })

  it('CONTROL: a non-string subject falls back to the default subject line instead of crashing', async () => {
    const res = await POST(req({ channel: 'email', contact_id: 'contact-a', subject: { evil: true }, body: 'hello' }))
    expect(res.status).toBe(200)
    expect(vi.mocked(sendEmail).mock.calls[0][0].subject).toBe('Message from Tenant A')
    const insert = h.seed.comhub_messages.find((m) => m.channel === 'email')
    expect(insert?.subject).toBeNull()
  })
})
