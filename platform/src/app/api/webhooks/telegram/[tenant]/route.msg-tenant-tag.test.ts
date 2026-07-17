import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in the per-tenant
 * Telegram webhook (POST /api/webhooks/telegram/[tenant]).
 *
 * sms_conversation_messages.tenant_id has a column DEFAULT of 'nycmaid' (the
 * rollout safety net added by migrations/2026_05_09_tenant_id_core.sql). Both
 * message inserts (inbound + outbound) omitted tenant_id, mis-tagging every
 * OTHER tenant's owner-bot message as nycmaid's and hiding it from that
 * tenant's own tenant-scoped GET ?convoId read. Same gap already fixed on the
 * selena/chat/yinez/admin-chat siblings; tracked as P2 "write-side siblings"
 * in deploy-prep/idor-remediation-status.md.
 *
 * FIX: both inserts now carry `tenant_id: tenant.id` explicitly.
 */

const TENANT_ID = 'tenant-msg-tag'
const SLUG = 'acme'

const h = vi.hoisted(() => {
  const captured = { messageInserts: [] as Record<string, unknown>[] }
  const tenantRow = {
    id: 'tenant-msg-tag',
    slug: 'acme',
    telegram_bot_token: 'encrypted-token',
    telegram_chat_id: null as string | null,
  }

  function makeBuilder(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => {
        if (table === 'sms_conversations') return Promise.resolve({ data: [], error: null })
        return builder
      },
      single: () => {
        if (table === 'tenants') return Promise.resolve({ data: tenantRow, error: null })
        return Promise.resolve({ data: null, error: null })
      },
      insert: (row: Record<string, unknown>) => {
        if (table === 'sms_conversation_messages') captured.messageInserts.push(row)
        if (table === 'sms_conversations') {
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: 'convo-1' }, error: null }) }),
          }
        }
        return { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) }
      },
      then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
    }
    return builder
  }

  const supabaseAdmin = { from: (table: string) => makeBuilder(table) }
  return { captured, supabaseAdmin, tenantRow }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn(() => 'decrypted-bot-token') }))
vi.mock('@/lib/telegram-webhook-auth', () => ({
  verifyTelegramWebhook: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '{}' })),
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'reply', toolsCalled: [] })),
}))

import { POST } from './route'

function makeRequest(): Request {
  return new Request(`http://localhost/api/webhooks/telegram/${SLUG}`, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ message: { chat: { id: 12345 }, text: 'hi owner' } }),
  })
}

beforeEach(() => {
  h.captured.messageInserts = []
})

describe('POST /api/webhooks/telegram/[tenant] — sms_conversation_messages inserts carry tenant_id', () => {
  it('stamps tenant.id on both the inbound and outbound message inserts', async () => {
    const res = await POST(makeRequest(), { params: Promise.resolve({ tenant: SLUG }) })
    expect(res.status).toBe(200)

    expect(h.captured.messageInserts).toHaveLength(2)
    for (const insert of h.captured.messageInserts) {
      expect(insert.tenant_id).toBe(TENANT_ID)
    }
  })
})
