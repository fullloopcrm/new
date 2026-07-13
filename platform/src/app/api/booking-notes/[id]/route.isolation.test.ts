import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — booking-notes/[id]/route.ts (docs/adr/0004).
 *
 * BEFORE this conversion, the DELETE only filtered by `.eq('id', id)` — no
 * tenant_id check on the actual delete (the SELECT above it was scoped, but
 * that only gated the 404, not the mutation). A same-id row collision across
 * tenants would let tenant A delete tenant B's note. tenantDb(ctx.tenantId)
 * closes that gap by scoping BOTH the select and the delete. This test proves
 * it with a genuine id collision, not just a happy-path call.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return {
    supabaseAdmin: {
      ...fake,
      storage: { from: () => ({ remove: async () => ({ data: null, error: null }) }) },
    },
  }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { DELETE } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'note-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('booking_notes', [
    { id: SHARED_ID, tenant_id: A_ID, images: [] },
    { id: SHARED_ID, tenant_id: B_ID, images: [] },
  ])
})

describe('booking-notes/[id] DELETE — tenantDb isolation', () => {
  it("tenant A deletes its OWN same-id note (positive control)", async () => {
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    expect(fake._all('booking_notes').some((r) => r.tenant_id === A_ID)).toBe(false)
  })

  it("tenant A's DELETE never removes tenant B's same-id note — closes the pre-tenantDb gap where delete had no tenant_id filter", async () => {
    await DELETE(new Request('http://x', { method: 'DELETE' }), paramsFor(SHARED_ID))
    expect(fake._all('booking_notes').some((r) => r.tenant_id === B_ID)).toBe(true)
  })
})
