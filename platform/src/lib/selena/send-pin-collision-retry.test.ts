import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleSendPin (Selena SMS tool `send_pin`) — clients.pin conflict handling.
 *
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). When a client's stored PIN was invalid (null
 * or not 6 digits), this UPDATE regenerated a replacement PIN but ignored
 * the update's error entirely, then texted the customer that "new" PIN
 * regardless of whether it actually saved -- on a 23505 collision the
 * customer would be sent a PIN that was never persisted, permanently
 * locking them out of portal login (the DB still had the old invalid PIN).
 * Fix: regenerate-and-retry on 23505, same pattern as the earlier
 * client/collect fix, and only text a PIN once the update actually
 * succeeded.
 */

const h = vi.hoisted(() => ({ updateAttempts: 0, collisionsRemaining: 0, pinCalls: 0, lastPin: '' }))

function conflictError() {
  return { code: '23505', message: 'duplicate key value violates unique constraint "idx_clients_tenant_pin_unique"' }
}

vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
vi.mock('@/lib/client-auth', () => ({
  randomClientPin: vi.fn(() => {
    h.pinCalls++
    h.lastPin = `pin-${h.pinCalls}`
    return h.lastPin
  }),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

const CLIENT = { id: 'client-1', pin: null as string | null, name: 'Needs Pin', phone: '2125550002' }
const CONVO = { client_id: 'client-1', phone: '2125550002', tenant_id: 'tenant-A' }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ single: async () => ({ data: table === 'clients' ? { ...CLIENT } : null, error: null }) }),
          single: async () => ({ data: table === 'sms_conversations' ? { ...CONVO } : null, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: () => ({
          eq: async () => {
            h.updateAttempts++
            if (h.collisionsRemaining > 0) {
              h.collisionsRemaining--
              return { error: conflictError() }
            }
            CLIENT.pin = patch.pin as string
            return { error: null }
          },
        }),
      }),
    }),
  },
}))

import { sendSMS } from '@/lib/nycmaid/sms'
import { handleTool, EMPTY_CHECKLIST, type YinezResult } from '@/lib/selena/core'

function freshResult(): YinezResult {
  return { text: '', checklist: { ...EMPTY_CHECKLIST } }
}

beforeEach(() => {
  vi.clearAllMocks()
  h.updateAttempts = 0
  h.collisionsRemaining = 0
  h.pinCalls = 0
  CLIENT.pin = null
})

describe('send_pin — clients.pin conflict handling', () => {
  it('regenerates and retries when a fresh PIN collides, and only texts the PIN that was actually persisted', async () => {
    h.collisionsRemaining = 2

    const out = await handleTool('send_pin', {}, 'convo-1', freshResult())
    const parsed = JSON.parse(out)

    expect(parsed.success).toBe(true)
    expect(h.updateAttempts).toBe(3)
    expect(CLIENT.pin).toBe('pin-3')
    expect(sendSMS).toHaveBeenCalledWith('2125550002', expect.stringContaining('pin-3'), expect.anything())
  })

  it('does NOT text a PIN that failed to persist when every regeneration attempt collides', async () => {
    h.collisionsRemaining = 999

    const out = await handleTool('send_pin', {}, 'convo-1', freshResult())
    const parsed = JSON.parse(out)

    expect(parsed.error).toBe('Failed to send PIN')
    expect(h.updateAttempts).toBe(5)
    expect(CLIENT.pin).toBeNull()
    expect(sendSMS).not.toHaveBeenCalled()
  })
})
