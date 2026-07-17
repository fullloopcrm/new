import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * createPrimaryContact's insert omitted tenant_id even though every other
 * client_contacts write path (POST /clients/[id]/contacts,
 * set_primary_client_contact's p_tenant_id) carries it. Its only caller
 * (selena/core.ts's createOrLinkClient, the SMS/AI-chatbot new-client path)
 * wraps the call in `.catch(() => {})`, so if tenant_id is NOT NULL on this
 * table the insert has been failing silently in production for every client
 * created through that path. Even where it doesn't error, a null tenant_id
 * makes the row invisible to any tenant-scoped lookup against client_contacts
 * (e.g. webhooks/telnyx's STOP/START handler).
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))

import { createPrimaryContact } from './client-contacts'

beforeEach(() => {
  h.fake = createFakeSupabase({ client_contacts: [] })
})

describe('createPrimaryContact', () => {
  it('carries tenant_id on the inserted row', async () => {
    await createPrimaryContact('client-1', 'tenant-1', { name: 'Ana', phone: '5551234567' })

    const rows = h.fake!._all('client_contacts')
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe('tenant-1')
    expect(rows[0].client_id).toBe('client-1')
    expect(rows[0].phone_e164).toBe('+15551234567')
  })
})
