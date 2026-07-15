import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * createOrLinkClient(name, conversationId) (Yinez/nycmaid engine's SMS
 * name-capture step, private in core.ts, driven by extractAndSave) used a
 * weak `cleanPhone.length >= 7` floor before ilike-substring-matching
 * `clients.phone` -- a malformed 7-9 digit phone on the conversation could
 * match an ARBITRARY unrelated client, silently overwriting their `name`
 * and mis-linking this conversation's client_id onto their record. Same
 * bug class already fixed on the identical sibling function in the 3
 * per-tenant site-clone Selena libs (0d342ed4) and in
 * platform/src/app/api/chat/route.ts (8ac9bcd2), missed here.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { extractAndSave, EMPTY_CHECKLIST } from '@/lib/selena/core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-A'
const CONVO_ID = 'convo-1'
const VICTIM = { id: 'client-victim', tenant_id: TENANT, name: 'Victim Real Client', phone: '2125551234' }

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ ...VICTIM }])
})

function seedConvo(phone: string) {
  fake._seed('sms_conversations', [{ id: CONVO_ID, tenant_id: TENANT, phone, client_id: null }])
}

describe('createOrLinkClient (Yinez engine, via extractAndSave name-capture) — phone match floor', () => {
  it('does NOT overwrite an unrelated client for a malformed 8-digit phone that IS a real substring of the victim number', async () => {
    seedConvo('21255512')
    await extractAndSave('my name is Mallory Attacker', EMPTY_CHECKLIST, CONVO_ID, 'name')

    const client = fake._store.get('clients')!.find((c) => c.id === VICTIM.id)!
    expect(client.name).toBe('Victim Real Client')

    const convo = fake._store.get('sms_conversations')!.find((c) => c.id === CONVO_ID)!
    expect(convo.client_id).not.toBe(VICTIM.id)
  })

  it('CONTROL: still links + updates the real client on an exact 10-digit match', async () => {
    seedConvo('2125551234')
    await extractAndSave('my name is Victim Updated', EMPTY_CHECKLIST, CONVO_ID, 'name')

    const client = fake._store.get('clients')!.find((c) => c.id === VICTIM.id)!
    expect(client.name).toBe('Victim Updated')

    const convo = fake._store.get('sms_conversations')!.find((c) => c.id === CONVO_ID)!
    expect(convo.client_id).toBe(VICTIM.id)
  })
})
