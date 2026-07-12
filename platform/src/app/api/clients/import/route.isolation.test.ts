import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/clients/import (converted to tenantDb).
 *
 * Two isolation guarantees are probed on the bulk-import path:
 *   1. STAMP  — tenantDb.insert() stamps tenant_id on every imported row, so a
 *      row lands under the acting tenant, not a forgeable value.
 *   2. SCOPED DEDUP — the duplicate-detection read goes through tenantDb, so a
 *      DIFFERENT tenant's client with the SAME email is invisible: the import is
 *      NOT falsely skipped as a duplicate, proving the read can't see tenant B.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    // Only a FOREIGN-tenant client owns this email/phone. A tenant-scoped dedup
    // read must not see it, so importing the same email must succeed.
    clients: [
      { id: 'client-b', tenant_id: OTHER_TENANT, email: 'shared@example.com', phone: '5559990000' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function importClients(clients: unknown[]) {
  return POST(
    new Request('http://t/api/clients/import', { method: 'POST', body: JSON.stringify({ clients }) }),
  )
}

describe('clients/import POST — tenant isolation', () => {
  it("scoped dedup: a foreign tenant's same-email client does NOT block the import", async () => {
    const res = await importClients([{ name: 'New Client', phone: '5551234567', email: 'shared@example.com' }])
    expect(res.status).toBe(200)
    const body = await res.json()
    // If the dedup read leaked tenant B, this would be imported:0 / duplicates:1.
    expect(body.imported).toBe(1)
    expect(body.duplicates).toBe(0)
  })

  it('stamp: an imported client is stamped with the acting tenant, never a forged one', async () => {
    // A forged tenant_id in the payload is stripped by validateRow AND overridden
    // by the tenantDb insert stamp — assert the row that hit the table is tenant A.
    await importClients([{ name: 'Stamped', phone: '5552223333', tenant_id: OTHER_TENANT }])
    const clientInsert = h.capture.inserts.find((i) => i.table === 'clients')
    expect(clientInsert).toBeDefined()
    expect(clientInsert!.rows.every((r) => r.tenant_id === CTX_TENANT)).toBe(true)
  })
})
