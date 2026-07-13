import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression test for the send_message_to_client email brand leak: the email
 * subject used to hardcode "Message from The NYC Maid" for every tenant,
 * regardless of which business actually owns the conversation. Proves the
 * subject is now derived from the tenant's own name.
 */

type Row = Record<string, unknown>
let tenants: Row[]
let clients: Row[]

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const source = table === 'tenants' ? tenants : table === 'clients' ? clients : []
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    maybeSingle: () => {
      const row = source.find((r) => Object.entries(eqs).every(([k, v]) => r[k] === v)) || null
      return Promise.resolve({ data: row, error: null })
    },
    single: () => {
      const row = source.find((r) => Object.entries(eqs).every(([k, v]) => r[k] === v)) || null
      return Promise.resolve({ data: row, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const sendEmailMock = vi.fn(async (_to: string, _subject: string, _html: string) => ({ ok: true }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: (...args: [string, string, string]) => sendEmailMock(...args) }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => []) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => 'unused-default-tenant') }))
vi.mock('@/lib/selena/agent', () => ({ isOwner: () => true }))
vi.mock('@/lib/selena/core', () => ({
  handleTool: vi.fn(async () => ''),
  EMPTY_CHECKLIST: {},
}))

import { runTool } from './tools'

beforeEach(() => {
  sendEmailMock.mockClear()
  tenants = [
    { id: 'tenant-nycmaid', name: 'The NYC Maid' },
    { id: 'tenant-towtruck', name: "Ray's Towing" },
  ]
  clients = [
    { id: 'client-1', tenant_id: 'tenant-nycmaid', name: 'Alice', email: 'alice@example.com', phone: '5551234567' },
    { id: 'client-2', tenant_id: 'tenant-towtruck', name: 'Bob', email: 'bob@example.com', phone: '5557654321' },
  ]
})

describe('send_message_to_client — email subject is tenant-aware, not hardcoded', () => {
  it("uses the nycmaid tenant's own name for its client", async () => {
    await runTool(
      'send_message_to_client',
      { client_id: 'client-1', message: 'hi', channel: 'email' },
      'convo-1',
      '+12122029220',
      { text: '', checklist: {} } as never,
      'tenant-nycmaid',
    )
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][1]).toBe('Message from The NYC Maid')
  })

  it("uses a non-nycmaid tenant's own name for its client, never the nycmaid brand", async () => {
    await runTool(
      'send_message_to_client',
      { client_id: 'client-2', message: 'hi', channel: 'email' },
      'convo-2',
      '+12122029220',
      { text: '', checklist: {} } as never,
      'tenant-towtruck',
    )
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][1]).toBe("Message from Ray's Towing")
    expect(sendEmailMock.mock.calls[0][1]).not.toContain('NYC Maid')
  })
})
