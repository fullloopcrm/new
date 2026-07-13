import { describe, it, expect, vi, beforeEach } from 'vitest'

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      insert: (payload: unknown) => insert(table, payload),
    }),
  },
}))

import { claimWebhookEvent } from './webhook-dedupe'

describe('claimWebhookEvent', () => {
  beforeEach(() => {
    insert.mockReset()
  })

  it('fails closed and skips the DB when eventId is missing', async () => {
    const claimed = await claimWebhookEvent('resend', undefined)
    expect(claimed).toBe(false)
    expect(insert).not.toHaveBeenCalled()
  })

  it('fails closed and skips the DB when eventId is an empty string', async () => {
    const claimed = await claimWebhookEvent('resend', '')
    expect(claimed).toBe(false)
    expect(insert).not.toHaveBeenCalled()
  })

  it('claims successfully on first delivery (no error)', async () => {
    insert.mockResolvedValueOnce({ data: null, error: null })

    const claimed = await claimWebhookEvent('telnyx', 'evt_1', 'tenant_1')

    expect(claimed).toBe(true)
    expect(insert).toHaveBeenCalledWith('processed_webhook_events', {
      provider: 'telnyx',
      event_id: 'evt_1',
      tenant_id: 'tenant_1',
    })
  })

  it('defaults tenant_id to null when not provided', async () => {
    insert.mockResolvedValueOnce({ data: null, error: null })

    await claimWebhookEvent('telegram', 'evt_2')

    expect(insert).toHaveBeenCalledWith('processed_webhook_events', {
      provider: 'telegram',
      event_id: 'evt_2',
      tenant_id: null,
    })
  })

  it('returns false on a unique-violation replay (23505)', async () => {
    insert.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } })

    const claimed = await claimWebhookEvent('resend', 'evt_3')

    expect(claimed).toBe(false)
  })

  it('re-throws on an unexpected DB error so the caller 5xxs and the provider retries', async () => {
    insert.mockResolvedValueOnce({ data: null, error: { code: 'XX000', message: 'db is down' } })

    await expect(claimWebhookEvent('resend', 'evt_4')).rejects.toMatchObject({ code: 'XX000' })
  })
})
