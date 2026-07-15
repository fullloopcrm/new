/**
 * feedback/route.ts GET + PATCH — missing admin auth.
 *
 * Both handlers previously called supabaseAdmin directly with no auth check
 * at all (a stale comment claimed "admin layout handles it," but the API
 * route itself was reachable unauthenticated) — anyone could read every row
 * of platform_feedback or PATCH an arbitrary row's status/admin_notes.
 * Both now gate on requireAdmin(), matching sibling /api/admin/* routes.
 */
import { describe, it, expect, vi } from 'vitest'

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({ requireAdmin: () => requireAdminMock() }))

const updateCalls: Array<{ id: string; update: Record<string, unknown> }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [{ id: 'f-1' }], error: null }),
        }),
        eq: () => Promise.resolve({ count: 0, error: null }),
      }),
      update: (update: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          updateCalls.push({ id, update })
          return Promise.resolve({ error: null })
        },
      }),
    }),
  },
}))

import type { NextRequest } from 'next/server'
import { GET, PATCH } from './route'

function patchReq(): Request {
  const body = { id: 'f-1', status: 'read' }
  return { json: async () => body } as unknown as Request
}

describe('GET /api/feedback — admin auth gate', () => {
  it('rejects when requireAdmin denies the caller (no data read)', async () => {
    requireAdminMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as unknown as never,
    )
    const res = await GET()
    expect((res as unknown as Response).status).toBe(401)
  })

  it('allows the request through when requireAdmin authorizes the caller', async () => {
    requireAdminMock.mockResolvedValueOnce(null)
    const res = await GET()
    const json = await (res as unknown as Response).json()
    expect((res as unknown as Response).status).toBe(200)
    expect(json.feedback).toHaveLength(1)
  })
})

describe('PATCH /api/feedback — admin auth gate', () => {
  it('rejects when requireAdmin denies the caller (no DB write)', async () => {
    requireAdminMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as unknown as never,
    )
    const res = await PATCH(patchReq() as unknown as NextRequest)
    expect((res as unknown as Response).status).toBe(401)
    expect(updateCalls).toHaveLength(0)
  })

  it('allows the update through when requireAdmin authorizes the caller', async () => {
    requireAdminMock.mockResolvedValueOnce(null)
    const res = await PATCH(patchReq() as unknown as NextRequest)
    expect((res as unknown as Response).status).toBe(200)
    expect(updateCalls).toEqual([{ id: 'f-1', update: { status: 'read' } }])
  })
})
