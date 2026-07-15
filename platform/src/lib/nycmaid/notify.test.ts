import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

/**
 * lib/nycmaid/notify.ts's notify() is called from ~15 routes, many WITHOUT an
 * explicit tenantId — relying on its request-scoped fallback to read
 * x-tenant-id from headers. Two confirmed-reachable, fully unauthenticated
 * call sites never pass tenantId at all: /api/auth/login (every branch —
 * success, PIN login, failed-attempt alert) and /api/yinez's catch-all error
 * notify (which fires from a req.json() parse failure, BEFORE that route's
 * own x-tenant-sig check runs).
 *
 * Before this fix, resolveTenantId() trusted x-tenant-id with no signature
 * check — unlike every other consumer of that header in this codebase
 * (getCurrentTenant, getTenantForRequest, getTenantFromHeaders, chat/route.ts,
 * yinez/route.ts's own top-of-handler check, pin-reset, errors/route.ts).
 * An unauthenticated POST to either route with a forged `x-tenant-id: <victim
 * tenant id>` header (no valid x-tenant-sig required) would write a
 * `notifications` row against the VICTIM tenant, and for
 * TELEGRAM_NOTIFY_TYPES (e.g. 'yinez_error'), trigger a real Telegram send
 * to that victim tenant's own configured bot/chat — a fully unauthenticated
 * cross-tenant write + external side effect, keyed on a forgeable header.
 */

process.env.TENANT_HEADER_SIG_SECRET = 'notify-test-secret'

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let insertCalls: Array<{ table: string; row: Record<string, unknown> }>

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => resolve(table, eqs),
    insert: async (row: Record<string, unknown>) => {
      insertCalls.push({ table, row })
      return { data: null, error: null }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const sendPushToAll = vi.fn(async (_title: string, _body: string, _url?: string, _tag?: string) => {})
vi.mock('@/lib/nycmaid/push', () => ({
  sendPushToAll: (title: string, body: string, url?: string, tag?: string) => sendPushToAll(title, body, url, tag),
}))

const sendTelegram = vi.fn(async (_chatId: string, _text: string, _botToken?: string) => ({ ok: true, status: 200, body: '' }))
const notifyOwnerOnTelegram = vi.fn(async (_text: string) => {})
vi.mock('@/lib/telegram', () => ({
  sendTelegram: (chatId: string, text: string, botToken?: string) => sendTelegram(chatId, text, botToken),
  notifyOwnerOnTelegram: (text: string) => notifyOwnerOnTelegram(text),
}))

vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: (s: string) => s,
}))

const mockHeaderStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => mockHeaderStore.get(name) ?? null }),
}))

import { signTenantHeader } from '@/lib/tenant-header-sig'
import { notify } from './notify'

const VICTIM_TENANT = 'tenant-victim'
const REAL_TENANT = 'tenant-real'

describe('nycmaid notify() — tenant resolution from headers', () => {
  beforeEach(() => {
    mockHeaderStore.clear()
    insertCalls = []
    sendPushToAll.mockClear()
    sendTelegram.mockClear()
    notifyOwnerOnTelegram.mockClear()
    resolve = (table) => {
      if (table === 'tenants') {
        return { data: { telegram_bot_token: 'victim-bot-token', telegram_chat_id: 'victim-chat' }, error: null }
      }
      return { data: null, error: null }
    }
  })

  it('WRONG-TENANT PROBE: forged x-tenant-id with NO signature is never trusted', async () => {
    mockHeaderStore.set('x-tenant-id', VICTIM_TENANT)
    // No x-tenant-sig at all — the shape of a raw curl request, not one that
    // passed through middleware.
    await notify({ type: 'yinez_error', title: 'Yinez Web Chat Error', message: 'boom' })

    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0].row).not.toHaveProperty('tenant_id')

    // 'yinez_error' is a TELEGRAM_NOTIFY_TYPES type — must fall back to the
    // global owner bot, never look up (and message) the victim's own bot.
    expect(sendTelegram).not.toHaveBeenCalled()
    expect(notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)
  })

  it('WRONG-TENANT PROBE: forged x-tenant-id with a WRONG signature is never trusted', async () => {
    mockHeaderStore.set('x-tenant-id', VICTIM_TENANT)
    mockHeaderStore.set('x-tenant-sig', signTenantHeader('some-other-tenant'))
    await notify({ type: 'yinez_error', title: 'Yinez Web Chat Error', message: 'boom' })

    expect(insertCalls[0].row).not.toHaveProperty('tenant_id')
    expect(sendTelegram).not.toHaveBeenCalled()
    expect(notifyOwnerOnTelegram).toHaveBeenCalledTimes(1)
  })

  it('a validly-signed x-tenant-id IS trusted (legitimate nycmaid request-scoped path)', async () => {
    mockHeaderStore.set('x-tenant-id', REAL_TENANT)
    mockHeaderStore.set('x-tenant-sig', signTenantHeader(REAL_TENANT))
    await notify({ type: 'yinez_error', title: 'Yinez Web Chat Error', message: 'boom' })

    expect(insertCalls[0].row.tenant_id).toBe(REAL_TENANT)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
    expect(sendTelegram.mock.calls[0][0]).toBe('victim-chat') // the RESOLVED tenant's own chat
    expect(notifyOwnerOnTelegram).not.toHaveBeenCalled()
  })

  it('an explicit tenantId argument always wins over the header, forged or not', async () => {
    mockHeaderStore.set('x-tenant-id', VICTIM_TENANT)
    await notify({ type: 'security', title: 'Admin Login', message: 'ok', tenantId: REAL_TENANT })

    expect(insertCalls[0].row.tenant_id).toBe(REAL_TENANT)
  })
})
