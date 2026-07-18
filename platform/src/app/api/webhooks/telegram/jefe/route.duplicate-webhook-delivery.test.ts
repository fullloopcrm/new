import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * Telegram resends the SAME update_id if this route doesn't respond 200
 * promptly. Jefe's action tools (notify_tenant_owner, send_tenant_message,
 * rerun_cron) are confirm-gated by Jeff sending a plain "yes" as a
 * follow-up message — if THAT confirm message is the one redelivered, the
 * confirm=true tool call runs twice with no guard anywhere downstream.
 * Fix: insert-first-claim on telegram_webhook_updates(dedup_key), 23505 on
 * the claim short-circuits as an idempotent no-op before askJefe (and any
 * tool it calls) ever runs.
 */

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))

const askJefe = vi.fn().mockResolvedValue({ text: 'confirmed, sending now' })
vi.mock('@/lib/jefe/agent', () => ({ askJefe: (...args: unknown[]) => askJefe(...args) }))

vi.mock('@/lib/jefe/actions', () => ({
  loadJefeHistory: vi.fn(async () => []),
  saveJefeTurn: vi.fn(async () => {}),
}))

const sendTelegram = vi.fn().mockResolvedValue({ ok: true, status: 200, body: '{}' })
vi.mock('@/lib/telegram', () => ({ sendTelegram: (...args: unknown[]) => sendTelegram(...args) }))

const OWNER_CHAT_ID = 555

function update(updateId: number | undefined, text: string) {
  const body = JSON.stringify({
    ...(updateId !== undefined ? { update_id: updateId } : {}),
    message: { chat: { id: OWNER_CHAT_ID }, text },
  })
  return new Request('http://x/api/webhooks/telegram/jefe', { method: 'POST', body })
}

let POST: typeof import('./route').POST

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  delete process.env.TELEGRAM_WEBHOOK_SECRET
  process.env.JEFE_BOT_TOKEN = 'jefe-bot-token'
  process.env.JEFE_OWNER_CHAT_ID = String(OWNER_CHAT_ID)
  h.fake = createFakeSupabase({})
  h.fake!._addUniqueConstraint('telegram_webhook_updates', 'dedup_key')
  ;({ POST } = await import('./route'))
})

describe('POST /api/webhooks/telegram/jefe — redelivered update dedup', () => {
  it('a redelivered "yes" confirmation does not re-invoke askJefe (would double-fire a confirm-gated action)', async () => {
    const first = await POST(update(777, 'yes'))
    expect((await first.json()).action).toBeUndefined()
    expect(askJefe).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)

    const redelivery = await POST(update(777, 'yes'))
    const redeliveryBody = await redelivery.json()

    expect(redeliveryBody.action).toBe('duplicate_delivery')
    // The real bug: without the claim, this second call would re-run Jefe
    // with confirm=true still in context — a real SMS/email/cron re-fire
    // executed twice from one human "yes".
    expect(askJefe).toHaveBeenCalledTimes(1)
    expect(sendTelegram).toHaveBeenCalledTimes(1)
  })

  it('two different update ids both process normally', async () => {
    await POST(update(1, 'status report'))
    await POST(update(2, 'yes'))

    expect(askJefe).toHaveBeenCalledTimes(2)
  })

  it('an update with no update_id (malformed/legacy payload) still processes — dedup is best-effort, not a hard requirement', async () => {
    await POST(update(undefined, 'status report'))
    expect(askJefe).toHaveBeenCalledTimes(1)
  })
})
