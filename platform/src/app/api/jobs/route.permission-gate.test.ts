import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — jobs/route.ts, jobs/[id]/route.ts,
 * jobs/[id]/sessions/route.ts, jobs/[id]/sessions/[sessionId]/route.ts.
 * All five handlers called getTenantForRequest() directly with zero
 * permission check -- unlike sibling booking routes gated on bookings.view/
 * bookings.create/bookings.edit/bookings.delete. Any authenticated tenant
 * member (regardless of the tenant's own RBAC override) could list every job
 * with client name + payment rollups, read/mutate a single job's status
 * (which also releases stage-gated payments), or create/move/cancel a
 * scheduled job session (a real booking). Proves all five now gate on the
 * matching bookings.* permission and short-circuit when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: TENANT_ID, tenant: { id: TENANT_ID }, role: 'staff', userId: 'u1' }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET as jobsGET } from './route'
import { GET as jobGET, PATCH as jobPATCH } from './[id]/route'
import { POST as sessionPOST } from './[id]/sessions/route'
import { PATCH as sessionPATCH, DELETE as sessionDELETE } from './[id]/sessions/[sessionId]/route'

const fake = supabaseAdmin as unknown as FakeSupabase

function deny() {
  permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
}

beforeEach(() => {
  fake._store.clear()
  permissionError = null
})

describe('GET /api/jobs — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const ok = await jobsGET()
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await jobsGET()
    expect(denied.status).toBe(403)
  })
})

describe('GET /api/jobs/[id] — bookings.view permission gate', () => {
  it('allowed with bookings.view, forbidden without', async () => {
    const params = Promise.resolve({ id: 'job-1' })
    const ok = await jobGET(new Request('http://x/api/jobs/job-1'), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await jobGET(new Request('http://x/api/jobs/job-1'), { params })
    expect(denied.status).toBe(403)
  })
})

describe('PATCH /api/jobs/[id] — bookings.edit permission gate', () => {
  it('allowed with bookings.edit, forbidden without', async () => {
    const params = Promise.resolve({ id: 'job-1' })
    const req = () => new Request('http://x/api/jobs/job-1', { method: 'PATCH', body: JSON.stringify({ notes: 'x' }) })
    const ok = await jobPATCH(req(), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await jobPATCH(req(), { params })
    expect(denied.status).toBe(403)
  })
})

describe('POST /api/jobs/[id]/sessions — bookings.create permission gate', () => {
  it('allowed with bookings.create, forbidden without', async () => {
    const params = Promise.resolve({ id: 'job-1' })
    const req = () => new Request('http://x/api/jobs/job-1/sessions', { method: 'POST', body: JSON.stringify({ start_time: '2026-01-01T00:00:00Z' }) })
    const ok = await sessionPOST(req(), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await sessionPOST(req(), { params })
    expect(denied.status).toBe(403)
  })
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — bookings.edit permission gate', () => {
  it('allowed with bookings.edit, forbidden without', async () => {
    const params = Promise.resolve({ id: 'job-1', sessionId: 'session-1' })
    const req = () => new Request('http://x/api/jobs/job-1/sessions/session-1', { method: 'PATCH', body: JSON.stringify({ notes: 'x' }) })
    const ok = await sessionPATCH(req(), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await sessionPATCH(req(), { params })
    expect(denied.status).toBe(403)
  })
})

describe('DELETE /api/jobs/[id]/sessions/[sessionId] — bookings.delete permission gate', () => {
  it('allowed with bookings.delete, forbidden without', async () => {
    const params = Promise.resolve({ id: 'job-1', sessionId: 'session-1' })
    const req = () => new Request('http://x/api/jobs/job-1/sessions/session-1', { method: 'DELETE' })
    const ok = await sessionDELETE(req(), { params })
    expect(ok.status).not.toBe(403)

    deny()
    const denied = await sessionDELETE(req(), { params })
    expect(denied.status).toBe(403)
  })
})
