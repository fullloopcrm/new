import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PUT /api/clients/[id] — special_instructions was silently dropped.
 * clients.special_instructions is the client-facing "notes for your team
 * member" field (distinct from clients.notes, the internal staff-only
 * field -- see client/notes/route.ts). The dashboard client-detail edit
 * page renders and submits a "Special Instructions" textarea straight off
 * this same column (GET's select('*') already returns it), but this route's
 * pick() allowlist never included it -- a staff edit here silently never
 * persisted, snapping back to the old value on next load. 4th hit for the
 * "diff frontend POST body vs backend validate/pick allowlist" method this
 * session (notes/referrer_id on POST /api/clients, price/rate/is_emergency
 * on booking create, scheduled_at on POST /api/campaigns, now this).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))
vi.mock('@/lib/audit', () => ({ audit: async () => ({}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-A'
const CLIENT_ID = 'client-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function putReq(body: Record<string, unknown>): Request {
  return new Request(`http://x/api/clients/${CLIENT_ID}`, { method: 'PUT', body: JSON.stringify(body) })
}
function params(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: CLIENT_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Jane Doe', notes: 'internal staff note', special_instructions: 'Ring the bell twice' },
  ])
})

describe('PUT /api/clients/[id] — special_instructions persists', () => {
  it('a staff edit to special_instructions is saved, not silently dropped', async () => {
    const res = await PUT(putReq({ special_instructions: 'Use the side door, dog is friendly' }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.special_instructions).toBe('Use the side door, dog is friendly')
  })

  it('leaves clients.notes (the separate internal-staff field) untouched by a special_instructions-only edit', async () => {
    const res = await PUT(putReq({ special_instructions: 'New note' }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.notes).toBe('internal staff note')
  })
})
