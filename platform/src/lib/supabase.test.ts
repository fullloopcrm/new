import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * supabaseAdmin.from(table).insert/update/upsert/delete(...) is now
 * instrumented (P9) to mirror every write to tenant_audit_log when a
 * request-scoped actor is known (audit-context.ts). This is a runtime
 * behavior change to the single client every write route in the app shares,
 * so it's verified against a mocked fetch rather than just type-checked:
 *   - the original write still executes with the right method/url/body
 *   - the original caller's result (data/error, and chaining like
 *     .select().single()) is unaffected
 *   - a second request lands on tenant_audit_log with the actor + table +
 *     action, but only when an actor is present
 *   - writes to the audit tables themselves never re-audit (no recursion)
 *   - plain reads (.select() with no mutating method) never touch the log
 */

type FetchCall = { url: string; method: string; body: unknown }
let calls: FetchCall[]
let actor: unknown

vi.mock('./audit-context', () => ({
  getAuditActor: () => actor,
}))

function jsonResponse(status: number, body: unknown): Response {
  const text = body === undefined ? '' : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status < 300 ? 'OK' : 'Error',
    headers: { get: () => null },
    text: async () => text,
  } as unknown as Response
}

beforeEach(() => {
  calls = []
  actor = undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { method: string; body?: string }) => {
      calls.push({ url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : undefined })
      const table = String(url).split('/rest/v1/')[1]?.split('?')[0]
      if (table === 'clients') return jsonResponse(201, [{ id: 'client-1', name: 'Jane' }])
      if (table === 'tenant_audit_log') return jsonResponse(201, [{ id: 'audit-1' }])
      if (table === 'impersonation_events') return jsonResponse(201, [{ id: 'imp-1' }])
      return jsonResponse(200, [])
    }),
  )
})

const testActor = {
  actorKind: 'clerk_user' as const,
  actorId: 'user-1',
  actorRole: 'staff',
  tenantId: 'tenant-1',
  path: '/api/clients',
  method: 'POST',
  ip: '1.2.3.4',
  userAgent: 'vitest',
}

describe('supabaseAdmin write auditing', () => {
  it('mirrors an insert to tenant_audit_log when an actor is present', async () => {
    actor = testActor
    const { supabaseAdmin } = await import('./supabase')

    const { data, error } = await supabaseAdmin.from('clients').insert({ name: 'Jane' }).select()

    expect(error).toBeNull()
    expect(data).toEqual([{ id: 'client-1', name: 'Jane' }])

    const writeCall = calls.find((c) => c.url.includes('/rest/v1/clients'))
    const auditCall = calls.find((c) => c.url.includes('/rest/v1/tenant_audit_log'))
    expect(writeCall).toBeTruthy()
    expect(auditCall).toBeTruthy()
    expect(auditCall!.body).toMatchObject({
      actor_kind: 'clerk_user',
      actor_id: 'user-1',
      actor_role: 'staff',
      tenant_id: 'tenant-1',
      table_name: 'clients',
      action: 'insert',
      record_id: 'client-1',
      path: '/api/clients',
    })
  })

  it('does not log a write when no actor is bound (e.g. a cron/webhook write)', async () => {
    actor = undefined
    const { supabaseAdmin } = await import('./supabase')

    await supabaseAdmin.from('clients').insert({ name: 'Jane' }).select().single()

    expect(calls.some((c) => c.url.includes('/rest/v1/tenant_audit_log'))).toBe(false)
  })

  it('never re-audits writes to the audit tables themselves', async () => {
    actor = testActor
    const { supabaseAdmin } = await import('./supabase')

    await supabaseAdmin.from('tenant_audit_log').insert({ table_name: 'x' })
    await supabaseAdmin.from('impersonation_events').insert({ actor_id: 'x' })

    // Exactly the two direct writes — no third/fourth call recursively
    // auditing either of them.
    expect(calls).toHaveLength(2)
  })

  it('does not touch plain reads', async () => {
    actor = testActor
    const { supabaseAdmin } = await import('./supabase')

    await supabaseAdmin.from('clients').select('*').eq('id', 'client-1')

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('GET')
  })

  it('logs update/upsert/delete with the right action', async () => {
    actor = testActor
    const { supabaseAdmin } = await import('./supabase')

    await supabaseAdmin.from('clients').update({ name: 'X' }).eq('id', 'client-1')
    await supabaseAdmin.from('clients').upsert({ id: 'client-1' })
    await supabaseAdmin.from('clients').delete().eq('id', 'client-1')

    const actions = calls
      .filter((c) => c.url.includes('/rest/v1/tenant_audit_log'))
      .map((c) => (c.body as { action: string }).action)
    expect(actions).toEqual(['update', 'upsert', 'delete'])
  })

  it('does not block or fail the write if the audit insert itself errors', async () => {
    actor = testActor
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: { method: string; body?: string }) => {
        calls.push({ url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : undefined })
        const table = String(url).split('/rest/v1/')[1]?.split('?')[0]
        if (table === 'tenant_audit_log') throw new Error('network down')
        return jsonResponse(201, [{ id: 'client-1' }])
      }),
    )
    const { supabaseAdmin } = await import('./supabase')

    const { data, error } = await supabaseAdmin.from('clients').insert({ name: 'Jane' }).select()
    expect(error).toBeNull()
    expect(data).toEqual([{ id: 'client-1' }])
  })
})
