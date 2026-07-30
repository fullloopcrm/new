import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/chat — new-visitor lead creation.
 *
 * 2026-07-30 pipeline trace found: a web-chat visitor who gives a phone
 * number that matches no existing client got NOTHING beyond the
 * conversation log and a fire-and-forget notify() — no client, no
 * portal_lead, no sales deal. This suite proves the fix: such a visitor now
 * gets a real client + portal_lead + deal, same as every other lead source.
 */

const TENANT_ID = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: (_id: string, sig: string | null | undefined) => sig === 'goodsig',
}))
vi.mock('@/lib/selena-legacy', () => ({ EMPTY_CHECKLIST: {} }))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'yinez', bookingCreated: false })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({ sms_conversations: [], clients: [], portal_leads: [], deals: [], deal_activities: [], client_contacts: [] })
  holder.from = h.from
})

function chat(body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/chat', {
    method: 'POST',
    headers: { 'x-tenant-id': TENANT_ID, 'x-tenant-sig': 'goodsig' },
    body: JSON.stringify(body),
  }))
}

describe('chat POST — new-visitor lead creation', () => {
  it('a phone with no matching client creates a real client + portal_lead + deal', async () => {
    const res = await chat({ message: 'hi, do you service Astoria?', phone: '9175551234' })
    expect(res.status).toBe(200)

    const clientIns = h.capture.inserts.find((i) => i.table === 'clients')
    expect(clientIns).toBeDefined()
    expect(clientIns!.rows[0].tenant_id).toBe(TENANT_ID)

    const leadIns = h.capture.inserts.find((i) => i.table === 'portal_leads')
    expect(leadIns).toBeDefined()
    expect(leadIns!.rows[0].source).toBe('web-chat')

    const dealIns = h.capture.inserts.find((i) => i.table === 'deals')
    expect(dealIns).toBeDefined()
    expect(dealIns!.rows[0].stage).toBe('new')

    const convoIns = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(convoIns!.rows[0].client_id).toBe(clientIns!.rows[0].id)
  })

  it('a phone matching an existing client links to it — no duplicate client created', async () => {
    h.seed.clients = [{ id: 'existing-client', tenant_id: TENANT_ID, name: 'Returning Ren', phone: '9175551234' }]

    const res = await chat({ message: 'hey, checking my next appointment', phone: '9175551234' })
    expect(res.status).toBe(200)

    expect(h.capture.inserts.find((i) => i.table === 'clients')).toBeUndefined()
    const convoIns = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(convoIns!.rows[0].client_id).toBe('existing-client')
  })

  it('no phone at all → no client/lead/deal created (anonymous browsing stays anonymous)', async () => {
    const res = await chat({ message: 'what are your hours?' })
    expect(res.status).toBe(200)

    expect(h.capture.inserts.find((i) => i.table === 'clients')).toBeUndefined()
    expect(h.capture.inserts.find((i) => i.table === 'deals')).toBeUndefined()
  })
})
