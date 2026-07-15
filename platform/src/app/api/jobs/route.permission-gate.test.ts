import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/bookings, GET /api/bookings/[id], GET /api/jobs, GET+PATCH
 * /api/jobs/[id], POST /api/jobs/[id]/sessions, and PATCH+DELETE
 * /api/jobs/[id]/sessions/[sessionId] all called getTenantForRequest()
 * directly with zero requirePermission check — unlike their own siblings
 * (POST/PUT/DELETE /api/bookings already require bookings.create/edit/delete).
 * Any authenticated tenant member, regardless of the tenant's own bookings.view
 * RBAC override, could list/read every booking or job (full client PII +
 * team member phone/email + payment rollups) or mutate job status, create a
 * scheduling session, or move/reassign/cancel one — same bug class already
 * fixed on a sibling branch (p1-w3, commit f04ca573) but never ported here.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/jobs', () => ({
  logJobEvent: vi.fn(async () => {}),
  releasePaymentsForEvent: vi.fn(async () => {}),
  shapeSession: (b: Record<string, unknown>) => ({ id: b.id, status: b.status }),
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

const FORBIDDEN = { tenant: null, error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) }
const allow = () => ({ tenant: { tenantId: h.tenantId }, error: null })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => allow())
  h.store = {
    jobs: [
      { id: 'job-A1', tenant_id: 'tenant-A', title: 'Deck build', status: 'scheduled', total_cents: 50000, created_at: '2026-01-01', client_id: 'client-A1' },
    ],
    job_payments: [],
    job_events: [],
    bookings: [],
    clients: [{ id: 'client-A1', tenant_id: 'tenant-A', name: 'Pat' }],
    team_members: [],
    crews: [],
    booking_assignees: [],
  }
})

describe('GET /api/jobs — bookings.view permission gate', () => {
  it('returns the permission error unchanged and never reads jobs when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { GET } = await import('./route')

    const res = await GET()

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('bookings.view')
  })

  it('allows the call through and returns tenant-scoped jobs when granted', async () => {
    const { GET } = await import('./route')

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.jobs).toHaveLength(1)
  })
})

describe('GET /api/jobs/[id] — bookings.view permission gate', () => {
  it('returns the permission error unchanged when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { GET } = await import('./[id]/route')

    const res = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'job-A1' }) })

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('bookings.view')
  })

  it('allows the call through when granted', async () => {
    const { GET } = await import('./[id]/route')

    const res = await GET(new Request('http://x'), { params: Promise.resolve({ id: 'job-A1' }) })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.job.id).toBe('job-A1')
  })
})

describe('PATCH /api/jobs/[id] — bookings.edit permission gate', () => {
  const req = () => new Request('http://x', { method: 'PATCH', body: JSON.stringify({ notes: 'hi' }) })

  it('returns the permission error unchanged and never mutates the job when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { PATCH } = await import('./[id]/route')

    const res = await PATCH(req(), { params: Promise.resolve({ id: 'job-A1' }) })

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('bookings.edit')
    expect(h.store.jobs[0].notes).toBeUndefined()
  })

  it('allows the mutation through when granted', async () => {
    const { PATCH } = await import('./[id]/route')

    const res = await PATCH(req(), { params: Promise.resolve({ id: 'job-A1' }) })

    expect(res.status).toBe(200)
    expect(h.store.jobs[0].notes).toBe('hi')
  })
})

describe('POST /api/jobs/[id]/sessions — bookings.create permission gate', () => {
  const req = () => new Request('http://x', { method: 'POST', body: JSON.stringify({ start_time: '2026-08-15T09:00:00' }) })

  it('returns the permission error unchanged and never creates a session when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { POST } = await import('./[id]/sessions/route')

    const res = await POST(req(), { params: Promise.resolve({ id: 'job-A1' }) })

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('bookings.create')
    expect(h.store.bookings.length).toBe(0)
  })

  it('allows session creation through when granted', async () => {
    const { POST } = await import('./[id]/sessions/route')

    const res = await POST(req(), { params: Promise.resolve({ id: 'job-A1' }) })

    expect(res.status).toBe(200)
    expect(h.store.bookings.length).toBe(1)
  })
})

describe('PATCH /api/jobs/[id]/sessions/[sessionId] — bookings.edit permission gate', () => {
  beforeEach(() => {
    h.store.bookings = [{ id: 'sess-1', tenant_id: 'tenant-A', job_id: 'job-A1', start_time: '2026-08-15T09:00:00Z', end_time: '2026-08-15T11:00:00Z', status: 'confirmed' }]
  })
  const req = () => new Request('http://x', { method: 'PATCH', body: JSON.stringify({ notes: 'moved' }) })

  it('returns the permission error unchanged and never mutates the session when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { PATCH } = await import('./[id]/sessions/[sessionId]/route')

    const res = await PATCH(req(), { params: Promise.resolve({ id: 'job-A1', sessionId: 'sess-1' }) })

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('bookings.edit')
    expect(h.store.bookings[0].notes).toBeUndefined()
  })

  it('allows the mutation through when granted', async () => {
    const { PATCH } = await import('./[id]/sessions/[sessionId]/route')

    const res = await PATCH(req(), { params: Promise.resolve({ id: 'job-A1', sessionId: 'sess-1' }) })

    expect(res.status).toBe(200)
    expect(h.store.bookings[0].notes).toBe('moved')
  })
})

describe('DELETE /api/jobs/[id]/sessions/[sessionId] — bookings.delete permission gate', () => {
  beforeEach(() => {
    h.store.bookings = [{ id: 'sess-1', tenant_id: 'tenant-A', job_id: 'job-A1', start_time: '2026-08-15T09:00:00Z', end_time: '2026-08-15T11:00:00Z', status: 'confirmed' }]
  })

  it('returns the permission error unchanged and never deletes the session when denied', async () => {
    h.requirePermission.mockResolvedValueOnce(FORBIDDEN)
    const { DELETE } = await import('./[id]/sessions/[sessionId]/route')

    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'job-A1', sessionId: 'sess-1' }) })

    expect(res.status).toBe(403)
    expect(h.requirePermission).toHaveBeenCalledWith('bookings.delete')
    expect(h.store.bookings.length).toBe(1)
  })

  it('allows the deletion through when granted', async () => {
    const { DELETE } = await import('./[id]/sessions/[sessionId]/route')

    const res = await DELETE(new Request('http://x'), { params: Promise.resolve({ id: 'job-A1', sessionId: 'sess-1' }) })

    expect(res.status).toBe(200)
    expect(h.store.bookings.length).toBe(0)
  })
})
