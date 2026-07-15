import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/telegram/jefe (platform GM bot) had NO signature/secret
 * verification — only a body-supplied chat ID allowlist. This locks in:
 *   - JEFE_WEBHOOK_SECRET set + missing/wrong header => 401, never touches
 *     askJefe (fail-closed)
 *   - JEFE_WEBHOOK_SECRET set + correct header => passes verification
 *   - JEFE_WEBHOOK_SECRET unset => 401, never processes (fail-closed —
 *     flipped from the prior fail-open default)
 */

const askJefe = vi.fn()
vi.mock('@/lib/jefe/agent', () => ({ askJefe: (...args: unknown[]) => askJefe(...args) }))

const loadJefeHistory = vi.fn(async (..._args: unknown[]) => [])
const saveJefeTurn = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/jefe/actions', () => ({
  loadJefeHistory: (...args: unknown[]) => loadJefeHistory(...args),
  saveJefeTurn: (...args: unknown[]) => saveJefeTurn(...args),
}))

const sendTelegram = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, body: '' }))
vi.mock('@/lib/telegram', () => ({ sendTelegram: (...args: unknown[]) => sendTelegram(...args) }))

function req(opts: { body?: object; secretHeader?: string | null } = {}): Request {
  return {
    json: async () => opts.body ?? {},
    headers: { get: (name: string) => (name.toLowerCase() === 'x-telegram-bot-api-secret-token' ? (opts.secretHeader ?? null) : null) },
  } as unknown as Request
}

beforeEach(() => {
  vi.resetModules()
  askJefe.mockReset()
  loadJefeHistory.mockClear()
  saveJefeTurn.mockClear()
  sendTelegram.mockClear()
  process.env.JEFE_BOT_TOKEN = 'jefe_test_token'
  process.env.JEFE_OWNER_CHAT_ID = '999'
})

describe('telegram jefe webhook — secret token verification', () => {
  it('secret configured, header missing => 401, never processes the update', async () => {
    process.env.JEFE_WEBHOOK_SECRET = 'jefe-secret'
    const { POST } = await import('./route')

    const res = await POST(req({ body: { message: { chat: { id: 999 }, text: 'status?' } } }))

    expect(res.status).toBe(401)
    expect(askJefe).not.toHaveBeenCalled()
  })

  it('secret configured, wrong header => 401, never processes the update', async () => {
    process.env.JEFE_WEBHOOK_SECRET = 'jefe-secret'
    const { POST } = await import('./route')

    const res = await POST(req({ body: { message: { chat: { id: 999 }, text: 'status?' } }, secretHeader: 'attacker-guess' }))

    expect(res.status).toBe(401)
    expect(askJefe).not.toHaveBeenCalled()
  })

  it('secret configured, correct header => passes verification and reaches business logic', async () => {
    process.env.JEFE_WEBHOOK_SECRET = 'jefe-secret'
    const { POST } = await import('./route')

    const res = await POST(req({ body: {}, secretHeader: 'jefe-secret' }))

    expect(res.status).toBe(200)
    expect((await res.json()).skip).toBe('no_chat_or_text')
  })

  it('secret NOT configured => 401, fails closed, never processes the update', async () => {
    delete process.env.JEFE_WEBHOOK_SECRET
    const { POST } = await import('./route')

    const res = await POST(req({ body: { message: { chat: { id: 999 }, text: 'status?' } } }))

    expect(res.status).toBe(401)
    expect(askJefe).not.toHaveBeenCalled()
  })
})
