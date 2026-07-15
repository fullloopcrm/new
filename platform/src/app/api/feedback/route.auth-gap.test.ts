import { describe, it, expect, vi } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * Regression: GET and PATCH /api/feedback had no auth check ("admin layout
 * handles it" — but /admin/feedback/page.tsx is a client component with no
 * server-side gate, and this route is listed public in middleware so the
 * anonymous POST feedback form works). Any anonymous caller could read every
 * platform_feedback row via GET, or overwrite status/admin_notes on any row
 * via PATCH with any id. Fix: gate GET/PATCH on requireAdmin(), matching the
 * sibling /api/admin/feedback route. POST stays open — it's the public
 * feedback-submission form used by tenant-site widgets.
 */

let adminAuthorized = false
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => (adminAuthorized ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        eq: () => Promise.resolve({ count: 0, error: null }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(() => Promise.resolve()) }))

import { GET, PATCH } from './route'

describe('GET /api/feedback', () => {
  it('rejects an anonymous caller with 401', async () => {
    adminAuthorized = false
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('allows an authenticated admin', async () => {
    adminAuthorized = true
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/feedback', () => {
  it('rejects an anonymous caller with 401, ignoring any id/status supplied', async () => {
    adminAuthorized = false
    const req = new Request('https://x/api/feedback', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'any-id', status: 'read' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('allows an authenticated admin', async () => {
    adminAuthorized = true
    const req = new Request('https://x/api/feedback', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'any-id', status: 'read' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })
})
