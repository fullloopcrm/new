import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — admin/broadcast-guidelines/route.ts.
 * This route mass-SMS-broadcasts to every active team member of the caller's
 * tenant, uncapped (no TEST_MODE guard unlike the sibling find-cleaner/send +
 * message-applicants/send routes), and each message embeds the recipient's own
 * login PIN. It previously only checked for a valid tenant session via
 * getTenantForRequest(), so any authenticated role (incl. 'staff', which rbac.ts
 * grants no campaigns.send) could trigger a real SMS blast to the whole team.
 * Proves it now requires campaigns.send and never notifies when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let notifyCalls = 0
vi.mock('@/lib/notify', () => ({
  notify: async () => {
    notifyCalls++
    return { success: true }
  },
}))

const TENANT_ID = 'tenant-A'
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : {
          tenant: {
            tenantId: TENANT_ID,
            tenant: { name: 'Acme', domain: 'acme.example.com' },
          },
          error: null,
        }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  permissionError = null
  notifyCalls = 0
  fake._seed('team_members', [
    { id: 'tm-a1', tenant_id: TENANT_ID, name: 'Jeff Tucker', pin: '1234', preferred_language: 'en', status: 'active' },
    { id: 'tm-a2', tenant_id: TENANT_ID, name: 'Other Member', pin: '5678', preferred_language: 'en', status: 'active' },
  ])
})

describe('admin/broadcast-guidelines POST — permission gate', () => {
  it('a caller with campaigns.send can broadcast to the team (positive control)', async () => {
    const res = await POST()
    expect(res.status).toBe(200)
    expect(notifyCalls).toBe(2)
  })

  it('a role lacking campaigns.send is forbidden and nothing is sent', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await POST()
    expect(res.status).toBe(403)
    expect(notifyCalls).toBe(0)
  })
})
