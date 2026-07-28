import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * runTool() is the single dispatcher every Yinez tool call goes through
 * (client tools bridged to core.ts's handleTool, plus the 53 owner/other
 * tools handled directly in tools.ts's switch — 64 distinct tool names
 * total). This proves it writes a real audit_logs row for a representative
 * sample of that surface: a client-facing tool, an owner-facing tool with a
 * real target id, and an owner-only tool a non-owner caller was blocked
 * from — using the REAL audit() function (not mocked) against the fake
 * Supabase store, so the assertions are on actual inserted rows.
 */

const TENANT_ID = 'tenant-1'
const CLEANER_ID = '11111111-1111-4111-8111-111111111111'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
let isOwner = true
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: async () => isOwner }))
vi.mock('@/lib/selena/core', () => ({ handleTool: vi.fn(async () => 'remembered'), EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_ID) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) }))
vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'

const fake = supabaseAdmin as unknown as FakeSupabase

function stubResult() {
  return { text: '', checklist: {} } as unknown as Parameters<typeof runTool>[4]
}

function auditRows() {
  return fake._all('audit_logs')
}

beforeEach(() => {
  fake._store.clear()
  isOwner = true
})

describe('Yinez tool calls write to audit_logs', () => {
  it('a client-facing tool (bridged to core.ts) is audited as client-initiated', async () => {
    await runTool('remember', { content: 'likes eco products', type: 'preference' }, 'convo-1', 'client-phone', stubResult(), TENANT_ID)

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenant_id: TENANT_ID,
      action: 'yinez.tool_call',
      entity_type: 'remember',
    })
    const details = rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({
      actor: 'agent',
      on_behalf_of: 'client',
      conversation_id: 'convo-1',
      phone: 'client-phone',
      success: true,
    })
  })

  it('an owner-facing tool (tools.ts switch) is audited with actor=agent, on_behalf_of=owner, and a real target entity_id', async () => {
    fake._seed('team_members', [{ id: CLEANER_ID, tenant_id: TENANT_ID, status: 'active' }])
    isOwner = true

    await runTool('deactivate_cleaner', { cleaner_id: CLEANER_ID, reason: 'no-show' }, 'convo-2', 'owner-phone', stubResult(), TENANT_ID)

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenant_id: TENANT_ID,
      action: 'yinez.tool_call',
      entity_type: 'deactivate_cleaner',
      entity_id: CLEANER_ID,
    })
    const details = rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({ actor: 'agent', on_behalf_of: 'owner', success: true })
  })

  it('a blocked owner-only tool attempt by a non-owner caller is still audited, distinctly', async () => {
    isOwner = false

    const out = await runTool('deactivate_cleaner', { cleaner_id: CLEANER_ID, reason: 'no-show' }, 'convo-3', 'random-client-phone', stubResult(), TENANT_ID)
    expect(JSON.parse(out).error).toBe('owner_only_tool')

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].action).toBe('yinez.tool_blocked')
    const details = rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({ actor: 'agent', on_behalf_of: 'blocked_non_owner', success: false, error: 'owner_only_tool' })

    // Nothing actually mutated — the block happened before any write.
    expect(fake._all('team_members')).toHaveLength(0)
  })

  it('a representative sample of distinct tool names each produce their own row (one row per call, not shared/batched)', async () => {
    fake._seed('team_members', [{ id: CLEANER_ID, tenant_id: TENANT_ID, status: 'active' }])
    fake._seed('clients', [{ id: 'client-a', tenant_id: TENANT_ID, do_not_service: false, notes: null, sms_consent: true }])

    await runTool('remember', { content: 'x', type: 'observation' }, 'convo-4', 'client-phone', stubResult(), TENANT_ID)
    await runTool('list_cleaners', { status: 'all' }, 'convo-4', 'owner-phone', stubResult(), TENANT_ID)
    await runTool('block_client', { client_id: 'client-a', reason: 'test' }, 'convo-4', 'owner-phone', stubResult(), TENANT_ID)

    const rows = auditRows()
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.entity_type).sort()).toEqual(['block_client', 'list_cleaners', 'remember'])
    for (const row of rows) {
      // Actor attribution, action, target, and timestamp column are all present
      // on every row — created_at itself is a DB-level DEFAULT NOW() (migration
      // 005_audit_logs.sql), not re-verified here since the in-memory fake
      // doesn't simulate column defaults; audit.ts's insert doesn't override it.
      expect(row.action).toMatch(/^yinez\.tool_(call|blocked)$/)
      expect(typeof row.entity_type).toBe('string')
      expect(row.tenant_id).toBe(TENANT_ID)
      const details = row.details as Record<string, unknown>
      expect(details.actor).toBe('agent')
      expect(['owner', 'client', 'blocked_non_owner']).toContain(details.on_behalf_of)
    }
  })
})
