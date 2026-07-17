import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PATCH /api/admin/prospects/[id] — the `prospects.status` CHECK constraint
 * declares 'cancelled', and the admin page's STATUS_COLORS already has a
 * badge for it, but no action branch ever wrote it (no code path could
 * produce a 'cancelled' row). Separately, the route already supported
 * `action:'review'` (status -> 'reviewing') with zero UI button ever calling
 * it. Covers both the newly-added 'cancel' branch and the previously-dead
 * 'review' branch, plus the pre-existing unauthorized/not-found/unknown-
 * action guards this route had no test coverage of at all before this round.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let authError: unknown = null
vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => authError,
}))

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const PROSPECT_ID = 'prospect-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function patchReq(body: Record<string, unknown>) {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  authError = null
  fake._seed('prospects', [
    { id: PROSPECT_ID, business_name: 'Acme Cleaning', owner_email: 'owner@acme.test', status: 'new', reject_reason: null },
  ])
})

describe('PATCH /api/admin/prospects/[id] — action branches', () => {
  it('cancels a prospect, persisting the declared "cancelled" status', async () => {
    const res = await PATCH(patchReq({ action: 'cancel' }), paramsFor(PROSPECT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.prospect.status).toBe('cancelled')
    expect(body.prospect.reviewed_at).toBeTruthy()
  })

  it('marks a prospect reviewing without approving or rejecting it', async () => {
    const res = await PATCH(patchReq({ action: 'review' }), paramsFor(PROSPECT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.prospect.status).toBe('reviewing')
  })

  it('rejects an unrecognized action before touching the database', async () => {
    const res = await PATCH(patchReq({ action: 'delete' }), paramsFor(PROSPECT_ID))
    expect(res.status).toBe(400)
    const row = fake._all('prospects').find((r) => r.id === PROSPECT_ID)!
    expect(row.status).toBe('new')
  })

  it('404s on an unknown prospect id', async () => {
    const res = await PATCH(patchReq({ action: 'cancel' }), paramsFor('does-not-exist'))
    expect(res.status).toBe(404)
  })

  it('rejects a caller without a valid admin token', async () => {
    authError = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const res = await PATCH(patchReq({ action: 'cancel' }), paramsFor(PROSPECT_ID))
    expect(res.status).toBe(401)
    const row = fake._all('prospects').find((r) => r.id === PROSPECT_ID)!
    expect(row.status).toBe('new')
  })
})
