import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/clients (GET list + POST create, converted to tenantDb).
 *
 *   • GET  — the list reads `clients` through tenantDb, so a foreign tenant's
 *     client never appears in the acting tenant's list.
 *   • POST — two guarantees:
 *       - SCOPED DEDUP: the duplicate-check read goes through tenantDb, so a
 *         DIFFERENT tenant's client with the SAME email is invisible and does
 *         NOT falsely block the create with a 409.
 *       - STAMP: tenantDb.insert() stamps tenant_id last, so a forged body
 *         tenant_id can't land the row under another tenant.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({
    require_client_phone: false,
    require_client_email: false,
    default_client_status: 'active',
  })),
}))

import { GET, POST } from './route'

function seed() {
  return {
    clients: [
      // Only tenant B owns 'shared@example.com'; a tenant-scoped dedup read must
      // not see it, so tenant A can create a client with that same email.
      { id: 'cli-a', tenant_id: A, name: 'A Client', email: 'a@example.com', phone: '5551110000', status: 'active', created_at: '2026-01-01' },
      { id: 'cli-b', tenant_id: B, name: 'B Client', email: 'shared@example.com', phone: '5552220000', status: 'active', created_at: '2026-02-01' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('clients GET — tenant isolation', () => {
  it("lists only the acting tenant's clients, never a foreign tenant's row", async () => {
    const { NextRequest } = await import('next/server')
    const res = await GET(new NextRequest('http://t/api/clients'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.clients as Array<{ id: string }>).map((c) => c.id)
    expect(ids).toEqual(['cli-a'])
    expect(ids).not.toContain('cli-b')
  })
})

describe('clients POST — tenant isolation', () => {
  it("scoped dedup: a foreign tenant's same-email client does NOT block the create", async () => {
    const res = await POST(
      new Request('http://t/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'New', email: 'shared@example.com', phone: '5559990000' }),
      }),
    )
    // If the dedup read leaked tenant B, cli-b's shared email would 409 this.
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client.tenant_id).toBe(A)
  })

  it('stamp: a forged body tenant_id is overridden with the acting tenant', async () => {
    const res = await POST(
      new Request('http://t/api/clients', {
        method: 'POST',
        body: JSON.stringify({ name: 'Forged', phone: '5558887777', tenant_id: B }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.client.tenant_id).toBe(A)
    const ins = h.capture.inserts.find((i) => i.table === 'clients')
    expect(ins!.rows.every((r) => r.tenant_id === A)).toBe(true)
  })
})
