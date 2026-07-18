import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 — nycmaid `notify()`'s header-fallback tenant resolution must verify
 * x-tenant-sig, same fix as src/lib/notify.tenant-header-spoof.test.ts.
 *
 * This variant is the LIVE exploitable path: /api/yinez (fully public,
 * unauthenticated, no signature required to even reach the route) calls this
 * notify() without a tenantId at three call sites. Before the fix, an
 * attacker could POST directly to the main host with a forged x-tenant-id
 * header and cause a Telegram alert to be pushed straight into an arbitrary
 * VICTIM tenant's own configured bot/chat (type 'new_lead' / 'new_booking' /
 * 'yinez_error' are all in TELEGRAM_NOTIFY_TYPES) — with attacker-controlled
 * text landing in that tenant's real business Telegram feed.
 *
 * This locks: a forged/unsigned header must never reach the victim's own
 * Telegram (falls back to the global platform channel instead, same as "no
 * tenant resolved"), and only a validly-signed header routes to that
 * tenant's bot.
 */

const REAL_TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const VICTIM_TENANT = 'cccccccc-9999-8888-7777-666666666666'

const tenantTelegramConfig: Record<string, { telegram_bot_token: string; telegram_chat_id: string }> = {
  [REAL_TENANT]: { telegram_bot_token: 'enc-token', telegram_chat_id: 'real-chat-id' },
  [VICTIM_TENANT]: { telegram_bot_token: 'enc-token-victim', telegram_chat_id: 'victim-chat-id' },
}

const notificationInserts: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        if (table === 'notifications') notificationInserts.push(payload)
        return { then: (res: (v: unknown) => unknown) => res({ error: null }) }
      },
      select: () => ({
        eq: (_col: string, val: string) => ({
          single: async () => ({ data: tenantTelegramConfig[val] || null, error: null }),
        }),
      }),
    }),
  },
}))

const sendTelegram = vi.fn(async (_chatId: string, _text: string, _token: string) => {})
const notifyOwnerOnTelegram = vi.fn(async (_text: string) => {})
vi.mock('@/lib/telegram', () => ({
  sendTelegram: (chatId: string, text: string, token: string) => sendTelegram(chatId, text, token),
  notifyOwnerOnTelegram: (text: string) => notifyOwnerOnTelegram(text),
}))
vi.mock('@/lib/nycmaid/push', () => ({ sendPushToAll: async () => {} }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => `decrypted:${v}` }))

const requestHeaders = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => requestHeaders.get(name) ?? null,
  }),
}))

import { notify } from '@/lib/nycmaid/notify'
import { signTenantHeader } from '@/lib/tenant-header-sig'

describe('nycmaid notify() — header-fallback tenant resolution requires a valid x-tenant-sig', () => {
  beforeEach(() => {
    notificationInserts.length = 0
    requestHeaders.clear()
    sendTelegram.mockClear()
    notifyOwnerOnTelegram.mockClear()
    vi.stubEnv('TENANT_HEADER_SIG_SECRET', 'canary-test-secret')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('forged x-tenant-id (no/garbage x-tenant-sig) never reaches the victim tenant\'s own Telegram bot', async () => {
    requestHeaders.set('x-tenant-id', VICTIM_TENANT)
    requestHeaders.set('x-tenant-sig', 'not-a-real-signature')

    await notify({ type: 'new_lead', title: 'New Web Chat Lead', message: 'attacker-controlled text' })

    // Falls back to the global platform channel, NOT the victim's own bot.
    expect(sendTelegram).not.toHaveBeenCalled()
    expect(notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)

    // Notification row is unscoped (no tenant_id), not attributed to the victim.
    expect(notificationInserts).toHaveLength(1)
    expect(notificationInserts[0].tenant_id).toBeUndefined()
  })

  it('a validly-signed x-tenant-id routes the Telegram alert to that exact tenant\'s own bot', async () => {
    requestHeaders.set('x-tenant-id', REAL_TENANT)
    requestHeaders.set('x-tenant-sig', signTenantHeader(REAL_TENANT))

    await notify({ type: 'new_lead', title: 'New Web Chat Lead', message: 'legit request' })

    expect(sendTelegram).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledWith('real-chat-id', expect.stringContaining('legit request'), 'decrypted:enc-token')
    expect(notifyOwnerOnTelegram).not.toHaveBeenCalled()

    expect(notificationInserts).toHaveLength(1)
    expect(notificationInserts[0].tenant_id).toBe(REAL_TENANT)
  })

  it('a victim id paired with a DIFFERENT tenant\'s valid signature is rejected (sig/id mismatch)', async () => {
    requestHeaders.set('x-tenant-id', VICTIM_TENANT)
    requestHeaders.set('x-tenant-sig', signTenantHeader(REAL_TENANT)) // wrong id signed

    await notify({ type: 'new_lead', title: 'New Web Chat Lead', message: 'attacker-controlled text' })

    expect(sendTelegram).not.toHaveBeenCalled()
    expect(notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)
    expect(notificationInserts[0].tenant_id).toBeUndefined()
  })
})
