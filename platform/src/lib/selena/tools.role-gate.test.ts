import { describe, it, expect, vi } from 'vitest'

/**
 * runTool's optional role-gate (2026-07-28, #3 prep) — proves it's real, not
 * just present in the diff. Undefined role (every existing caller) must be
 * completely unaffected — covered by the unchanged 174 tests elsewhere in
 * this directory. This file proves the NEW behavior: when a role IS passed,
 * a tool mapped in SHARED_TOOL_PERMISSIONS is denied to a role that lacks it.
 */

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => ({}) } }))
vi.mock('@/lib/selena/agent', () => ({ isOwnerOfTenant: vi.fn(async () => false) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => 'tenant-1' }))

import { runTool } from './tools'
import type { YinezResult } from './agent'

describe('runTool — optional dashboard-role permission gate', () => {
  it('denies a role that lacks the required permission for a mapped tool', async () => {
    const result: YinezResult = { text: '', toolsCalled: [] }
    const out = await runTool('update_booking', { booking_id: 'b1', fields: {} }, 'convo-1', null, result, 'tenant-1', 'staff')
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('permission_denied')
  })

  it('is a no-op for existing callers that never pass a role (unaffected by this gate)', async () => {
    // isOwnerOfTenant is mocked false, so with no role the OWNER-ONLY gate
    // (unchanged) is what denies this — proving the role-gate above didn't
    // silently absorb or bypass the pre-existing behavior.
    const result: YinezResult = { text: '', toolsCalled: [] }
    const out = await runTool('update_booking', { booking_id: 'b1', fields: {} }, 'convo-1', null, result, 'tenant-1')
    const parsed = JSON.parse(out)
    expect(parsed.error).toBe('owner_only_tool')
  })
})
