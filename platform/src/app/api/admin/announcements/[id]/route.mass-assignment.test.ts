/**
 * PUT /api/admin/announcements/[id] passed the raw parsed request body
 * straight into `.update(body)` with no field allowlist — a caller with a
 * valid admin_token (this route's only gate) could mass-assign any column
 * on platform_announcements, including `id` and `created_at`, not just the
 * title/body/type/target/target_value/priority/published fields the UI
 * actually edits. Fixed by allowlisting to that same field set (matching
 * the sibling POST handler's accepted shape).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const requireAdminMock = vi.fn()
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: () => requireAdminMock(),
}))

const updateMock = vi.fn()
const eqMock = vi.fn()
const fromMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}))

function req(body: unknown): Request {
  return new Request('https://example.com/api/admin/announcements/abc', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/admin/announcements/[id] — mass-assignment allowlist', () => {
  beforeEach(() => {
    vi.resetModules()
    requireAdminMock.mockReset().mockResolvedValue(null)
    updateMock.mockReset().mockReturnValue({ eq: eqMock })
    eqMock.mockReset().mockResolvedValue({ error: null })
    fromMock.mockReset().mockReturnValue({ update: updateMock })
  })

  it('strips disallowed columns (id, created_at) from the update payload', async () => {
    const { PUT } = await import('./route')

    await PUT(req({ published: true, id: 'attacker-chosen-id', created_at: '1970-01-01' }), {
      params: Promise.resolve({ id: 'abc' }),
    })

    expect(updateMock).toHaveBeenCalledWith({ published: true })
  })

  it('passes through only allowlisted fields when multiple are present', async () => {
    const { PUT } = await import('./route')

    await PUT(
      req({ title: 'New title', body: 'New body', priority: 'high', not_a_real_column: 'x' }),
      { params: Promise.resolve({ id: 'abc' }) }
    )

    expect(updateMock).toHaveBeenCalledWith({ title: 'New title', body: 'New body', priority: 'high' })
  })
})
