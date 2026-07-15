import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * GET /api/admin/comhub/contacts/[id]/context auto-links an unlinked contact
 * to a client/team_member by phone/email, and PERSISTS the match onto
 * comhub_contacts.client_id/team_member_id. The phone match previously used
 * ilike('phone', `%last10digits%`) with no minimum-length floor -- a short or
 * malformed inbound phone (e.g. a single digit) would substring-match an
 * ARBITRARY client/team_member and permanently mis-link the contact, corrupting
 * future message routing (not just one read). Fixed to require a full exact
 * 10-digit match, mirroring client/collect + deals/manual.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => null,
}))
vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: async () => TENANT,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const CONTACT_ID = '11111111-1111-1111-1111-111111111111'
const UNRELATED_CLIENT = '22222222-2222-2222-2222-222222222222'
const UNRELATED_TEAM_MEMBER = '33333333-3333-3333-3333-333333333333'

function getCtx() {
  return { params: Promise.resolve({ id: CONTACT_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: UNRELATED_CLIENT, tenant_id: TENANT, name: 'Unrelated Client', phone: '15165550123', email: 'unrelated@example.com' },
  ])
  fake._seed('team_members', [
    { id: UNRELATED_TEAM_MEMBER, tenant_id: TENANT, name: 'Unrelated Cleaner', phone: '15165550123', email: 'cleaner@example.com' },
  ])
  fake._seed('bookings', [])
})

describe('GET /api/admin/comhub/contacts/[id]/context — phone auto-link must be an exact 10-digit match', () => {
  it('a short/malformed phone (single digit) does NOT auto-link to, or persist, an unrelated client/team_member', async () => {
    fake._seed('comhub_contacts', [
      { id: CONTACT_ID, tenant_id: TENANT, name: 'New Contact', phone: '5', email: null, client_id: null, team_member_id: null },
    ])

    const res = await GET(new NextRequest('http://x'), getCtx())
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.client).toBeNull()
    expect(body.cleaner).toBeNull()

    const persisted = fake._all('comhub_contacts').find((c) => c.id === CONTACT_ID)
    expect(persisted?.client_id).not.toBe(UNRELATED_CLIENT)
    expect(persisted?.team_member_id).not.toBe(UNRELATED_TEAM_MEMBER)
  })

  it('a full matching 10-digit phone DOES auto-link and persist onto the contact (positive control)', async () => {
    fake._seed('comhub_contacts', [
      { id: CONTACT_ID, tenant_id: TENANT, name: 'New Contact', phone: '5165550123', email: null, client_id: null, team_member_id: null },
    ])

    const res = await GET(new NextRequest('http://x'), getCtx())
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.client?.id).toBe(UNRELATED_CLIENT)
    expect(body.cleaner?.id).toBe(UNRELATED_TEAM_MEMBER)

    const persisted = fake._all('comhub_contacts').find((c) => c.id === CONTACT_ID)
    expect(persisted?.client_id).toBe(UNRELATED_CLIENT)
    expect(persisted?.team_member_id).toBe(UNRELATED_TEAM_MEMBER)
  })
})
