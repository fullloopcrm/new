import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item 3 of the Yinez hardening queue: ambiguous-request handling.
 *
 * Investigated first (see tools.ts's firstMissingRequiredIdField comment for
 * the full writeup): neither core.ts's detectIntent (always resolves to some
 * intent, never "unclear"), nor agent.ts's system prompt, nor tools.ts's
 * dispatcher had any confidence-threshold or clarification-request behavior.
 * Claude's tool-schema `required` array is only a hint to the model — it can
 * still emit a tool_use with a required id blank/omitted, and every handler
 * would previously just proceed (hitting "not found" downstream, or in a
 * couple of update-by-id handlers, writing against an undefined filter).
 *
 * This did NOT exist before — built here: dispatchTool now refuses BEFORE
 * running the handler when a tool's own schema marks an id-shaped field
 * (booking_id, client_id, cleaner_id, payout_id, schedule_id, deal_id,
 * application_id, notification_id) required and it's missing/blank, telling
 * the model to ask instead of guessing. Deliberately scoped to id fields
 * only — some non-id required fields (e.g. report_issue's "severity") have
 * a real default in the handler; a blanket "any required field missing"
 * check would false-positive on those, so this proves both sides: ids are
 * blocked, a schema-required-but-actually-optional field is not.
 */

const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
const coreHandleToolMock = vi.fn(async (..._args: unknown[]) => 'core handled it')
vi.mock('@/lib/selena/core', () => ({ handleTool: (...args: unknown[]) => coreHandleToolMock(...args), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
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
  coreHandleToolMock.mockClear()
})

describe('ambiguous-target guard — missing required id is refused, not guessed', () => {
  it('block_client without client_id is refused before any DB write', async () => {
    const out = await runTool('block_client', { reason: 'abusive' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('missing_required_field')
    expect(parsed.field).toBe('client_id')
    expect(fake._all('clients')).toHaveLength(0)
  })

  it('mark_payout_paid without payout_id is refused before any DB write', async () => {
    fake._seed('team_member_payouts', [{ id: 'payout-1', tenant_id: TENANT_ID, status: 'pending' }])
    const out = await runTool('mark_payout_paid', {}, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('missing_required_field')
    expect(parsed.field).toBe('payout_id')
    expect(fake._all('team_member_payouts').find((r) => r.id === 'payout-1')!.status).toBe('pending')
  })

  it('a client-bridged tool (cancel_booking) without booking_id is refused BEFORE reaching core.ts\'s handler', async () => {
    const out = await runTool('cancel_booking', { reason: 'change of plans' }, 'convo-1', 'client-phone', stubResult(), TENANT_ID)
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('missing_required_field')
    expect(parsed.field).toBe('booking_id')
    expect(coreHandleToolMock).not.toHaveBeenCalled()
  })

  it('CONTROL: cancel_booking WITH booking_id proceeds to the real handler', async () => {
    const out = await runTool('cancel_booking', { booking_id: 'bk-1', reason: 'change of plans' }, 'convo-1', 'client-phone', stubResult(), TENANT_ID)
    expect(out).toBe('core handled it')
    expect(coreHandleToolMock).toHaveBeenCalledTimes(1)
  })

  it('CONTROL: block_client WITH client_id proceeds normally', async () => {
    fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, do_not_service: false, notes: null, sms_consent: true }])
    const out = await runTool('block_client', { client_id: CLIENT_ID, reason: 'abusive' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const parsed = JSON.parse(out)
    expect(parsed.ok).toBe(true)
    expect(fake._all('clients').find((r) => r.id === CLIENT_ID)!.do_not_service).toBe(true)
  })

  it('report_issue without severity is NOT blocked — severity has a real default in the handler, unlike an id', async () => {
    const out = await runTool('report_issue', { description: 'cleaner was late' }, 'convo-1', 'client-phone', stubResult(), TENANT_ID)
    expect(out).toBe('core handled it')
    expect(coreHandleToolMock).toHaveBeenCalledTimes(1)
  })
})
