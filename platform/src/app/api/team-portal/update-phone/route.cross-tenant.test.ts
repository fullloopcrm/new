/**
 * POST /api/team-portal/update-phone — cleaner_applications cross-tenant leak.
 *
 * cleaner_applications is a tenant-scoped table and email is NOT unique
 * across tenants (the same applicant can apply to more than one Full Loop
 * business). This route updates it via supabaseAdmin (service-role, bypasses
 * RLS), so the query itself must filter tenant_id -- one forgotten filter is
 * a data leak (see src/lib/tenant-db.ts's own warning). Before the fix, the
 * update matched on email only and would silently overwrite a same-email
 * applicant row belonging to a completely different tenant.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'crypto'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.ADMIN_PASSWORD = 'test-admin-password'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake }
})

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const SHARED_EMAIL = 'applicant@example.com'

function sign(payload: string): string {
  return crypto.createHmac('sha256', process.env.ADMIN_PASSWORD!).update(payload).digest('hex')
}

function tokenFor(teamMemberId: string, ttlMs = 15 * 60 * 1000): string {
  const expiry = Date.now() + ttlMs
  const payload = `${teamMemberId}.${expiry}`
  return `${teamMemberId}.${expiry}.${sign(payload)}`
}

function postReq(body: unknown): Request {
  return new Request('http://localhost/api/team-portal/update-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    team_members: [
      { id: 'member-A', tenant_id: TENANT_A, email: SHARED_EMAIL, phone: '2125550100' },
    ],
    cleaner_applications: [
      { id: 'app-A', tenant_id: TENANT_A, email: SHARED_EMAIL, phone: '2125550100' },
      { id: 'app-B', tenant_id: TENANT_B, email: SHARED_EMAIL, phone: '3105550200' },
    ],
  }
})

describe('POST /api/team-portal/update-phone — cleaner_applications tenant isolation', () => {
  it('updates only the calling tenant\'s cleaner_applications row for a shared email', async () => {
    const res = await POST(postReq({ token: tokenFor('member-A'), phone: '2125559999' }) as never)
    expect(res.status).toBe(200)

    const appA = h.store.cleaner_applications.find((r) => r.id === 'app-A')
    const appB = h.store.cleaner_applications.find((r) => r.id === 'app-B')
    expect(appA?.phone).toBe('2125559999')
    // The other tenant's same-email applicant row must be untouched.
    expect(appB?.phone).toBe('3105550200')
  })

  it('updates the team_members row for the token\'s own id', async () => {
    const res = await POST(postReq({ token: tokenFor('member-A'), phone: '2125559999' }) as never)
    expect(res.status).toBe(200)
    expect(h.store.team_members[0].phone).toBe('2125559999')
  })

  it('rejects a malformed token', async () => {
    const res = await POST(postReq({ token: 'not-a-real-token', phone: '2125559999' }) as never)
    expect(res.status).toBe(400)
  })

  it('rejects an invalid phone number', async () => {
    const res = await POST(postReq({ token: tokenFor('member-A'), phone: '123' }) as never)
    expect(res.status).toBe(400)
  })
})
