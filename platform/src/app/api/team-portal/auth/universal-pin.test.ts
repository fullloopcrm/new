import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Mirrors /api/portal/auth's universal-PIN tests: 020179 signs in as the
 * oldest team member on file for whatever tenant it's used against, so a
 * fresh master-PIN login always resolves to someone, not a specific PIN
 * match. A normal (non-universal) guess must still be rejected as before.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-1'
const TENANT_SLUG = 'test-tenant'
const UNIVERSAL_PIN = '020179'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(pin: string, tenant_slug = TENANT_SLUG): Request {
  return new Request('http://x/api/team-portal/auth', {
    method: 'POST',
    body: JSON.stringify({ tenant_slug, pin }),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', slug: TENANT_SLUG, status: 'active', phone: '+15550000' }])
  fake._seed('team_members', [
    { id: 'tm-oldest', tenant_id: TENANT_ID, name: 'Oldest Member', pin: '111111', status: 'active', preferred_language: 'en', pay_rate: 20, avatar_url: null, role: 'worker', created_at: '2026-01-01T00:00:00Z' },
    { id: 'tm-newest', tenant_id: TENANT_ID, name: 'Newest Member', pin: '222222', status: 'active', preferred_language: 'en', pay_rate: 25, avatar_url: null, role: 'worker', created_at: '2026-06-01T00:00:00Z' },
  ])
})

describe('team-portal/auth — universal PIN', () => {
  it('signs in as the oldest member on file, regardless of that member\'s real PIN', async () => {
    const res = await POST(req(UNIVERSAL_PIN))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-oldest')
    expect(body.member.name).toBe('Oldest Member')
  })

  it('404/401s when the tenant has no team members at all', async () => {
    fake._store.set('team_members', [])
    const res = await POST(req(UNIVERSAL_PIN))
    expect(res.status).toBe(401)
  })

  it('a normal (non-universal) wrong guess is still rejected', async () => {
    const res = await POST(req('999999'))
    expect(res.status).toBe(401)
  })

  it('a normal correct PIN still logs in that specific member, not the oldest', async () => {
    const res = await POST(req('222222'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-newest')
  })
})
