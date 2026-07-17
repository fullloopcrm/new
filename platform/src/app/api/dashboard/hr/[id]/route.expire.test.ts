/**
 * Fresh-ground fix: hr_documents.status='expired' is a real CHECK-constraint
 * value (migration 053) and this very page's own client component (DocRow
 * in dashboard/hr/[id]/page.tsx) already computes an "expired"/"expiring
 * soon" badge independently by comparing expires_on to Date.now() — never
 * from `status` — because nothing in the codebase ever wrote the
 * transition. Same declared-but-never-written shape as (148)'s
 * documents.status='expired'. Fixed the same way: an on-read lazy-expire
 * check, here on the GET this page hits every time an operator opens an
 * employee's HR detail. Scoped to the statuses still open to renewal
 * ('pending'/'submitted'/'approved') so an already-'rejected' doc isn't
 * relabeled by an unrelated expiry date.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_A = 'tenant-A'
const MEMBER_ID = 'tm-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function baseDoc(over: Record<string, unknown>) {
  return {
    id: 'doc-default', tenant_id: TENANT_A, team_member_id: MEMBER_ID, doc_type: 'id',
    label: 'Driver License', status: 'approved', file_url: null, issued_on: null,
    expires_on: null, reviewed_by: null, reviewed_at: null,
    created_at: '2019-01-01T00:00:00Z', updated_at: '2019-01-01T00:00:00Z',
    ...over,
  }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_A
  fake._seed('team_members', [
    { id: MEMBER_ID, tenant_id: TENANT_A, name: 'Alex Rivera', email: null, phone: null, role: 'cleaner', active: true, address: null, photo_url: null, stripe_account_id: null, stripe_ready_at: null },
  ])
})

describe('GET /api/dashboard/hr/[id] — lazy-expires overdue hr_documents on read', () => {
  it("flips an 'approved' document past its expires_on to 'expired' and persists it", async () => {
    fake._seed('hr_documents', [baseDoc({ id: 'doc-1', status: 'approved', expires_on: '2020-01-01' })])

    const res = await GET(new Request('http://x') as unknown as import('next/server').NextRequest, paramsFor(MEMBER_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.documents).toHaveLength(1)
    expect(body.documents[0].status).toBe('expired')
    expect(fake._all('hr_documents')[0].status).toBe('expired')
  })

  it("does not touch a 'rejected' document even when its expires_on has passed", async () => {
    fake._seed('hr_documents', [baseDoc({ id: 'doc-2', status: 'rejected', expires_on: '2020-01-01' })])

    const res = await GET(new Request('http://x') as unknown as import('next/server').NextRequest, paramsFor(MEMBER_ID))
    const body = await res.json()
    expect(body.documents[0].status).toBe('rejected')
    expect(fake._all('hr_documents')[0].status).toBe('rejected')
  })

  it('does not expire a document whose expires_on is still in the future', async () => {
    fake._seed('hr_documents', [baseDoc({ id: 'doc-3', status: 'submitted', expires_on: '2099-01-01' })])

    const res = await GET(new Request('http://x') as unknown as import('next/server').NextRequest, paramsFor(MEMBER_ID))
    const body = await res.json()
    expect(body.documents[0].status).toBe('submitted')
  })

  it('does not touch a document with no expires_on set', async () => {
    fake._seed('hr_documents', [baseDoc({ id: 'doc-4', status: 'approved', expires_on: null })])

    const res = await GET(new Request('http://x') as unknown as import('next/server').NextRequest, paramsFor(MEMBER_ID))
    const body = await res.json()
    expect(body.documents[0].status).toBe('approved')
  })
})
