/**
 * PUT /api/dashboard/hr/requirements/[id] — edit an existing HR document
 * requirement (e.g. flip a trade-specific doc between required/optional, add
 * an expiry, or fix a typo'd label). Companion to POST on the collection
 * route; together they close the "no code path to add/edit a trade-specific
 * hr_document_requirements row" gap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const REQ_ID = 'req-1'
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
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const putReq = (body: unknown) => new NextRequest('http://x', { method: 'PUT', body: JSON.stringify(body) })
const params = Promise.resolve({ id: REQ_ID })

beforeEach(() => {
  fake._store.clear()
  currentRole.value = 'admin'
  fake._seed('hr_document_requirements', [
    { id: REQ_ID, tenant_id: TENANT_A, doc_type: 'cdl', label: 'CDL', applies_to: 'all', required: true, has_expiry: false, sort_order: 70 },
    { id: 'other-tenant-req', tenant_id: TENANT_B, doc_type: 'cdl', label: 'CDL (tenant B)', applies_to: 'all', required: true, has_expiry: false, sort_order: 70 },
  ])
})

describe('PUT /api/dashboard/hr/requirements/[id]', () => {
  it('updates required/has_expiry on an existing requirement', async () => {
    const res = await PUT(putReq({ required: false, has_expiry: true }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requirement.required).toBe(false)
    expect(body.requirement.has_expiry).toBe(true)
    expect(body.requirement.label).toBe('CDL') // untouched field survives a partial PUT
  })

  it('leaves fields not present in the body untouched', async () => {
    await PUT(putReq({ label: 'Commercial Driver License' }), { params })
    const row = (fake._store.get('hr_document_requirements') || []).find(r => r.id === REQ_ID)
    expect(row?.label).toBe('Commercial Driver License')
    expect(row?.applies_to).toBe('all')
    expect(row?.required).toBe(true)
  })

  it('404s a requirement id that belongs to a different tenant', async () => {
    const res = await PUT(putReq({ required: false }), { params: Promise.resolve({ id: 'other-tenant-req' }) })
    expect(res.status).toBe(404)
    const otherRow = (fake._store.get('hr_document_requirements') || []).find(r => r.id === 'other-tenant-req')
    expect(otherRow?.required).toBe(true) // untouched
  })

  it('404s an unknown id', async () => {
    const res = await PUT(putReq({ required: false }), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })

  it('rejects an empty label instead of writing a blank', async () => {
    const res = await PUT(putReq({ label: '   ' }), { params })
    expect(res.status).toBe(400)
  })

  it('rejects an invalid applies_to', async () => {
    const res = await PUT(putReq({ applies_to: 'everyone' }), { params })
    expect(res.status).toBe(400)
  })

  it('403s a staff member (no team.edit), row untouched', async () => {
    currentRole.value = 'staff'
    const res = await PUT(putReq({ required: false }), { params })
    expect(res.status).toBe(403)
    const row = (fake._store.get('hr_document_requirements') || []).find(r => r.id === REQ_ID)
    expect(row?.required).toBe(true)
  })
})
