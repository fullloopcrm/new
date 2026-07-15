import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * loadContext(tenantId, phone, conversationId) (Yinez/nycmaid engine's
 * system-prompt context builder, called on every reply via askSelenaCore for
 * every channel incl. web/sms) had NO length floor at all before
 * ilike-substring-matching `clients.phone` -- a short/garbage phone (e.g. a
 * single digit typed into the public web-chat widget, reachable
 * unauthenticated via POST /api/chat or /api/yinez) matched an ARBITRARY
 * client and leaked their name/address/email/last_rate/notes straight into
 * the AI's system prompt for the rest of the conversation. Same bug class
 * as the already-fixed getClientProfile sibling in this file's core.ts
 * counterpart (get-client-profile.test.ts).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { loadContext } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-A'
const VICTIM = {
  id: 'client-victim',
  tenant_id: TENANT,
  name: 'Victim Real Client',
  address: '123 Real St',
  email: 'victim@example.com',
  last_rate: 65,
  notes: 'sensitive private note',
  created_at: new Date().toISOString(),
  preferred_cleaner_id: null,
  status: 'active',
  phone: '2125551234',
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT, owner_phone: null }])
  fake._seed('clients', [{ ...VICTIM }])
  fake._seed('bookings', [])
})

describe('loadContext (Yinez engine) — phone match floor', () => {
  it('does NOT leak an unrelated client profile into the AI context for a 1-digit phone', async () => {
    const context = await loadContext(TENANT, '1', 'convo-1')
    expect(context).not.toContain('Victim Real Client')
    expect(context).not.toContain('123 Real St')
    expect(context).not.toContain('sensitive private note')
  })

  it('does NOT leak for a still-too-short 8-digit phone that IS a real substring of the victim number', async () => {
    const context = await loadContext(TENANT, '21255512', 'convo-1')
    expect(context).not.toContain('Victim Real Client')
  })

  it('CONTROL: still surfaces the real client context on an exact 10-digit match', async () => {
    const context = await loadContext(TENANT, '2125551234', 'convo-1')
    expect(context).toContain('Victim Real Client')
  })
})
