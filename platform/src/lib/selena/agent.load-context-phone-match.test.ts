/**
 * loadContext(tenantId, phone, conversationId) matched an existing client via
 * `ilike('phone', '%'+last10digits+'%')` with no minimum-length guard. A
 * short or malformed phone (e.g. a single digit from an anonymous web-chat
 * visitor on POST /api/chat or POST /api/yinez) matched an ARBITRARY
 * unrelated client and injected their address/notes/last-rate/preferred
 * cleaner/yinez_memory straight into the AI's system context for THIS
 * conversation -- the bot then converses using that data as if it were the
 * visitor's own. Same bug class already fixed elsewhere (getClientProfile,
 * client/collect, portal/collect) but this call site was missed. Fixed to
 * require a full, exact 10-digit match.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { loadContext } from './agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'

function seed() {
  fake._seed('clients', [
    {
      id: 'unrelated-client',
      tenant_id: TENANT,
      name: 'Unrelated Client',
      address: '123 Secret St',
      email: 'unrelated@x.com',
      last_rate: 45,
      notes: 'private notes about this client',
      preferred_cleaner_id: null,
      status: 'active',
      phone: '5551234567',
      created_at: new Date().toISOString(),
    },
  ])
  fake._seed('bookings', [])
  fake._seed('yinez_memory', [
    { tenant_id: TENANT, client_id: 'unrelated-client', type: 'note', content: 'super private memory', created_at: new Date().toISOString() },
  ])
}

describe('loadContext — phone match must be exact', () => {
  it('a short malformed phone does NOT inject an unrelated client\'s profile/notes into context', async () => {
    fake._store.clear()
    seed()
    const context = await loadContext(TENANT, '5', 'convo-1')
    expect(context).not.toContain('Unrelated Client')
    expect(context).not.toContain('123 Secret St')
    expect(context).not.toContain('private notes about this client')
    expect(context).not.toContain('super private memory')
  })

  it('a null phone does NOT inject any client context', async () => {
    fake._store.clear()
    seed()
    const context = await loadContext(TENANT, null, 'convo-1')
    expect(context).not.toContain('Unrelated Client')
  })

  it('a full exact phone match still surfaces the real client\'s profile', async () => {
    fake._store.clear()
    seed()
    const context = await loadContext(TENANT, '5551234567', 'convo-1')
    expect(context).toContain('Unrelated Client')
    expect(context).toContain('123 Secret St')
  })

  it('never surfaces a DIFFERENT tenant\'s client with the same phone', async () => {
    fake._store.clear()
    seed()
    fake._seed('clients', [
      { id: 'other-tenant-client', tenant_id: 'tenant-2', name: 'Other Tenant Client', phone: '5551234567', status: 'active', created_at: new Date().toISOString() },
    ])
    const context = await loadContext('tenant-2', '5551234567', 'convo-1')
    expect(context).toContain('Other Tenant Client')
    expect(context).not.toContain('Unrelated Client')
  })
})
