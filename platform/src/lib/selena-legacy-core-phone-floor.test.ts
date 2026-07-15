import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * isTeamMemberPhone / isDoNotServiceByPhone (legacy Selena engine, the
 * DEFAULT engine for every tenant except nycmaid per the /api/chat +
 * webhooks/telnyx isNycMaid() gate) used a weak `cleanPhone.length < 7`
 * floor before ilike-substring-matching `team_members.phone` /
 * `clients.phone`. A malformed/short caller-ID phone could substring-match
 * an UNRELATED team member (falsely routing a legitimate client's SMS out
 * of the booking flow with "this number is for clients") or an unrelated
 * do_not_service client (silently dropping the reply to a legitimate
 * client). Tightened to the same >=10-digit national-number floor already
 * established for the sibling getClientProfile fix in this engine.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { isTeamMemberPhone, isDoNotServiceByPhone } from '@/lib/selena-legacy-core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-A'
const TEAM_MEMBER = { id: 'tm-1', tenant_id: TENANT, name: 'Real Cleaner', phone: '2125551234', status: 'active' }
const DNS_CLIENT = { id: 'client-dns', tenant_id: TENANT, phone: '3105559999', do_not_service: true }

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [{ ...TEAM_MEMBER }])
  fake._seed('clients', [{ ...DNS_CLIENT }])
})

describe('isTeamMemberPhone — phone match floor', () => {
  it('does NOT falsely match an unrelated team member for a malformed 8-digit phone that IS a real substring of the real number', async () => {
    const result = await isTeamMemberPhone(TENANT, '21255512')
    expect(result.isTeamMember).toBe(false)
  })

  it('CONTROL: still detects the real team member on an exact 10-digit match', async () => {
    const result = await isTeamMemberPhone(TENANT, '2125551234')
    expect(result.isTeamMember).toBe(true)
    expect(result.name).toBe('Real Cleaner')
  })
})

describe('isDoNotServiceByPhone — phone match floor', () => {
  it('does NOT falsely block a legitimate client for a malformed 8-digit phone that IS a real substring of the DNS client number', async () => {
    const result = await isDoNotServiceByPhone(TENANT, '31055599')
    expect(result).toBe(false)
  })

  it('CONTROL: still blocks the real do-not-service client on an exact 10-digit match', async () => {
    const result = await isDoNotServiceByPhone(TENANT, '3105559999')
    expect(result).toBe(true)
  })
})
