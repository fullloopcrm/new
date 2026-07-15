import { describe, it, expect, vi } from 'vitest'

/**
 * MISSING AUTH — GET/PATCH /api/feedback.
 *
 * /api/feedback is listed in middleware's isPublicRoute (skips Clerk, same
 * as /api/admin(.*) which relies on its own PIN-based requireAdmin() gate
 * instead). GET/PATCH had zero server-side auth at all -- the only guard was
 * a comment claiming "admin layout handles it", which is a client-side-only
 * check that does not protect the API route itself. Any unauthenticated
 * caller could read all platform_feedback rows (up to 200, incl. category/
 * message/status) and could PATCH any row's status/admin_notes by id.
 * POST (anonymous feedback submission) is intentionally still public.
 */

const { requireAdmin } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => null as null | Response),
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        order: () => ({ limit: async () => ({ data: [{ id: 'f-1', message: 'hi' }], error: null }) }),
        eq: () => ({ head: true }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}))

import { GET, PATCH } from './route'

describe('feedback/route.ts — admin auth gate on GET/PATCH', () => {
  it('GET returns 401 when requireAdmin rejects (unauthenticated caller)', async () => {
    requireAdmin.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as unknown as Response
    )
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('PATCH returns 401 when requireAdmin rejects (unauthenticated caller)', async () => {
    requireAdmin.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as unknown as Response
    )
    const res = await PATCH(new Request('http://t/api/feedback', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'f-1', status: 'read' }),
    }))
    expect(res.status).toBe(401)
  })

  it('PATCH succeeds when requireAdmin allows (positive control)', async () => {
    requireAdmin.mockResolvedValueOnce(null)
    const res = await PATCH(new Request('http://t/api/feedback', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'f-1', status: 'read' }),
    }))
    expect(res.status).toBe(200)
  })
})
