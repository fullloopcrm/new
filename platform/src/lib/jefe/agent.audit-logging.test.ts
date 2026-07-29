import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * runTool() is the single dispatcher every Jefe tool call goes through
 * (askJefe's loop calls nothing else). Jefe had zero audit logging before
 * phase3. Unlike the tenant-scoped engines, Jefe is platform-level — most of
 * its tools (get_platform_health, list_tasks, un-scoped create_task/
 * retry_failed_notifications, ack_issue) have no single owning tenant, and
 * audit_logs.tenant_id is NOT NULL/FK'd, so those calls are deliberately NOT
 * audited (nothing honest to put in that column). Tools that resolve to a
 * real tenant (via the `tenant` slug/name argument, e.g. provision_checklist)
 * DO get audited. This test proves both halves of that split.
 */

const TENANT_ID = 'tenant-acme-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake }
})
vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './agent'

const fake = supabaseAdmin as unknown as FakeSupabase

function auditRows() {
  return fake._all('audit_logs')
}

beforeEach(() => {
  fake._store.clear()
})

describe('Jefe tool calls write to audit_logs', () => {
  it('a tenant-scoped tool call (resolves via the tenant slug argument) writes a jefe.tool_call row', async () => {
    fake._seed('tenants', [{ id: TENANT_ID, name: 'Acme Cleaning', slug: 'acme', status: 'active' }])

    const out = await runTool('provision_checklist', { tenant: 'acme' })
    expect(JSON.parse(out)).toMatchObject({ ok: true, tenant: 'Acme Cleaning' })

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ tenant_id: TENANT_ID, action: 'jefe.tool_call', entity_type: 'provision_checklist' })
    const details = rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({ actor: 'jefe', success: true })
  })

  it('a platform-level tool call with no single owning tenant (list_tasks) writes NO audit_logs row', async () => {
    const out = await runTool('list_tasks', {})
    expect(JSON.parse(out)).toMatchObject({ ok: true })

    expect(auditRows()).toHaveLength(0)
  })
})
