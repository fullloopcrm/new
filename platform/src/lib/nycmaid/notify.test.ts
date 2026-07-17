/**
 * `report_issue` and `request_callback` are documented identically in
 * selena/core.ts's tool list ("Notifies admin[...]") and both call this
 * notify() with `type: 'client_issue'` / `type: 'callback_requested'`
 * respectively. TELEGRAM_NOTIFY_TYPES only had 'callback_requested' — a
 * client complaint (feedback_negative -> report_issue, per core.ts's own
 * routing comment) landed in the dashboard notifications feed only, never
 * reaching Jeff's phone the way a callback request already did. Same
 * "notifies admin" claim, two different real outcomes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { insertMock, sendPushToAllMock, notifyOwnerOnTelegramMock, sendTelegramMock } = vi.hoisted(() => ({
  insertMock: vi.fn(async () => ({ error: null })),
  sendPushToAllMock: vi.fn(async () => {}),
  notifyOwnerOnTelegramMock: vi.fn(async () => null),
  sendTelegramMock: vi.fn(async () => null),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: () => ({ insert: insertMock, select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }) },
}))
vi.mock('@/lib/nycmaid/push', () => ({ sendPushToAll: sendPushToAllMock }))
vi.mock('@/lib/telegram', () => ({
  notifyOwnerOnTelegram: notifyOwnerOnTelegramMock,
  sendTelegram: sendTelegramMock,
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('next/headers', () => ({ headers: async () => new Map() }))

import { notify } from './notify'

describe('nycmaid notify() — Telegram routing', () => {
  beforeEach(() => {
    insertMock.mockClear()
    sendPushToAllMock.mockClear()
    notifyOwnerOnTelegramMock.mockClear()
    sendTelegramMock.mockClear()
  })

  it('pushes a client_issue (report_issue tool) to Telegram, same as callback_requested', async () => {
    await notify({ type: 'client_issue', title: 'Issue — Jane (high)', message: 'Jane reported: no-show' })
    expect(notifyOwnerOnTelegramMock).toHaveBeenCalledTimes(1)
  })

  it('still does not push dashboard-only chatter like security to Telegram', async () => {
    await notify({ type: 'security', title: 'Admin Login', message: 'PIN login' })
    expect(notifyOwnerOnTelegramMock).not.toHaveBeenCalled()
  })
})
