import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * runLegacyTool() is the single dispatcher every legacy Selena (SMS/web/
 * email) tool call goes through — askSelena's tool loop calls nothing else
 * (see selena-legacy.ts, the dispatchLegacyTool/runLegacyTool split mirrors
 * Yinez's dispatchTool/runTool in src/lib/selena/tools.ts). This engine had
 * zero audit logging before phase3 — this proves the wrapper now writes a
 * real audit_logs row per call, using the REAL audit() function (not
 * mocked) against the fake Supabase store.
 */

const TENANT_ID = 'tenant-legacy-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { runLegacyTool, EMPTY_CHECKLIST, type SelenaResult } from './selena-legacy'

const fake = supabaseAdmin as unknown as FakeSupabase

function stubResult(): SelenaResult {
  return { text: '', checklist: EMPTY_CHECKLIST }
}

function auditRows() {
  return fake._all('audit_logs')
}

beforeEach(() => {
  fake._store.clear()
})

describe('Legacy Selena tool calls write to audit_logs', () => {
  it('writes one audit_logs row for a tool call, with the selena_legacy.tool_call action', async () => {
    fake._seed('sms_conversations', [{ id: 'convo-1', tenant_id: TENANT_ID, client_id: 'client-1', name: 'Jane', phone: '5551234' }])

    const out = await runLegacyTool('report_issue', TENANT_ID, { description: 'sink is leaking' }, 'convo-1', stubResult())
    expect(JSON.parse(out)).toMatchObject({ success: true })

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenant_id: TENANT_ID,
      action: 'selena_legacy.tool_call',
      entity_type: 'report_issue',
    })
    const details = rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({ actor: 'agent', conversation_id: 'convo-1', success: true })
  })

  it('still writes an audit_logs row when the tool call errors, with success:false and the error captured', async () => {
    // No sms_conversations row seeded for this convo id — getConvoClientId()
    // resolves to null, so handleRescheduleBooking deterministically returns
    // {error: 'No account found'} before touching bookings at all.
    const out = await runLegacyTool('reschedule_booking', TENANT_ID, { booking_id: '11111111-1111-4111-8111-111111111111' }, 'convo-missing', stubResult())
    expect(JSON.parse(out)).toMatchObject({ error: 'No account found' })

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ tenant_id: TENANT_ID, action: 'selena_legacy.tool_call', entity_type: 'reschedule_booking' })
    const details = rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({ success: false, error: 'No account found' })
  })
})
