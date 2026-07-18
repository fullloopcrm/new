import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * W4 — claimTelegramUpdate backs the Telegram-webhook-retry dedup fix. See
 * telegram-webhook-dedup.ts for the full rationale (Telegram redelivers on a
 * slow ack; the 3 webhook routes run an LLM agent loop that can call
 * side-effecting owner tools).
 */

const insertMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => insertMock(table, row),
    }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('claimTelegramUpdate', () => {
  it('claims a fresh update_id and reports it as not a duplicate', async () => {
    insertMock.mockResolvedValue({ error: null })
    const { claimTelegramUpdate } = await import('@/lib/telegram-webhook-dedup')

    const result = await claimTelegramUpdate('platform-owner', 555)

    expect(result.isDuplicate).toBe(false)
    expect(insertMock).toHaveBeenCalledWith('telegram_webhook_events', { bot_scope: 'platform-owner', update_id: 555 })
  })

  it('treats a unique-constraint violation (23505) as a duplicate', async () => {
    insertMock.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })
    const { claimTelegramUpdate } = await import('@/lib/telegram-webhook-dedup')

    const result = await claimTelegramUpdate('jefe', 555)

    expect(result.isDuplicate).toBe(true)
  })

  it('fails open (not a duplicate) on a non-conflict DB error, e.g. table missing pre-migration', async () => {
    insertMock.mockResolvedValue({ error: { code: '42P01', message: 'relation does not exist' } })
    const { claimTelegramUpdate } = await import('@/lib/telegram-webhook-dedup')

    const result = await claimTelegramUpdate('tenant:abc', 555)

    expect(result.isDuplicate).toBe(false)
  })

  it('skips the claim entirely when update_id is missing (never blocks processing)', async () => {
    const { claimTelegramUpdate } = await import('@/lib/telegram-webhook-dedup')

    const result = await claimTelegramUpdate('platform-owner', undefined)

    expect(result.isDuplicate).toBe(false)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('scopes the claim per bot (same update_id, different scope, both treated as fresh)', async () => {
    insertMock.mockResolvedValue({ error: null })
    const { claimTelegramUpdate } = await import('@/lib/telegram-webhook-dedup')

    await claimTelegramUpdate('platform-owner', 777)
    await claimTelegramUpdate('tenant:xyz', 777)

    expect(insertMock).toHaveBeenNthCalledWith(1, 'telegram_webhook_events', { bot_scope: 'platform-owner', update_id: 777 })
    expect(insertMock).toHaveBeenNthCalledWith(2, 'telegram_webhook_events', { bot_scope: 'tenant:xyz', update_id: 777 })
  })
})
