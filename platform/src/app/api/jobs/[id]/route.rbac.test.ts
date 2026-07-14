import { describe, it, expect, vi } from 'vitest'

/**
 * PATCH /api/jobs/[id] only checked getTenantForRequest() (any authenticated
 * tenant member) before letting the caller change a job's status/title/notes
 * — a mutation that can trigger payment releases and owner alerts. The
 * sibling booking-edit endpoints gate this behind requirePermission
 * ('bookings.edit'); this route did not, so a role without bookings.edit
 * could still mutate job state through this path. Fixed to match.
 */

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: () => { throw new Error('must not query DB when permission denied') } } }))
vi.mock('@/lib/jobs', () => ({ logJobEvent: async () => {}, releasePaymentsForEvent: async () => {}, shapeSession: (b: unknown) => b }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'T', tenant: {}, role: 'staff' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status: number) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/require-permission', async () => {
  const { NextResponse } = await import('next/server')
  return {
    requirePermission: async (permission: string) => {
      if (permission !== 'bookings.edit') throw new Error(`expected bookings.edit, got ${permission}`)
      return { tenant: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    },
  }
})

import { PATCH } from '@/app/api/jobs/[id]/route'

describe('PATCH /api/jobs/[id] — requires bookings.edit', () => {
  it('rejects before touching the DB when the caller lacks bookings.edit', async () => {
    const res: any = await PATCH(
      new Request('https://x/api/jobs/j1', { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }),
      { params: Promise.resolve({ id: 'j1' }) },
    )
    expect(res.status).toBe(403)
  })
})
