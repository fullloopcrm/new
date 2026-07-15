import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — admin/find-cleaner/recent GET.
 * Previously only checked getTenantForRequest() (any authenticated tenant
 * member), while sibling preview/send routes in the same feature already
 * require campaigns.send — a role with campaigns.send revoked via tenant
 * override could still read broadcast history + cleaner reply text/phones.
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

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('cleaner_broadcasts', [
    { id: 'b1', tenant_id: TENANT_ID, sent_at: '2026-01-01' },
  ])
  fake._seed('cleaner_broadcast_recipients', [
    { id: 'r1', tenant_id: TENANT_ID, broadcast_id: 'b1', cleaner_id: 'tm-1', phone: '+15551234567', sent_at: '2026-01-01', replied_at: null, reply_text: null, status: 'sent' },
  ])
})

describe('admin/find-cleaner/recent GET — permission gate', () => {
  it('a caller with campaigns.send can list recent broadcasts (positive control)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.broadcasts.length).toBe(1)
  })

  it('a role lacking campaigns.send is forbidden', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
