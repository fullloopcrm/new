import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Twin of ai/assistant/route.updates-allowlist.test.ts (13bf5a27) -- this
 * admin copilot's update_client / update_bookings tool handlers had the
 * same unfixed gap: the model's tool-call `updates` object passed straight
 * into supabase .update() with no field allowlist. The Anthropic API does
 * not enforce a tool's declared input_schema on the model's actual output,
 * so a manipulated or prompt-injected conversation could get the model to
 * emit an `updates` object containing a column outside the declared set --
 * including `tenant_id` itself, moving a client/booking to an
 * attacker-controlled tenant via this service-role write.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentRole = 'admin'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    userId: 'user-1',
    tenantId: 'tenant-A',
    tenant: { id: 'tenant-A', name: 'Acme', industry: 'cleaning', anthropic_api_key: 'stored-key' },
    role: currentRole,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

let toolCallQueue: Array<{ name: string; input: Record<string, unknown> }> = []
let createCalls = 0
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({
    messages: {
      create: async () => {
        createCalls++
        if (createCalls === 1 && toolCallQueue.length > 0) {
          const call = toolCallQueue[0]
          return {
            stop_reason: 'tool_use',
            content: [{ type: 'tool_use', id: 'tool-1', name: call.name, input: call.input }],
          }
        }
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'done' }] }
      },
    },
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: 'update this client' }] }),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentRole = 'admin'
  createCalls = 0
  toolCallQueue = []
  fake._seed('clients', [
    { id: 'client-1', tenant_id: 'tenant-A', name: 'Smith Co', notes: 'original' },
  ])
  fake._seed('bookings', [
    { id: 'b1', tenant_id: 'tenant-A', price: 10000, status: 'scheduled' },
  ])
})

describe('admin/ai-chat update_client tool — updates must be allowlisted', () => {
  it('a tool call carrying a non-schema field (tenant_id) does NOT move the client to another tenant', async () => {
    toolCallQueue = [{
      name: 'update_client',
      input: { client_id: 'client-1', updates: { notes: 'updated', tenant_id: 'attacker-tenant' } },
    }]
    await POST(req())
    const client = fake._all('clients').find((c) => c.id === 'client-1')!
    expect(client.tenant_id).toBe('tenant-A')
    expect(client.notes).toBe('updated')
  })
})

describe('admin/ai-chat update_bookings tool — updates must be allowlisted', () => {
  it('a tool call carrying a non-schema field (tenant_id) does NOT move the booking to another tenant', async () => {
    toolCallQueue = [{
      name: 'update_bookings',
      input: { booking_ids: ['b1'], updates: { status: 'confirmed', tenant_id: 'attacker-tenant' }, confirmed: true },
    }]
    await POST(req())
    const booking = fake._all('bookings').find((b) => b.id === 'b1')!
    expect(booking.tenant_id).toBe('tenant-A')
    expect(booking.status).toBe('confirmed')
  })

  it("rejects a team_member_id belonging to another tenant -- same FK-injection class as bookings/[id] PUT", async () => {
    fake._seed('team_members', [{ id: 'tm-foreign', tenant_id: 'attacker-tenant', name: 'Foreign Member' }])
    toolCallQueue = [{
      name: 'update_bookings',
      input: { booking_ids: ['b1'], updates: { team_member_id: 'tm-foreign' }, confirmed: true },
    }]
    await POST(req())
    const booking = fake._all('bookings').find((b) => b.id === 'b1')!
    expect(booking.team_member_id).not.toBe('tm-foreign')
  })
})
