import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 — REGRESSION LOCK for a write-side tenant-tagging gap in the platform
 * owner Telegram webhook (POST /api/webhooks/telegram).
 *
 * sms_conversation_messages.tenant_id has a column DEFAULT of 'nycmaid' (the
 * rollout safety net added by migrations/2026_05_09_tenant_id_core.sql). Both
 * message inserts (inbound + outbound) omitted tenant_id — they happened to
 * fall back to the same nycmaid default this route already uses for its
 * conversation row, but leaving it implicit was the same P2 write-side gap
 * fixed on the selena/chat/yinez/admin-chat siblings (tracked in
 * deploy-prep/idor-remediation-status.md).
 *
 * FIX: both inserts now carry `tenant_id: NYCMAID_TENANT_ID` explicitly.
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

const h = vi.hoisted(() => {
  const captured = { messageInserts: [] as Record<string, unknown>[] }

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
  return { captured, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/telegram-webhook-auth', () => ({
  verifyTelegramWebhook: vi.fn(() => ({ ok: true })),
}))
vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '{}' })),
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'reply', toolsCalled: [] })),
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

beforeEach(() => {
  vi.clearAllMocks()
  h.captured.messageInserts = []
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token'
  process.env.TELEGRAM_OWNER_CHAT_ID = '999999'
})

function makeRequest(): Request {
  return new Request('http://localhost/api/webhooks/telegram', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ message: { chat: { id: 999999 }, text: 'hi owner' } }),
  })
}

describe('POST /api/webhooks/telegram — sms_conversation_messages inserts carry tenant_id', () => {
  it('stamps NYCMAID_TENANT_ID on both the inbound and outbound message inserts', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    expect(h.captured.messageInserts).toHaveLength(2)
    for (const insert of h.captured.messageInserts) {
      expect(insert.tenant_id).toBe(NYCMAID_TENANT_ID)
    }
  })
})
