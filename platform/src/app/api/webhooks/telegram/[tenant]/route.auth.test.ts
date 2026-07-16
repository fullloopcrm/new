/**
 * PER-TENANT TELEGRAM WEBHOOK AUTH — /api/webhooks/telegram/[tenant] POST.
 *
 * Same gap as the owner/jefe bots (see ../route.auth.test.ts): the prior
 * "auth" was matching telegram_chat_id from the (attacker-controlled) POST
 * body — not a real origin check. This suite proves the secret_token gate
 * rejects a forged update once a tenant has telegram_webhook_secret set
 * (populated on next bot-token save — see businesses/[id]/route.ts) and
 * ALSO rejects (fails closed) for tenants that haven't re-saved yet (NULL
 * secret) — an unconfigured secret must not silently accept traffic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => ({ text: 'unreachable', toolsCalled: [] })),
}))

vi.mock('@/lib/telegram', () => ({
  sendTelegram: vi.fn(async () => ({ ok: true, status: 200, body: '' })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { encryptSecret } from '@/lib/secret-crypto'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_SLUG = 'acme-cleaning'
const TENANT_ID = 'tenant-acme'

function seedTenant(overrides: Record<string, unknown> = {}) {
  fake._store.clear()
  fake._seed('tenants', [
    {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      telegram_bot_token: 'fake-bot-token',
      telegram_chat_id: '555',
      telegram_webhook_secret: null,
      ...overrides,
    },
  ])
}

function req(body: unknown, secretHeader?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secretHeader !== undefined) headers['x-telegram-bot-api-secret-token'] = secretHeader
  return new Request(`https://example.com/api/webhooks/telegram/${TENANT_SLUG}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function params() {
  return { params: Promise.resolve({ tenant: TENANT_SLUG }) }
}

describe('POST /api/webhooks/telegram/[tenant] — secret_token gate', () => {
  beforeEach(() => {
    process.env.SECRET_ENCRYPTION_KEY = '0'.repeat(64)
  })

  it('rejects a forged update with the wrong secret once the tenant has one configured', async () => {
    seedTenant({ telegram_webhook_secret: encryptSecret('tenant-real-secret') })

    const res = await POST(req({ message: { chat: { id: 555 }, text: 'do the thing' } }, 'guessed-secret'), params())
    expect(res.status).toBe(401)
  })

  it('rejects a missing secret header once the tenant has one configured', async () => {
    seedTenant({ telegram_webhook_secret: encryptSecret('tenant-real-secret') })

    const res = await POST(req({ message: { chat: { id: 555 }, text: 'do the thing' } }), params())
    expect(res.status).toBe(401)
  })

  it('rejects everything (fails closed) when telegram_webhook_secret is NULL', async () => {
    seedTenant({ telegram_webhook_secret: null })

    const res = await POST(req({ message: { chat: { id: 555 }, text: 'hi' } }), params())
    expect(res.status).toBe(401)
  })
})

describe('POST /api/webhooks/telegram/[tenant] — chat-id ownership gate fails closed', () => {
  beforeEach(() => {
    process.env.SECRET_ENCRYPTION_KEY = '0'.repeat(64)
  })

  // WRONG-TENANT PROBE: bot token saved (secret configured, gate active) but
  // telegram_chat_id not yet set — the pre-fix `tenant.telegram_chat_id &&
  // mismatch` check short-circuited false here, admitting ANY chat with
  // owner-tier agent access instead of rejecting as private.
  it('rejects an arbitrary chat when telegram_chat_id is not yet configured', async () => {
    seedTenant({ telegram_webhook_secret: encryptSecret('tenant-real-secret'), telegram_chat_id: null })

    const res = await POST(
      req({ message: { chat: { id: 999999 }, text: 'do the thing' } }, 'tenant-real-secret'),
      params()
    )
    const json = await res.json()
    expect(json.private).toBe(true)
  })

  it('still admits the registered owner chat once telegram_chat_id is set', async () => {
    seedTenant({ telegram_webhook_secret: encryptSecret('tenant-real-secret'), telegram_chat_id: '555' })

    const res = await POST(
      req({ message: { chat: { id: 555 }, text: 'do the thing' } }, 'tenant-real-secret'),
      params()
    )
    const json = await res.json()
    expect(json.private).toBeUndefined()
  })
})
