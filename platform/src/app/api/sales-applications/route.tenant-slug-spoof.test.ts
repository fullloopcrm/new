import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/sales-applications is public/unauthenticated. It used to read
 * `tenant_slug` straight from the request body (falling back to the
 * middleware-injected `x-tenant-slug` header only if the body omitted it).
 * No legitimate caller sends `tenant_slug` in the body (grepped every
 * fetch() site — only the nycmaid commission-sales-partner page posts here,
 * and it relies on Host-based middleware resolution, never a body field).
 * That left an anonymous caller free to pick ANY tenant by slug to: (1)
 * plant a fake pending row in that tenant's sales_applications table, and
 * (2) trigger a real "New Sales Partner Application" admin-notification
 * email via notify() — same class already fixed on /api/track (client-
 * supplied tenant_id spoofing, commit 5bd00d72). Fixed by deriving
 * tenant_slug ONLY from the trustworthy header (middleware overwrites it
 * from the verified Host on every /api/* request; a client-set copy of the
 * same header is discarded before the route ever sees it).
 */

const REAL_TENANT_ID = 'real-tenant-id'
const VICTIM_TENANT_ID = 'victim-tenant-id'

let notifiedTenantIds: string[] = []
let insertedTenantIds: string[] = []

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 100 }),
}))

vi.mock('@/lib/notify', () => ({
  notify: async ({ tenantId }: { tenantId: string }) => {
    notifiedTenantIds.push(tenantId)
  },
}))

function chain(resolve: () => Promise<{ data: unknown; error?: null }>): Record<string, unknown> {
  const self: Record<string, unknown> = {
    eq: () => self,
    limit: () => self,
    single: resolve,
    then: (resolveFn: (v: { data: unknown; error?: null }) => unknown) => resolve().then(resolveFn),
  }
  return self
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: (_cols: string) => {
        if (table === 'tenants') {
          // Capture the slug via a closure over the eq() call.
          let slug: string | undefined
          const builder: Record<string, unknown> = {
            eq: (_col: string, val: string) => {
              slug = val
              return builder
            },
            single: async () => {
              if (slug === 'real-tenant') return { data: { id: REAL_TENANT_ID, name: 'Real Tenant' } }
              if (slug === 'victim-tenant') return { data: { id: VICTIM_TENANT_ID, name: 'Victim Tenant' } }
              return { data: null }
            },
          }
          return builder
        }
        // Duplicate-check query (sales_applications) — always no existing match.
        return chain(async () => ({ data: [] }))
      },
      insert: (row: { tenant_id: string }) => {
        insertedTenantIds.push(row.tenant_id)
        return {
          select: () => ({
            single: async () => ({ data: { id: 'new-app-id' }, error: null }),
          }),
        }
      },
    }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('https://homeservicesbusinesscrm.com/api/sales-applications', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  notifiedTenantIds = []
  insertedTenantIds = []
})

describe('POST /api/sales-applications — tenant_slug spoofing', () => {
  it('ignores a body-supplied tenant_slug and uses the header-resolved tenant instead', async () => {
    const res = await POST(
      req(
        {
          tenant_slug: 'victim-tenant', // attacker-supplied — should be ignored
          name: 'Attacker',
          email: 'attacker@example.com',
          phone: '5551234567',
          location: 'Nowhere',
          video_url: 'https://storage.example.com/real-tenant-id/applications/videos/clip.mp4',
        },
        { 'x-tenant-slug': 'real-tenant' } // middleware-resolved, trustworthy
      )
    )
    expect(res.status).toBe(201)
    expect(insertedTenantIds).toEqual([REAL_TENANT_ID])
    expect(notifiedTenantIds).toEqual([REAL_TENANT_ID])
    expect(insertedTenantIds).not.toContain(VICTIM_TENANT_ID)
    expect(notifiedTenantIds).not.toContain(VICTIM_TENANT_ID)
  })

  it('404s when no header tenant is present, even if the body supplies one', async () => {
    const res = await POST(
      req({
        tenant_slug: 'victim-tenant',
        name: 'Attacker',
        email: 'attacker@example.com',
        phone: '5551234567',
        location: 'Nowhere',
        video_url: 'https://storage.example.com/victim-tenant-id/applications/videos/clip.mp4',
      })
    )
    // No x-tenant-slug header (as if hit directly, bypassing middleware/Host
    // resolution) -> tenant_slug is undefined -> 400, never resolves the
    // attacker-chosen victim tenant.
    expect(res.status).toBe(400)
    expect(insertedTenantIds).toEqual([])
    expect(notifiedTenantIds).toEqual([])
  })
})
