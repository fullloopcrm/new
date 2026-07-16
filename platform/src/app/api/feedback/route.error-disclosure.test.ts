import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/feedback (fully public/unauthenticated per middleware's
 * isPublicRoute matcher) used to pass Supabase's raw `error.message`
 * straight through to the anonymous caller on insert failure — leaking
 * table names, constraint text, and PostgREST internals as reconnaissance
 * for an untrusted party. GET/PATCH (admin-gated) had the same pattern.
 * Probe: any DB failure must return a generic message, never `error.message`.
 */

const trackErrorMock = vi.fn(async (_error: unknown, _context: unknown) => {})
vi.mock('@/lib/error-tracking', () => ({ trackError: (error: unknown, context: unknown) => trackErrorMock(error, context) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({ requireAdmin: () => requireAdminMock() }))

const SENSITIVE_MESSAGE = 'relation "platform_feedback" violates row-level security policy for table "platform_feedback"'

function insertBuilder() {
  const chain: Record<string, unknown> = {
    insert: async () => ({ error: { message: SENSITIVE_MESSAGE } }),
  }
  return chain
}

function selectBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    limit: async () => ({ data: null, error: { message: SENSITIVE_MESSAGE } }),
  }
  return chain
}

function updateBuilder() {
  const chain: Record<string, unknown> = {
    update: () => chain,
    eq: async () => ({ error: { message: SENSITIVE_MESSAGE } }),
  }
  return chain
}

let mode: 'insert' | 'select' | 'update' = 'insert'

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => {
      if (mode === 'insert') return insertBuilder()
      if (mode === 'select') return selectBuilder()
      return updateBuilder()
    },
  },
}))

import { GET, POST, PATCH } from './route'

beforeEach(() => {
  trackErrorMock.mockClear()
  requireAdminMock.mockReset()
})

describe('POST /api/feedback — unauthenticated caller never sees raw DB error', () => {
  it('returns a generic message on insert failure, not error.message', async () => {
    mode = 'insert'
    const req = new Request('https://example.com/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ message: 'this is a real feedback message', category: 'bug' }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).not.toContain('platform_feedback')
    expect(body.error).not.toContain('row-level security')
    expect(body.error).not.toBe(SENSITIVE_MESSAGE)
    expect(trackErrorMock).toHaveBeenCalled()
  })
})

describe('GET /api/feedback — admin caller never sees raw DB error either', () => {
  it('returns a generic message on select failure', async () => {
    mode = 'select'
    requireAdminMock.mockResolvedValue(null)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).not.toBe(SENSITIVE_MESSAGE)
  })
})

describe('PATCH /api/feedback — admin caller never sees raw DB error either', () => {
  it('returns a generic message on update failure', async () => {
    mode = 'update'
    requireAdminMock.mockResolvedValue(null)

    const req = new Request('https://example.com/api/feedback', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'f1', status: 'read' }),
    })

    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).not.toBe(SENSITIVE_MESSAGE)
  })
})
