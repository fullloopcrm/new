/**
 * PATCH /api/dashboard/hr/[id]/documents — hr_documents.reviewed_at was
 * defined in the schema (053_hr_foundation.sql) but never written anywhere:
 * an operator approving or rejecting an employee's compliance document (CDL,
 * insurance, W-9, etc.) left zero audit trail of *when* it was reviewed.
 * reviewed_by is intentionally left alone here -- the caller's userId can be
 * 'admin' or a Clerk id, neither of which fits the UUID-typed column (the
 * same constraint hr_notes.ts already documents for author_id).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT_A = 'tenant-a'
const MEMBER_ID = 'member-1'
const DOC_ID = 'doc-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'admin', tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const patchReq = (body: unknown) => new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = Promise.resolve({ id: MEMBER_ID })

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [{ id: MEMBER_ID, tenant_id: TENANT_A }])
  fake._seed('hr_documents', [
    { id: DOC_ID, tenant_id: TENANT_A, team_member_id: MEMBER_ID, doc_type: 'cdl', status: 'submitted', reviewed_at: null },
  ])
})

describe('PATCH /api/dashboard/hr/[id]/documents — reviewed_at stamping', () => {
  it('stamps reviewed_at when a document is approved', async () => {
    const res = await PATCH(patchReq({ document_id: DOC_ID, status: 'approved' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.document.reviewed_at).not.toBeNull()
  })

  it('stamps reviewed_at when a document is rejected', async () => {
    const res = await PATCH(patchReq({ document_id: DOC_ID, status: 'rejected' }), { params })
    const body = await res.json()
    expect(body.document.reviewed_at).not.toBeNull()
  })

  it('does NOT stamp reviewed_at for a non-adjudicating status change', async () => {
    const res = await PATCH(patchReq({ document_id: DOC_ID, status: 'submitted' }), { params })
    const body = await res.json()
    expect(body.document.reviewed_at).toBeNull()
  })

  it('leaves reviewed_at untouched when status is not part of the patch', async () => {
    const res = await PATCH(patchReq({ document_id: DOC_ID, label: 'Commercial Driver License' }), { params })
    const body = await res.json()
    expect(body.document.reviewed_at).toBeNull()
    expect(body.document.label).toBe('Commercial Driver License')
  })
})
