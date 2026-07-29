import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * executeTool() is the single dispatcher every admin AI-chat tool call goes
 * through (the POST loop in this file calls nothing else). This proves it
 * now writes one audit_logs row per call (action 'admin_ai_chat.tool_call'),
 * and — the one thing worth pinning down specifically here — that
 * update_client does NOT get double-logged: it already had its own inline
 * audit() call (action 'client.updated') before this phase, and this test
 * confirms a successful update_client call still produces exactly one row
 * total (the pre-existing 'client.updated' one, not a second generic one),
 * while a failing tool call of any other kind still gets its own generic row.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/anthropic-client', () => ({ anthropicFromStoredKey: vi.fn() }))
vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => {}) }))

import { executeTool } from './route'

function auditRows() {
  return (h.store.audit_logs || []) as Array<Record<string, unknown>>
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    clients: [{ id: 'client-A1', tenant_id: 'tenant-A', name: 'Old Name' }],
  }
})

describe('admin/ai-chat executeTool writes to audit_logs', () => {
  it('a successful update_client call is not double-logged — only its pre-existing client.updated row exists', async () => {
    await executeTool('tenant-A', 'update_client', { client_id: 'client-A1', updates: { name: 'New Name' } }, 'owner', null)

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ tenant_id: 'tenant-A', action: 'client.updated', entity_type: 'client', entity_id: 'client-A1' })
  })

  it('a different tool call (get_client_details) writes a generic admin_ai_chat.tool_call row', async () => {
    await executeTool('tenant-A', 'get_client_details', { client_id: 'client-A1' }, 'owner', null)

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ tenant_id: 'tenant-A', action: 'admin_ai_chat.tool_call', entity_type: 'get_client_details', entity_id: 'client-A1' })
    const details = rows[0].details as Record<string, unknown>
    expect(details).toMatchObject({ actor: 'agent', role: 'owner', success: true })
  })

  it('a permission-denied tool call still gets audited, with success:false', async () => {
    await executeTool('tenant-A', 'update_client', { client_id: 'client-A1', updates: { name: 'Blocked' } }, 'staff', null)

    const rows = auditRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ tenant_id: 'tenant-A', action: 'admin_ai_chat.tool_call', entity_type: 'update_client' })
    const details = rows[0].details as Record<string, unknown>
    expect(details.success).toBe(false)
    expect(h.store.clients[0].name).toBe('Old Name') // nothing actually mutated
  })
})
