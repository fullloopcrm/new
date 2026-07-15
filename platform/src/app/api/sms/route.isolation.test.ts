import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/sms?conversation_id=X (converted to tenantDb).
 *
 * The messages for a conversation are fetched by conversation_id via
 * supabaseAdmin (UNSCOPED), then gated by a tenantDb ownership check
 * (`.eq('tenant_id', ctx)`) that 404s if the conversation isn't the caller's.
 * The probe requests messages for ANOTHER tenant's conversation and asserts the
 * gate fires — a 404 with NO messages leaked — even though the raw message fetch
 * would have returned rows.
 *
 * Tenant isolation — POST /api/sms (new-conversation branch). `client_id` is a
 * caller-supplied FK; without an ownership check, a foreign client_id would be
 * written straight into this tenant's new sms_conversations row, and GET
 * /api/sms's `clients(name, phone)` embed would then leak that foreign
 * client's PII on the very next list fetch. The probe posts a foreign
 * tenant's client_id and asserts a 404 with NO conversation row created.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => ({ data: null, error: null })) }))

import { GET, POST } from './route'

function seed() {
  return {
    sms_conversations: [
      { id: 'cv-a', tenant_id: A },
      { id: 'cv-b', tenant_id: B },
    ],
    sms_conversation_messages: [
      { id: 'm-a', conversation_id: 'cv-a', direction: 'inbound', message: 'hello A' },
      { id: 'm-b', conversation_id: 'cv-b', direction: 'inbound', message: 'secret B' },
    ],
    clients: [
      { id: 'cl-a', tenant_id: A, phone: '2125551111' },
      { id: 'cl-b', tenant_id: B, phone: '3105552222' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function get(conversationId: string) {
  return GET(new NextRequest(`http://t/api/sms?conversation_id=${conversationId}`))
}

function post(body: Record<string, unknown>) {
  return POST(new NextRequest('http://t/api/sms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }))
}

describe('sms GET messages — tenant isolation', () => {
  it("positive control: tenant A reads its OWN conversation's messages", async () => {
    const res = await get('cv-a')
    expect(res.status).toBe(200)
    expect((await res.json()).messages).toHaveLength(1)
  })

  it("wrong-tenant probe: tenant B's conversation 404s — no messages leak", async () => {
    const res = await get('cv-b')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Conversation not found')
    expect(body.messages).toBeUndefined()
  })
})

describe('sms POST new-conversation client_id — tenant isolation', () => {
  it('positive control: tenant A starts a conversation with its OWN client', async () => {
    const res = await post({ client_id: 'cl-a', message: 'hi there' })
    expect(res.status).toBe(201)
    const created = h.capture.inserts.find((i) => i.table === 'sms_conversations')
    expect(created?.rows[0]).toMatchObject({ tenant_id: A, client_id: 'cl-a', phone: '2125551111' })
  })

  it("wrong-tenant probe: tenant B's client_id 404s — no conversation is created and no PII lands cross-tenant", async () => {
    const res = await post({ client_id: 'cl-b', message: 'hi there' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Client not found')
    const created = h.capture.inserts.find((i) => i.table === 'sms_conversations' && i.rows.some((r) => r.client_id === 'cl-b'))
    expect(created).toBeUndefined()
  })
})
