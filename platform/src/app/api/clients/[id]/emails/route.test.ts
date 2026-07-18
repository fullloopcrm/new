import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/clients/[id]/emails — manual outbound email from the client
 * detail page compose box.
 *
 * Covers: respects isCommEnabled() gate (blocked when tenant has manual email
 * off), the sent message appears in the transcript (client_emails insert),
 * permission-gated on clients.edit (not open to every role), and GET returns
 * the logged transcript.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: {
        id: A,
        name: 'Acme',
        slug: 'acme',
        email_from: null,
        resend_api_key: 'tenant-resend-key',
      },
      role: roleHolder.role,
    })),
  }
})

const commHolder = vi.hoisted(() => ({ enabled: true as boolean }))
vi.mock('@/lib/comms-prefs', () => ({
  isCommEnabled: vi.fn(async () => commHolder.enabled),
}))

type SendEmailArgs = { to: string; subject: string; html: string; from?: string; resendApiKey?: string | null }
const spies = vi.hoisted(() => ({ sendEmail: vi.fn(async (_args: SendEmailArgs) => ({ id: 'em-1' })) }))
vi.mock('@/lib/email', () => ({
  sendEmail: spies.sendEmail,
  tenantSender: (t: { name?: string | null }) => `${t?.name || 'Acme'} <acme@fullloopcrm.com>`,
}))

import { GET, POST } from './route'

function seed() {
  return {
    clients: [{ id: 'c-1', tenant_id: A, email: 'client@example.com' }],
    client_emails: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
  commHolder.enabled = true
  spies.sendEmail.mockClear()
})

function post(id: string, body: Record<string, unknown>) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id }),
  })
}

function get(id: string) {
  return GET(new Request('http://t'), { params: Promise.resolve({ id }) })
}

describe('POST /api/clients/[id]/emails — manual email send', () => {
  it('sends the email and logs it into client_emails so it appears in the transcript', async () => {
    const res = await post('c-1', { subject: 'Quick update', body: 'Running late today, sorry!' })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(spies.sendEmail).toHaveBeenCalledTimes(1)
    expect(spies.sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'client@example.com',
      subject: 'Quick update',
      resendApiKey: 'tenant-resend-key',
    })
    expect(body.email.direction).toBe('outbound')
    expect(body.email.subject).toBe('Quick update')

    const saved = (h.seed.client_emails as Record<string, unknown>[]) || []
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      tenant_id: A,
      client_id: 'c-1',
      direction: 'outbound',
      subject: 'Quick update',
      body: 'Running late today, sorry!',
    })

    const listRes = await get('c-1')
    const list = await listRes.json()
    expect(list).toHaveLength(1)
    expect(list[0].subject).toBe('Quick update')
  })

  it('GATE: blocked when tenant has manual email turned off — nothing sent, nothing logged', async () => {
    commHolder.enabled = false
    const res = await post('c-1', { subject: 'Hi', body: 'Hello' })
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatch(/turned off/i)
    expect(spies.sendEmail).not.toHaveBeenCalled()
    expect((h.seed.client_emails as Record<string, unknown>[]) || []).toHaveLength(0)
  })

  it("PERMISSION PROBE: 'staff' role (no clients.edit) is forbidden and nothing is sent", async () => {
    roleHolder.role = 'staff'
    const res = await post('c-1', { subject: 'Hi', body: 'Hello' })
    expect(res.status).toBe(403)
    expect(spies.sendEmail).not.toHaveBeenCalled()
  })

  it('rejects a missing subject or body', async () => {
    const res1 = await post('c-1', { subject: '', body: 'Hello' })
    expect(res1.status).toBe(400)
    const res2 = await post('c-1', { subject: 'Hi', body: '' })
    expect(res2.status).toBe(400)
    expect(spies.sendEmail).not.toHaveBeenCalled()
  })
})
