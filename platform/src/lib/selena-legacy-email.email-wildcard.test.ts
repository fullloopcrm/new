import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleInboundEmail's client-match lookup used `.ilike('email', from)` as an
 * EXACT-MATCH, case-insensitive lookup with zero escaping. `from` is the
 * inbound envelope/header sender address of an email delivered to the
 * tenant's public inbox — fully attacker-controlled, since anyone emailing
 * that inbox chooses their own From address, and `%` is a legal literal in
 * an email local-part (the historic sendmail "percent hack" routing
 * convention), not something a mail parser rejects.
 *
 * A crafted From address containing `%`/`_` wildcard-matched an UNRELATED
 * existing client instead of falling through to "create a new lead" — the
 * attacker's message then got appended to that client's real conversation,
 * and Selena's AI-generated reply (built from the matched client's real
 * phone/context) was emailed back to the attacker's address, leaking that
 * client's data. Same unescaped-exact-match-ilike class already fixed and
 * enforced (like-wildcard-routes.test.ts) on this file's sibling,
 * inbound-email-tenant.ts (which resolves the TENANT for this same inbound
 * path), but never applied to this file's CLIENT-matching lookup.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const askSelenaMock = vi.hoisted(() => vi.fn(async () => ({ text: 'Hi! How can we help?', checklist: {} })))
vi.mock('@/lib/selena-legacy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/selena-legacy')>()
  return { ...actual, askSelena: askSelenaMock }
})

const sendEmailMock = vi.hoisted(() => vi.fn(async () => ({ ok: true })))
vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { handleInboundEmail } from '@/lib/selena-legacy-email'
import type { ParsedEmail } from '@/lib/email-monitor'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = {
  id: 'tenant-A',
  name: 'Acme Cleaning',
  email: 'hello@acme.example',
  phone: '2125550000',
  resend_api_key: null,
  email_from: null,
  domain: 'acme.example',
}

const VICTIM_CLIENT = {
  id: 'client-victim',
  tenant_id: TENANT.id,
  name: 'Victim Real Client',
  phone: '2125551234',
  email: 'victim@example.com',
  do_not_service: false,
}

function inboundEmail(from: string): ParsedEmail {
  return {
    uid: 1,
    from,
    fromName: 'Attacker',
    subject: 'Hello',
    text: 'Can you help me book a cleaning?',
    html: '',
    date: new Date(),
    messageId: 'msg-1',
  }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [VICTIM_CLIENT])
  fake._seed('sms_conversations', [])
  fake._seed('sms_conversation_messages', [])
  askSelenaMock.mockClear()
  sendEmailMock.mockClear()
})

describe('handleInboundEmail — client-match ilike is escapeLikeValue-sourced', () => {
  it('does NOT match an unrelated client for a wildcard From address', async () => {
    const result = await handleInboundEmail(TENANT, inboundEmail('%'))

    expect(result.client_id).not.toBe(VICTIM_CLIENT.id)
    // A non-match falls through to "create a new lead" for the literal From address.
    const clients = fake._all('clients')
    const created = clients.find((c) => c.id === result.client_id)
    expect(created?.email).toBe('%')
  })

  it('CONTROL: still matches the real client on an exact address', async () => {
    const result = await handleInboundEmail(TENANT, inboundEmail('victim@example.com'))
    expect(result.client_id).toBe(VICTIM_CLIENT.id)
  })
})
