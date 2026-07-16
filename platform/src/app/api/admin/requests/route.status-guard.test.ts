/**
 * PATCH & DELETE /api/admin/requests — a lead already converted to a live
 * tenant (partner_requests.converted_tenant_id set by createTenantFromLead)
 * used to have zero protection: PATCH could blindly revert `status` away
 * from 'sold' back into the active pipeline view, and DELETE could destroy
 * the row outright -- the only surviving record of that tenant's sales
 * history (fit score, qualifying answers, notes thread, territory
 * reservation). Neither had any read-then-act guard at all, so this wasn't
 * even a race -- a single click on an already-converted lead did it.
 *
 * FIX: guard both writes with `.is('converted_tenant_id', null)` in the
 * write's own WHERE (PATCH only when `status` is part of the payload —
 * notes/qualifying_answers-only edits can't corrupt the pipeline view, so
 * they stay unguarded). 404 vs 409 disambiguated by a recheck when 0 rows
 * match.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))

import { PATCH, DELETE } from './route'

const LEAD_ID = 'lead-1'
const TENANT_ID = 'tenant-1'

const patchReq = (body: unknown) =>
  new NextRequest('http://x/api/admin/requests', { method: 'PATCH', body: JSON.stringify(body) })
const deleteReq = (id: string) =>
  new NextRequest(`http://x/api/admin/requests?id=${id}`, { method: 'DELETE' })

beforeEach(() => {
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockImplementation(async () => null)
  h.store = {
    partner_requests: [
      { id: LEAD_ID, status: 'sold', converted_tenant_id: TENANT_ID, admin_notes: 'converted', qualifying_answers: null },
    ],
  }
})

describe('PATCH /api/admin/requests — converted-lead status guard', () => {
  it('refuses to change status on an already-converted lead', async () => {
    const res = await PATCH(patchReq({ id: LEAD_ID, status: 'lost' }))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already converted/i)
    expect(h.store.partner_requests[0].status).toBe('sold')
  })

  it('still allows notes/qualifying_answers edits on a converted lead (no status change)', async () => {
    const res = await PATCH(patchReq({ id: LEAD_ID, admin_notes: 'follow-up call scheduled' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.request.admin_notes).toBe('follow-up call scheduled')
    expect(h.store.partner_requests[0].status).toBe('sold')
  })

  it('still changes status on a not-yet-converted lead (no regression)', async () => {
    h.store.partner_requests[0] = { id: LEAD_ID, status: 'new', converted_tenant_id: null, admin_notes: null, qualifying_answers: null }

    const res = await PATCH(patchReq({ id: LEAD_ID, status: 'qualified' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.request.status).toBe('qualified')
    expect(h.store.partner_requests[0].status).toBe('qualified')
  })

  it('returns 404 for a nonexistent lead (not the 409 conversion guard)', async () => {
    const res = await PATCH(patchReq({ id: 'no-such-lead', status: 'lost' }))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/admin/requests — converted-lead delete guard', () => {
  it('refuses to delete an already-converted lead', async () => {
    const res = await DELETE(deleteReq(LEAD_ID))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/already converted/i)
    expect(h.store.partner_requests).toHaveLength(1)
  })

  it('still deletes a not-yet-converted lead (no regression)', async () => {
    h.store.partner_requests[0] = { id: LEAD_ID, status: 'new', converted_tenant_id: null, admin_notes: null, qualifying_answers: null }

    const res = await DELETE(deleteReq(LEAD_ID))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(h.store.partner_requests).toHaveLength(0)
  })

  it('returns 404 for a nonexistent lead (not the 409 conversion guard)', async () => {
    const res = await DELETE(deleteReq('no-such-lead'))
    expect(res.status).toBe(404)
  })
})
