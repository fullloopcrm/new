import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Extends the idempotency pattern already proven on process_stripe_refund
 * (tools.refund-idempotency.test.ts — DB-state pre-check + Stripe
 * idempotencyKey so a retried/duplicate tool call issues exactly one real
 * refund) to five more owner-facing Yinez tools that can be re-invoked by
 * the agent (timeout, duplicate dispatch, owner repeating themselves):
 * mark_payout_paid, approve_refund, block_client, deactivate_cleaner, and
 * trigger_cron. Each test drives runTool() twice with identical args and
 * proves the SAME real-world effect happens exactly once — not that the
 * second call errors, but that nothing observable (an admin SMS, a
 * duplicate note line, a rewritten timestamp, a second cron fire) doubles.
 */

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
const smsAdminsMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: (...args: unknown[]) => smsAdminsMock(...args) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
const notifyMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/nycmaid/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_ID) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({ success: true })) }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'

const fake = supabaseAdmin as unknown as FakeSupabase

function stubResult() {
  return { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]
}

beforeEach(() => {
  fake._store.clear()
  smsAdminsMock.mockClear()
  notifyMock.mockClear()
})

describe('mark_payout_paid — duplicate call does not re-write paid_at', () => {
  it('second call is a no-op against an already-paid payout', async () => {
    fake._seed('team_member_payouts', [{ id: 'payout_1', tenant_id: TENANT_ID, status: 'pending', paid_at: null }])

    const first = await runTool('mark_payout_paid', { payout_id: 'payout_1' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(first).ok).toBe(true)
    const afterFirst = fake._all('team_member_payouts').find((r) => r.id === 'payout_1')!
    expect(afterFirst.status).toBe('paid')
    const paidAtAfterFirst = afterFirst.paid_at

    const second = await runTool('mark_payout_paid', { payout_id: 'payout_1' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const secondParsed = JSON.parse(second)
    expect(secondParsed.ok).toBe(true)
    expect(secondParsed.note).toMatch(/already marked paid/)

    const afterSecond = fake._all('team_member_payouts').find((r) => r.id === 'payout_1')!
    // The real effect (paid_at timestamp) was written exactly once.
    expect(afterSecond.paid_at).toBe(paidAtAfterFirst)
  })
})

describe('approve_refund — duplicate call does not double-notify admins', () => {
  it('only sends the admin SMS/notify once across two identical approvals', async () => {
    fake._seed('bookings', [{ id: 'booking_1', tenant_id: TENANT_ID, client_id: 'client_1', payment_status: 'paid', notes: null }])

    const args = { booking_id: 'booking_1', amount_dollars: 40, reason: 'client complaint' }
    const first = await runTool('approve_refund', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(first).ok).toBe(true)

    const second = await runTool('approve_refund', args, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const secondParsed = JSON.parse(second)
    expect(secondParsed.ok).toBe(true)
    expect(secondParsed.note).toMatch(/already approved/)

    // The real effect at risk — an SMS/notification to the admin — fired exactly once.
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(smsAdminsMock).toHaveBeenCalledTimes(1)

    const booking = fake._all('bookings').find((r) => r.id === 'booking_1')!
    const noteLines = String(booking.notes || '').split('\n').filter((l) => l.includes('REFUND APPROVED'))
    expect(noteLines).toHaveLength(1)
  })
})

describe('block_client — duplicate call does not duplicate the DNS note', () => {
  it('second call recognizes the client is already blocked', async () => {
    fake._seed('clients', [{ id: 'client_1', tenant_id: TENANT_ID, do_not_service: false, notes: null, sms_consent: true }])

    const first = await runTool('block_client', { client_id: 'client_1', reason: 'abusive' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(first).ok).toBe(true)

    const second = await runTool('block_client', { client_id: 'client_1', reason: 'abusive again' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const secondParsed = JSON.parse(second)
    expect(secondParsed.ok).toBe(true)
    expect(secondParsed.note).toMatch(/already blocked/)

    const client = fake._all('clients').find((r) => r.id === 'client_1')!
    expect(client.do_not_service).toBe(true)
    const noteLines = String(client.notes || '').split('\n').filter((l) => l.includes('[DNS'))
    expect(noteLines).toHaveLength(1)
  })
})

describe('deactivate_cleaner — duplicate call is a clear no-op', () => {
  it('second call reports already-inactive instead of silently re-writing', async () => {
    fake._seed('team_members', [{ id: 'cleaner_1', tenant_id: TENANT_ID, status: 'active' }])

    const first = await runTool('deactivate_cleaner', { cleaner_id: 'cleaner_1', reason: 'no-show' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(first).ok).toBe(true)
    expect(fake._all('team_members').find((r) => r.id === 'cleaner_1')!.status).toBe('inactive')

    const second = await runTool('deactivate_cleaner', { cleaner_id: 'cleaner_1', reason: 'no-show again' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const secondParsed = JSON.parse(second)
    expect(secondParsed.ok).toBe(true)
    expect(secondParsed.note).toMatch(/already inactive/)
    expect(fake._all('team_members').find((r) => r.id === 'cleaner_1')!.status).toBe('inactive')
  })
})

describe('trigger_cron — duplicate call within the cooldown window does not re-fire the cron', () => {
  it('only issues one real fetch to the cron endpoint for two rapid identical triggers', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    const first = await runTool('trigger_cron', { name: 'reminders' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(first).ok).toBe(true)

    const second = await runTool('trigger_cron', { name: 'reminders' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const secondParsed = JSON.parse(second)
    expect(secondParsed.ok).toBe(false)
    expect(secondParsed.error).toBe('cron_recently_triggered')

    // The real effect — a live cron fetch, which for reminders/outreach means
    // a bulk SMS/email blast — fired exactly once.
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('a different cron name is NOT blocked by another cron\'s cooldown', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    // Distinct names from the previous test's 'reminders' — the cooldown map
    // is a module-level singleton that persists across tests in this file.
    await runTool('trigger_cron', { name: 'payment-reminder' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const other = await runTool('trigger_cron', { name: 'confirmation-reminder' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(other).ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.unstubAllGlobals()
  })
})
