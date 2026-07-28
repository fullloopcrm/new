/**
 * Coverage sweep (2026-07-28) found `check_payment` (handleCheckPayment in
 * core-tools-account.ts) had zero test coverage despite being a LIVE,
 * production-reachable, money-surfacing tool: the customer-facing voice
 * agent (src/lib/voice-agent/customer-tools.ts -> voiceCheckPayment) calls
 * `handleTool('check_payment', ...)` on every phone call where a caller
 * asks about their balance, and the same tool is reachable from
 * SMS/web/telegram conversations through core-ask.ts's tool loop.
 *
 * These are CHARACTERIZATION tests for current behavior: what a client
 * sees for outstanding balance + recent payments, and that the read is
 * scoped to the conversation's own tenant/client (not the raw tool input).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (c: string) => c }))

import { supabaseAdmin } from '@/lib/supabase'
import { handleTool, type YinezResult } from './core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const CLIENT_A = 'client-a'
const CLIENT_B = 'client-b'
const CONVO_A = 'convo-a'

function dummyResult(): YinezResult {
  return { text: '', checklist: {} } as unknown as YinezResult
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('sms_conversations', [{ id: CONVO_A, tenant_id: TENANT_A, client_id: CLIENT_A }])
})

describe('check_payment — happy path', () => {
  it('reports unpaid bookings and recent payments for the conversation\'s own client', async () => {
    fake._seed('bookings', [
      { id: 'b1', tenant_id: TENANT_A, client_id: CLIENT_A, status: 'completed', payment_status: 'unpaid', start_time: '2026-07-01T10:00:00Z', price: 8900, service_type: 'Regular' },
    ])
    fake._seed('payments', [
      { tenant_id: TENANT_A, client_id: CLIENT_A, amount: 6900, tip: 1000, method: 'card', created_at: '2026-06-20T10:00:00Z' },
    ])

    const out = JSON.parse(await handleTool('check_payment', {}, CONVO_A, dummyResult()))
    expect(out.outstanding).toHaveLength(1)
    expect(out.outstanding[0].amount).toBe('$89')
    expect(out.recent_payments).toHaveLength(1)
    expect(out.recent_payments[0].amount).toBe('$69')
    expect(out.recent_payments[0].tip).toBe('$10')
  })

  it('returns an error when the conversation has no linked client account', async () => {
    fake._seed('sms_conversations', [{ id: 'convo-no-client', tenant_id: TENANT_A, client_id: null }])
    const out = JSON.parse(await handleTool('check_payment', {}, 'convo-no-client', dummyResult()))
    expect(out.error).toBe('No account')
  })
})

describe('check_payment — tenant/client scoping', () => {
  it('does not leak another tenant\'s outstanding bookings even if IDs collide by coincidence', async () => {
    fake._seed('bookings', [
      { id: 'b-other', tenant_id: TENANT_B, client_id: CLIENT_B, status: 'completed', payment_status: 'unpaid', start_time: '2026-07-01T10:00:00Z', price: 5000, service_type: 'Regular' },
    ])
    const out = JSON.parse(await handleTool('check_payment', {}, CONVO_A, dummyResult()))
    expect(out.outstanding).toHaveLength(0)
  })
})
