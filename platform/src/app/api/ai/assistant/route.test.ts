/**
 * Sibling of the admin/ai-chat copilot (item (90)) — this AI assistant's
 * `get_schedule_summary` tool defaulted its date to
 * `new Date().toISOString().split('T')[0]` (server/UTC "today"), and its
 * system prompt's own "Today is ..." line had NO timeZone at all (server
 * runtime default, UTC on Vercel) — worse than the admin/ai-chat sibling's
 * hardcoded America/New_York, since it drifted for every tenant including
 * ET ones. Same day-boundary bug shape as item (70).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

let currentTimezone: string
let capturedGte: string | undefined
let capturedLte: string | undefined

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 'tenant-A',
    tenant: { name: 'Acme Cleaning', industry: 'cleaning', anthropic_api_key: 'fake-key', timezone: currentTimezone },
    role: 'owner',
  }),
  AuthError: class AuthError extends Error {
    status = 401
  },
}))

vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: vi
        .fn()
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [{ type: 'tool_use', id: 'call-1', name: 'get_schedule_summary', input: {} }],
        })
        .mockResolvedValueOnce({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: 'Here you go.' }],
        }),
    },
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: (_col: string, val: string) => {
            capturedGte = val
            return {
              lte: (_col2: string, val2: string) => {
                capturedLte = val2
                return {
                  in: () => ({
                    order: () => ({ data: [], error: null }),
                  }),
                }
              },
            }
          },
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function chatRequest() {
  return { json: async () => ({ messages: [{ role: 'user', content: 'what do I have today?' }] }) } as unknown as Request
}

describe('POST /api/ai/assistant — get_schedule_summary default date uses tenant timezone', () => {
  beforeEach(() => {
    currentTimezone = 'America/New_York'
    capturedGte = undefined
    capturedLte = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults the missing date to "today" in the tenant zone, not the UTC server clock', async () => {
    // 2026-01-15 21:00 America/New_York == 2026-01-16 02:00 UTC (ET is UTC-5 in January).
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-16T02:00:00.000Z'))

    await POST(chatRequest())

    expect(capturedGte).toBe('2026-01-15T00:00:00')
    expect(capturedLte).toBe('2026-01-15T23:59:59')
  })

  it('resolves a Pacific tenant correctly too, where the UTC gap is even wider', async () => {
    currentTimezone = 'America/Los_Angeles'
    // 2026-01-15 18:00 America/Los_Angeles == 2026-01-16 02:00 UTC (PT is UTC-8 in January).
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-16T02:00:00.000Z'))

    await POST(chatRequest())

    expect(capturedGte).toBe('2026-01-15T00:00:00')
  })
})
