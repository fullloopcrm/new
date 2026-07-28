import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Actor attribution for Yinez owner-tool calls. Before this, none of the 53
 * owner-gated tools (assign_cleaner_to_booking, block_client,
 * mark_payout_paid, trigger_cron, etc.) wrote any record identifying that
 * YINEZ — as opposed to a human via the dashboard — performed the action.
 * The DB-trigger audit_log (migrations/035_close_audit.sql) only covers 12
 * finance tables and never sets actor_id regardless. runTool() is the single
 * choke point every owner tool passes through, so logging there covers all
 * of them from one call site.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => true }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => ''), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'

const TENANT_ID = 'tenant-audit-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function stubResult() {
  return { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]
}

beforeEach(() => {
  fake._store.clear()
})

describe('Yinez owner-tool actor attribution', () => {
  it('logs an audit_log row identifying yinez as the actor after a plain owner tool call', async () => {
    await runTool('get_today_summary', {}, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const rows = fake._all('audit_log')
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe(TENANT_ID)
    expect(rows[0].table_name).toBe('yinez_tool_call')
    expect((rows[0].new_data as Record<string, unknown>).actor).toBe('yinez')
    expect((rows[0].new_data as Record<string, unknown>).tool).toBe('get_today_summary')
  })

  it('logs the actual input args so a reviewer can see what was called with', async () => {
    await runTool('block_client', { client_id: 'cl-1', reason: 'nonpayment' }, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    const rows = fake._all('audit_log')
    expect(rows).toHaveLength(1)
    const newData = rows[0].new_data as Record<string, unknown>
    expect(newData.tool).toBe('block_client')
    expect(newData.input).toEqual({ client_id: 'cl-1', reason: 'nonpayment' })
  })

  it('still returns the tool result even if the audit-log write itself fails', async () => {
    const originalFrom = fake.from.bind(fake)
    fake.from = ((table: string) => {
      if (table === 'audit_log') {
        return { insert: () => Promise.resolve({ data: null, error: { message: 'db down' } }) } as unknown as ReturnType<typeof fake.from>
      }
      return originalFrom(table)
    }) as typeof fake.from
    const out = await runTool('get_today_summary', {}, 'convo-1', 'owner-phone', stubResult(), TENANT_ID)
    expect(out).toBeDefined()
    fake.from = originalFrom
  })

  it('does NOT log a client-facing tool call (recap/booking flow) as an owner-tool audit entry', async () => {
    await runTool('resend_confirmation', {}, 'convo-1', null, stubResult(), TENANT_ID)
    expect(fake._all('audit_log')).toHaveLength(0)
  })
})
