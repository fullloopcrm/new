import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST/DELETE /api/admin/users/[id]/pin — owner-account-takeover guard.
 *
 * BUG (fixed here): both handlers only checked `settings.edit` (granted to
 * 'admin' by default) before setting/reading-back or clearing ANY member's
 * PIN, including an owner's. POST returns the new plaintext PIN once, by
 * design — a non-owner resetting the owner's PIN could read it back and log
 * in as the owner via /api/admin-auth (mints a session with memberRole taken
 * straight from the matched tenant_members row: direct account takeover, not
 * just a PIN edit). DELETE has the same gap one step removed: a non-owner
 * could lock the real owner out of admin login entirely.
 *
 * FIX: block both when tenant.role !== 'owner' AND the target member's role
 * is 'owner'.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

function seed() {
  return {
    tenant_members: [
      { id: 'm-owner', tenant_id: A, role: 'owner', name: 'Owen', pin_hash: 'old-hash' },
      { id: 'm-admin', tenant_id: A, role: 'admin', name: 'Adam', pin_hash: 'admin-hash' },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
// hashAdminPin() reads ADMIN_TOKEN_SECRET into a module-level const at import
// time, so the route module must be (re-)imported dynamically AFTER the env
// var is set — a static top-level `import { POST, DELETE } from './route'`
// resolves too early and leaves SECRET undefined.
let POST: typeof import('./route').POST
let DELETE: typeof import('./route').DELETE
beforeEach(async () => {
  process.env.ADMIN_TOKEN_SECRET = 'test_admin_secret'
  vi.resetModules()
  ;({ POST, DELETE } = await import('./route'))
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function post(id: string) {
  return POST(
    new Request(`http://t/api/admin/users/${id}/pin`, { method: 'POST', body: JSON.stringify({}) }) as unknown as import('next/server').NextRequest,
    { params: Promise.resolve({ id }) },
  )
}
function del(id: string) {
  return DELETE(
    new Request(`http://t/api/admin/users/${id}/pin`, { method: 'DELETE' }) as unknown as import('next/server').NextRequest,
    { params: Promise.resolve({ id }) },
  )
}

function pinHashOf(id: string): string | null | undefined {
  return (h.seed.tenant_members.find((m) => m.id === id) as { pin_hash?: string | null } | undefined)?.pin_hash
}

describe('POST /api/admin/users/[id]/pin — owner-takeover probe', () => {
  it('owner can reset another owner\'s PIN', async () => {
    const res = await post('m-owner')
    expect(res.status).toBe(200)
    expect((await res.json()).pin).toBeTruthy()
  })

  it("PERMISSION PROBE: 'admin' (has settings.edit by default) is forbidden from resetting the owner's PIN", async () => {
    tenantHolder.role = 'admin'
    const res = await post('m-owner')
    expect(res.status).toBe(403)
    expect(pinHashOf('m-owner')).toBe('old-hash')
  })

  it("'admin' can still reset a non-owner member's PIN", async () => {
    tenantHolder.role = 'admin'
    const res = await post('m-admin')
    expect(res.status).toBe(200)
    expect(pinHashOf('m-admin')).not.toBe('admin-hash')
  })
})

describe('DELETE /api/admin/users/[id]/pin — owner-lockout probe', () => {
  it('owner can clear another owner\'s PIN', async () => {
    const res = await del('m-owner')
    expect(res.status).toBe(200)
    expect(pinHashOf('m-owner')).toBeNull()
  })

  it("PERMISSION PROBE: 'admin' is forbidden from clearing the owner's PIN (would lock the owner out)", async () => {
    tenantHolder.role = 'admin'
    const res = await del('m-owner')
    expect(res.status).toBe(403)
    expect(pinHashOf('m-owner')).toBe('old-hash')
  })

  it("'admin' can still clear a non-owner member's PIN", async () => {
    tenantHolder.role = 'admin'
    const res = await del('m-admin')
    expect(res.status).toBe(200)
    expect(pinHashOf('m-admin')).toBeNull()
  })
})
