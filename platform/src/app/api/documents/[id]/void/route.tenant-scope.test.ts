import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Defense-in-depth — POST /api/documents/[id]/void.
 *
 * The handler's existence check (`.eq('tenant_id', tenantId).eq('id', id)`)
 * already gates this route: `id` is only ever reachable here after it's been
 * confirmed to belong to the caller's tenant, so this was never a live
 * cross-tenant bug on a real schema (document ids are globally-unique UUID
 * PKs — no two tenants can ever share one). But the UPDATE that follows had
 * drifted from every sibling mutation in this feature (`documents/[id]`,
 * `.../send`, `finance/entities/[id]`, `finance/periods/[id]`) by filtering
 * only `.eq('id', id)` — the redundant tenant scope on the WRITE itself was
 * missing. Hardened to match the codebase's own stated invariant (see
 * `import-staging.ts`'s `undoBatch` comment): every mutation should carry
 * `tenant_id` even when a call-site guard already exists, so a future
 * refactor that loosens the guard doesn't silently reopen a cross-tenant
 * write. This test seeds a synthetic id collision across tenants (impossible
 * on the real UUID-PK schema, but the only way to make the query's own
 * defense observable) to prove the WRITE itself is tenant-scoped, not just
 * the read that precedes it.
 */

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const SHARED_ID = 'doc-shared'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status = 401
  },
  getTenantForRequest: vi.fn(),
}))

import { POST } from './route'

function seed() {
  return {
    // Same `id` on two rows only exists to make the query's own tenant
    // filter observable in this in-memory harness — see file header.
    documents: [
      { id: SHARED_ID, tenant_id: TENANT, status: 'draft' },
      { id: SHARED_ID, tenant_id: OTHER_TENANT, status: 'draft' },
    ],
    document_activity: [] as Record<string, any>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(id: string) {
  return POST(new Request(`http://t/api/documents/${id}/void`, { method: 'POST', body: JSON.stringify({ reason: 'test' }) }), {
    params: Promise.resolve({ id }),
  })
}

describe('documents/[id]/void POST — write-side tenant scope', () => {
  it("voids the caller's own document and leaves the other tenant's same-id row untouched", async () => {
    const res = await post(SHARED_ID)
    expect(res.status).toBe(200)

    const mine = h.seed.documents.find((d) => d.tenant_id === TENANT)!
    const theirs = h.seed.documents.find((d) => d.tenant_id === OTHER_TENANT)!
    expect(mine.status).toBe('voided')
    expect(theirs.status).toBe('draft')
  })
})
