/**
 * GET/POST /api/dashboard/hr/requirements — the tenant's HR document-
 * requirement template. Previously there was no write path at all: a
 * dumpster/moving/towing tenant that needed to add a trade-specific doc (CDL,
 * applicator license, etc.) had no way to do it short of a manual DB write —
 * every tenant was stuck on the generic 6-doc DEFAULT_HR_DOC_REQUIREMENTS
 * checklist forever. POST adds this write path.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT_A = 'tenant-a'
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'admin' } }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('hr_document_requirements', 'doc_type')
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentRole.value = 'admin'
})

const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/dashboard/hr/requirements', () => {
  it('creates a trade-specific requirement (e.g. CDL for a dumpster tenant)', async () => {
    const res = await POST(postReq({ doc_type: 'CDL', label: 'Commercial Driver License', applies_to: 'all', has_expiry: true }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.requirement.doc_type).toBe('cdl')
    expect(body.requirement.label).toBe('Commercial Driver License')
    expect(body.requirement.has_expiry).toBe(true)
    expect(body.requirement.tenant_id).toBe(TENANT_A)
  })

  it('slugifies doc_type to a stable lookup key', async () => {
    const res = await POST(postReq({ doc_type: '  Pesticide Applicator License! ', label: 'Applicator License' }))
    const body = await res.json()
    expect(body.requirement.doc_type).toBe('pesticide_applicator_license')
  })

  it('defaults required=true and applies_to=all when omitted', async () => {
    const res = await POST(postReq({ doc_type: 'insurance_cert', label: 'Insurance Certificate' }))
    const body = await res.json()
    expect(body.requirement.required).toBe(true)
    expect(body.requirement.applies_to).toBe('all')
  })

  it('rejects a missing doc_type', async () => {
    const res = await POST(postReq({ label: 'No type' }))
    expect(res.status).toBe(400)
  })

  it('rejects a missing label', async () => {
    const res = await POST(postReq({ doc_type: 'cdl' }))
    expect(res.status).toBe(400)
  })

  it('rejects an invalid applies_to instead of silently coercing it', async () => {
    const res = await POST(postReq({ doc_type: 'cdl', label: 'CDL', applies_to: 'everyone' }))
    const body = await res.json()
    expect(body.requirement.applies_to).toBe('all')
  })

  it('409s a duplicate doc_type for the same tenant', async () => {
    await POST(postReq({ doc_type: 'cdl', label: 'CDL' }))
    const res = await POST(postReq({ doc_type: 'cdl', label: 'CDL again' }))
    expect(res.status).toBe(409)
  })

  it('403s a staff member (no team.edit)', async () => {
    currentRole.value = 'staff'
    const res = await POST(postReq({ doc_type: 'cdl', label: 'CDL' }))
    expect(res.status).toBe(403)
    expect((fake._store.get('hr_document_requirements') || []).length).toBe(0)
  })
})

describe('GET /api/dashboard/hr/requirements', () => {
  it('lists the tenant template ordered by sort_order', async () => {
    fake._seed('hr_document_requirements', [
      { id: 'r2', tenant_id: TENANT_A, doc_type: 'w4', label: 'W-4', sort_order: 20 },
      { id: 'r1', tenant_id: TENANT_A, doc_type: 'w9', label: 'W-9', sort_order: 10 },
    ])
    const res = await GET()
    const body = await res.json()
    expect(body.requirements.map((r: { doc_type: string }) => r.doc_type)).toEqual(['w9', 'w4'])
  })
})
