import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * anthropic-health cron — alert cooldown parity with nycmaid.
 *
 * nycmaid's `alertOnAnthropicFailure` alerts once per 30 min per failure kind
 * (system_state-backed there — "Jeff has no other signal that the agent is
 * dead," so alert hard but not on every tick). This cron runs every 15 min
 * (vercel.json), so a sustained outage without a cooldown means a fresh
 * Telegram alert every 15 minutes instead of one every 30. Fixed with a
 * notifications-table dedup (same pattern cron/comms-monitor already uses).
 */

const telegramAlerts: string[] = []
const insertedNotifications: Array<Record<string, unknown>> = []

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn(async () => {
        throw new Error('credit balance is too low')
      }),
    }
  },
}))

vi.mock('@/lib/telegram', () => ({
  notifyOwnerOnTelegram: vi.fn(async (text: string) => {
    telegramAlerts.push(text)
  }),
}))

let recentAlertRows: Array<{ id: string }>

function builder(table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    limit: () => chain,
    insert: (row: Record<string, unknown>) => {
      insertedNotifications.push(row)
      return { then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'notifications') return resolve({ data: recentAlertRows, error: null })
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/anthropic-health', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  telegramAlerts.length = 0
  insertedNotifications.length = 0
  recentAlertRows = []
})

describe('anthropic-health cron — alert cooldown', () => {
  it('alerts on a fresh failure (no recent alert on record)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(500)
    expect(telegramAlerts).toHaveLength(1)
    expect(telegramAlerts[0]).toContain('OUT OF CREDITS')
  })

  it('does NOT re-alert within the 30-minute cooldown window', async () => {
    recentAlertRows = [{ id: 'existing-alert' }]
    const res = await GET(req())
    expect(res.status).toBe(500)
    expect(telegramAlerts).toHaveLength(0)
    expect(insertedNotifications).toHaveLength(0)
  })
})
