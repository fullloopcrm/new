import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * The STOP/START handlers already looked up a matching team_members row and
 * fired an admin-facing notification, but never actually wrote sms_consent —
 * so a team member replying STOP kept receiving every SMS the app sends
 * (job broadcasts, reminders, daily summaries) exactly as if they'd never
 * opted out, and had no way to opt back in via SMS at all (START never
 * checked team_members in the first place).
 */

process.env.TELNYX_WEBHOOK_VERIFY = 'off'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/selena-legacy', () => ({ askSelena: async () => ({}) }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: async () => ({}) }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/review-engine', () => ({ handleNycMaidReview: async () => false }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-a'
const MEMBER_PHONE = '+15551234567'
const fake = supabaseAdmin as unknown as FakeSupabase

function inboundReq(from: string, text: string): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        event_type: 'message.received',
        payload: { from: { phone_number: from }, to: [{ phone_number: '+15550009999' }], text },
      },
    }),
  })
}

function seedTenant() {
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Tenant Co', telnyx_api_key: 'key-a', telnyx_phone: '+15550009999', owner_phone: null },
  ])
}

interface TeamMemberRow { id: string; sms_consent: boolean }

beforeEach(() => {
  fake._store.clear()
})

describe('webhooks/telnyx POST — team member STOP/START persists sms_consent', () => {
  it('STOP sets team_members.sms_consent to false, not just an admin notification', async () => {
    seedTenant()
    fake._seed('team_members', [
      { id: 'tm-1', tenant_id: TENANT_ID, name: 'Team Member', phone: MEMBER_PHONE, sms_consent: true },
    ])

    const res = await POST(inboundReq(MEMBER_PHONE, 'STOP'))
    expect(res.status).toBe(200)

    const member = (fake._store.get('team_members') as TeamMemberRow[] | undefined)?.find(m => m.id === 'tm-1')
    expect(member?.sms_consent).toBe(false)
  })

  it('START re-enables a previously opted-out team member — sms_consent back to true', async () => {
    seedTenant()
    fake._seed('team_members', [
      { id: 'tm-1', tenant_id: TENANT_ID, name: 'Team Member', phone: MEMBER_PHONE, sms_consent: false },
    ])

    const res = await POST(inboundReq(MEMBER_PHONE, 'START'))
    expect(res.status).toBe(200)

    const member = (fake._store.get('team_members') as TeamMemberRow[] | undefined)?.find(m => m.id === 'tm-1')
    expect(member?.sms_consent).toBe(true)
  })
})
