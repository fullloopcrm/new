import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * DELETE hard-removes a team_members row. payroll_payments and hr_documents
 * both carry ON DELETE CASCADE (migrations 008, 053) -- with no guard, this
 * silently destroyed real paid-payroll records and filed compliance docs.
 */

const TENANT = 'tenant-a'
const MEMBER = 'member-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x/api/team/member-1', { method: 'DELETE' })
const ctx = { params: Promise.resolve({ id: MEMBER }) }

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [{ id: MEMBER, tenant_id: TENANT, name: 'Jane' }])
})

describe('DELETE /api/team/[id] — payroll/HR history guard', () => {
  it('409s instead of deleting when the member has payroll history', async () => {
    fake._seed('payroll_payments', [{ id: 'pp-1', tenant_id: TENANT, team_member_id: MEMBER, amount: 5000 }])
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(409)
    expect(fake._all('team_members')).toHaveLength(1)
  })

  it('409s instead of deleting when the member has HR documents on file', async () => {
    fake._seed('hr_documents', [{ id: 'hd-1', tenant_id: TENANT, team_member_id: MEMBER, doc_type: 'w9', status: 'submitted' }])
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(409)
    expect(fake._all('team_members')).toHaveLength(1)
  })

  it('deletes a clean team member with no payroll/HR history', async () => {
    const res = await DELETE(req(), ctx)
    expect(res.status).toBe(200)
    expect(fake._all('team_members')).toHaveLength(0)
  })
})
