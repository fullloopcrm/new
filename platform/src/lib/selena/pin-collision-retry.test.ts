import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). The application-layer regenerate-and-retry
 * fix for this constraint (client/collect, client/verify-code, client/book,
 * team route) never reached Selena's own clients.pin mint sites -- a
 * completely different subsystem (the SMS/agent conversational layer) that
 * hits the same clients table. Three sites here minted a fresh PIN with no
 * collision handling:
 *   - createOrLinkClient() (SMS name-capture auto-create) -- didn't even
 *     check the insert's error, silently dropping the client creation.
 *   - handleCreateBooking()'s auto-create-client branch -- checked the error
 *     but never retried, failing a first-time SMS booking outright.
 *   - handleSendPin() -- an UPDATE, not insert, that ignored the update's
 *     error entirely and texted the customer a "new" PIN that was NEVER
 *     actually persisted, permanently locking them out of portal login.
 * All three now regenerate-and-retry on 23505, same pattern as the earlier
 * client/collect fix.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('clients', 'pin')
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))

const h = vi.hoisted(() => ({ collisionPin: 'colliding-pin', freshCalls: 0 }))
vi.mock('@/lib/client-auth', () => ({
  randomClientPin: vi.fn(() => {
    h.freshCalls++
    // First 2 calls collide with the seeded pin, then succeed.
    return h.freshCalls <= 2 ? h.collisionPin : `fresh-pin-${h.freshCalls}`
  }),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { extractAndSave, EMPTY_CHECKLIST, handleCreateBooking, type YinezResult } from '@/lib/selena/core'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT = 'tenant-A'
const CONVO_ID = 'convo-1'

function freshResult(): YinezResult {
  return { text: '', checklist: { ...EMPTY_CHECKLIST } }
}

beforeEach(() => {
  vi.clearAllMocks()
  fake._store.clear()
  h.freshCalls = 0
})

describe('createOrLinkClient — clients.pin conflict handling (via extractAndSave)', () => {
  it('regenerates and retries when a fresh PIN collides, and still creates the client', async () => {
    fake._seed('clients', [{ id: 'existing-1', tenant_id: TENANT, name: 'Someone Else', phone: '9998887777', pin: h.collisionPin }])
    fake._seed('sms_conversations', [{ id: CONVO_ID, tenant_id: TENANT, phone: '2125550000', client_id: null }])

    await extractAndSave('my name is New Person', EMPTY_CHECKLIST, CONVO_ID, 'name')

    const created = fake._store.get('clients')!.find((c) => c.phone === '2125550000')
    expect(created).toBeTruthy()
    expect(created!.pin).toBe('fresh-pin-3')
    expect(h.freshCalls).toBe(3)
  })
})

describe('handleCreateBooking auto-create-client — clients.pin conflict handling', () => {
  it('gives up after MAX_CLIENT_PIN_ATTEMPTS instead of retrying forever, and surfaces an error', async () => {
    // Every regenerated pin collides -- forces the retry loop to exhaust.
    fake._seed('clients', [{ id: 'existing-1', tenant_id: TENANT, name: 'Someone Else', phone: '9998887777', pin: h.collisionPin }])
    fake._seed('sms_conversations', [{ id: CONVO_ID, tenant_id: TENANT, phone: '2125550001', client_id: null }])
    ;(vi.mocked((await import('@/lib/client-auth')).randomClientPin)).mockImplementation(() => {
      h.freshCalls++
      return h.collisionPin
    })

    const out = await handleCreateBooking({ client_name: 'New Person' }, CONVO_ID, freshResult())
    const parsed = JSON.parse(out)

    expect(parsed.error).toMatch(/Auto-create client failed/)
    expect(h.freshCalls).toBe(5)
    expect(fake._store.get('clients')!.some((c) => c.phone === '2125550001')).toBe(false)
  })
})

