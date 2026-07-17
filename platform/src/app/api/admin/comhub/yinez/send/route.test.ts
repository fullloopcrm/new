import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4: comhub's own web-based admin chat ("Yinez") passed channel:'telegram'
 * to askSelena() — copy-paste from the real Telegram bot webhook. agent.ts's
 * channelNote hardcodes, ONLY for channel==='telegram': "The person here is
 * ALWAYS Jeff (the owner)... No client warmth... Terse, direct" — a false
 * identity claim baked into the system prompt for every tenant's comhub
 * admin chat, plus wrong channel attribution in Selena usage metrics
 * (byChannel.telegram instead of byChannel.web). The sibling admin-chat
 * route already uses 'web' for the same kind of admin-realm chat — this
 * locks comhub's Yinez chat onto the same, correct channel.
 */

const TENANT_ID = 'tenant-a'

const mock = vi.hoisted(() => {
  const state = {
    askSelenaCalls: [] as Array<{ channel: string; message: string; conversationId: string; phone?: string }>,
  }

  const supabaseAdmin = {
    from: () => ({
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ error: null }) }),
      update: () => ({
        eq: () => ({
          eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ error: null }) }),
        }),
      }),
    }),
    rpc: async (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
      return { data: null, error: null }
    },
  }

  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_ID) }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (channel: string, message: string, conversationId: string, phone?: string) => {
    mock.state.askSelenaCalls.push({ channel, message, conversationId, phone })
    return { text: 'ok', toolsCalled: [] }
  }),
}))

import { POST } from './route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/comhub/yinez/send', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  mock.state.askSelenaCalls = []
})

describe("comhub yinez/send — askSelena channel is 'web', not 'telegram'", () => {
  it("calls askSelena with channel 'web' for a comhub admin-chat message", async () => {
    const res = await POST(makeRequest({ body: 'how many bookings today?' }) as never)
    expect(res.status).toBe(200)

    expect(mock.state.askSelenaCalls).toHaveLength(1)
    expect(mock.state.askSelenaCalls[0].channel).toBe('web')
    expect(mock.state.askSelenaCalls[0].channel).not.toBe('telegram')
  })
})
