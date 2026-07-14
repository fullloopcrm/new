import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/jobs/[id]/sessions only checked getTenantForRequest() (any
 * authenticated tenant member) before creating a booking for the job. The
 * sibling booking-create endpoints gate this behind requirePermission
 * ('bookings.create'); this route did not. Fixed to match.
 */

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => { throw new Error('must not query DB when permission denied') } } }))
vi.mock('@/lib/jobs', () => ({ logJobEvent: async () => {} }))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/require-permission', async () => {
  const { NextResponse } = await import('next/server')
  return {
    requirePermission: async (permission: string) => {
      if (permission !== 'bookings.create') throw new Error(`expected bookings.create, got ${permission}`)
      return { tenant: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    },
  }
})

import { POST } from '@/app/api/jobs/[id]/sessions/route'

describe('POST /api/jobs/[id]/sessions — requires bookings.create', () => {
  it('rejects before touching the DB when the caller lacks bookings.create', async () => {
    const res: any = await POST(
      new Request('https://x/api/jobs/j1/sessions', { method: 'POST', body: JSON.stringify({ start_time: '2026-08-01T10:00:00' }) }),
      { params: Promise.resolve({ id: 'j1' }) },
    )
    expect(res.status).toBe(403)
  })
})
