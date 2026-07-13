/**
 * Mass-assignment fix — PUT /api/reviews/[id] passed the raw request body
 * straight to `.update()` with only `.eq('tenant_id', tenantId)` in the WHERE
 * clause. That only restricts which row can be touched; it does nothing to
 * stop the SET clause from including `tenant_id` itself, letting an
 * authenticated tenant user reassign one of their own reviews into a
 * different tenant's namespace. Fixed by allowlisting the editable fields
 * via the repo's existing `pick()` helper (the same pattern already used by
 * bookings/[id]/route.ts).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn().mockResolvedValue({ tenantId: 'tenant-a' }),
  AuthError: class AuthError extends Error {},
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('reviews', [
    { id: 'rev-1', tenant_id: 'tenant-a', status: 'pending', rating: null, comment: null },
  ])
})

function req(body: unknown) {
  return new Request('http://x/api/reviews/rev-1', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('PUT /api/reviews/[id] — mass assignment', () => {
  it('drops a tenant_id smuggled into the body instead of reassigning the row', async () => {
    const res = await PUT(req({ status: 'collected', tenant_id: 'tenant-b' }), {
      params: Promise.resolve({ id: 'rev-1' }),
    })
    expect(res.status).toBe(200)
    const row = fake._store.get('reviews')?.find((r) => r.id === 'rev-1')
    expect(row?.tenant_id).toBe('tenant-a')
    expect(row?.status).toBe('collected')
  })

  it('still updates allowlisted editable fields normally', async () => {
    const res = await PUT(req({ rating: 5, comment: 'Great job!' }), {
      params: Promise.resolve({ id: 'rev-1' }),
    })
    expect(res.status).toBe(200)
    const row = fake._store.get('reviews')?.find((r) => r.id === 'rev-1')
    expect(row?.rating).toBe(5)
    expect(row?.comment).toBe('Great job!')
  })
})
