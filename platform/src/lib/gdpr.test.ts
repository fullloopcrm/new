import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── GDPR/CCPA right-to-be-forgotten workflow ──────────────────────────────
// requestClientDeletion opens a 30-day grace window (idempotent while a
// request is already pending); cancelClientDeletion reverts it within the
// window; purgeDueDeletions anonymizes PII in place (never deletes the row)
// once the window elapses, so aggregate/financial history survives.

type Call = { method: string; args: unknown[] }
type Query = { table: string; calls: Call[] }

let queries: Query[] = []
let pendingRequestRow: Record<string, unknown> | null = null
let dueRequests: Array<{ id: string; tenant_id: string; client_id: string }> = []
let insertedRequestId = 'new-request-id'
let clientUpdateShouldFail = new Set<string>()
let requestUpdateShouldFail = new Set<string>()

function makeBuilder(table: string) {
  const record: Query = { table, calls: [] }
  queries.push(record)
  const builder: Record<string, unknown> = {}
  const chain = ['select', 'eq', 'lte', 'insert', 'update']
  for (const m of chain) {
    builder[m] = vi.fn((...args: unknown[]) => {
      record.calls.push({ method: m, args })
      return builder
    })
  }

  builder.maybeSingle = vi.fn(() => {
    if (table === 'data_deletion_requests') {
      return Promise.resolve({ data: pendingRequestRow, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })

  builder.single = vi.fn(() => {
    if (table === 'data_deletion_requests') {
      const insertCall = record.calls.find((c) => c.method === 'insert')
      if (insertCall) {
        const payload = insertCall.args[0] as Record<string, unknown>
        return Promise.resolve({ data: { id: insertedRequestId, ...payload }, error: null })
      }
    }
    return Promise.resolve({ data: null, error: null })
  })

  builder.then = (resolve: (v: unknown) => void) => {
    if (table === 'clients' && record.calls.some((c) => c.method === 'update')) {
      const idArg = record.calls.find((c) => c.method === 'eq' && c.args[0] === 'id')?.args[1]
      if (clientUpdateShouldFail.has(String(idArg))) {
        return resolve({ data: null, error: { message: 'boom' } })
      }
      return resolve({ data: null, error: null })
    }
    if (table === 'data_deletion_requests') {
      if (record.calls.some((c) => c.method === 'update')) {
        const idArg = record.calls.find((c) => c.method === 'eq' && c.args[0] === 'id')?.args[1]
        if (requestUpdateShouldFail.has(String(idArg))) {
          return resolve({ data: null, error: { message: 'boom' } })
        }
        return resolve({ data: null, error: null })
      }
      if (record.calls.some((c) => c.method === 'lte')) {
        return resolve({ data: dueRequests, error: null })
      }
    }
    return resolve({ data: [], error: null })
  }

  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => makeBuilder(table)),
  },
}))

import { requestClientDeletion, cancelClientDeletion, purgeDueDeletions, GDPR_GRACE_PERIOD_DAYS } from './gdpr'

describe('requestClientDeletion', () => {
  beforeEach(() => {
    queries = []
    pendingRequestRow = null
  })

  it('creates a new pending request with a purge_at ~30 days out', async () => {
    const { request, alreadyPending } = await requestClientDeletion('tenant-A', 'client-1', 'client', 'client-1')

    expect(alreadyPending).toBe(false)
    const requestedAt = new Date(request.requested_at).getTime()
    const purgeAt = new Date(request.purge_at).getTime()
    const daysApart = Math.round((purgeAt - requestedAt) / 86_400_000)
    expect(daysApart).toBe(GDPR_GRACE_PERIOD_DAYS)

    const clientUpdate = queries.find((q) => q.table === 'clients' && q.calls.some((c) => c.method === 'update'))
    expect(clientUpdate).toBeTruthy()
  })

  it('is idempotent — returns the existing request instead of creating a second one', async () => {
    pendingRequestRow = {
      id: 'existing-request',
      tenant_id: 'tenant-A',
      client_id: 'client-1',
      status: 'pending',
      requested_at: '2026-01-01T00:00:00.000Z',
      purge_at: '2026-01-31T00:00:00.000Z',
    }

    const { request, alreadyPending } = await requestClientDeletion('tenant-A', 'client-1', 'admin', 'admin')

    expect(alreadyPending).toBe(true)
    expect(request.id).toBe('existing-request')

    const insertCalled = queries.some((q) => q.table === 'data_deletion_requests' && q.calls.some((c) => c.method === 'insert'))
    expect(insertCalled).toBe(false)
  })
})

describe('cancelClientDeletion', () => {
  beforeEach(() => {
    queries = []
    pendingRequestRow = null
  })

  it('cancels a pending request and clears the client grace-period fields', async () => {
    pendingRequestRow = { id: 'existing-request', status: 'pending' }

    const { cancelled } = await cancelClientDeletion('tenant-A', 'client-1')

    expect(cancelled).toBe(true)
    const requestUpdate = queries.find((q) => q.table === 'data_deletion_requests' && q.calls.some((c) => c.method === 'update'))
    expect(requestUpdate).toBeTruthy()
    const clientUpdate = queries.find((q) => q.table === 'clients' && q.calls.some((c) => c.method === 'update'))
    expect(clientUpdate).toBeTruthy()
  })

  it('no-ops when there is no pending request', async () => {
    pendingRequestRow = null

    const { cancelled } = await cancelClientDeletion('tenant-A', 'client-1')

    expect(cancelled).toBe(false)
    const anyUpdate = queries.some((q) => q.calls.some((c) => c.method === 'update'))
    expect(anyUpdate).toBe(false)
  })
})

describe('purgeDueDeletions', () => {
  beforeEach(() => {
    queries = []
    dueRequests = []
    insertedRequestId = 'new-request-id'
    clientUpdateShouldFail = new Set()
    requestUpdateShouldFail = new Set()
  })

  it('queries with no tenant filter (platform-wide) and only pending + elapsed requests', async () => {
    dueRequests = []
    await purgeDueDeletions()

    const dueQuery = queries.find((q) => q.table === 'data_deletion_requests' && q.calls.some((c) => c.method === 'lte'))
    expect(dueQuery).toBeTruthy()
    const scopedByTenant = dueQuery!.calls.some((c) => c.method === 'eq' && c.args[0] === 'tenant_id')
    expect(scopedByTenant).toBe(false)
    const scopedByStatus = dueQuery!.calls.some((c) => c.method === 'eq' && c.args[0] === 'status' && c.args[1] === 'pending')
    expect(scopedByStatus).toBe(true)
  })

  it('anonymizes the client row and marks the request completed, across tenants', async () => {
    dueRequests = [
      { id: 'req-1', tenant_id: 'tenant-A', client_id: 'client-1' },
      { id: 'req-2', tenant_id: 'tenant-B', client_id: 'client-2' },
    ]

    const { purged, failed } = await purgeDueDeletions()

    expect(purged).toEqual(['req-1', 'req-2'])
    expect(failed).toEqual([])

    for (const clientId of ['client-1', 'client-2']) {
      const update = queries.find(
        (q) => q.table === 'clients' && q.calls.some((c) => c.method === 'eq' && c.args[0] === 'id' && c.args[1] === clientId)
      )
      const payload = update!.calls.find((c) => c.method === 'update')!.args[0] as Record<string, unknown>
      expect(payload.name).not.toBe(undefined)
      expect(payload.email).toBeNull()
      expect(payload.phone).toBeNull()
      expect(payload.deleted_at).toBeTruthy()
      expect(payload.status).toBe('deleted')
    }
  })

  it('does not mark the request completed when the client anonymize update fails', async () => {
    dueRequests = [{ id: 'req-1', tenant_id: 'tenant-A', client_id: 'client-1' }]
    clientUpdateShouldFail = new Set(['client-1'])

    const { purged, failed } = await purgeDueDeletions()

    expect(purged).toEqual([])
    expect(failed).toEqual(['req-1'])

    const requestUpdate = queries.find(
      (q) => q.table === 'data_deletion_requests' && q.calls.some((c) => c.method === 'update')
    )
    expect(requestUpdate).toBeFalsy()
  })

  it('keeps processing remaining requests when one fails', async () => {
    dueRequests = [
      { id: 'req-1', tenant_id: 'tenant-A', client_id: 'client-1' },
      { id: 'req-2', tenant_id: 'tenant-B', client_id: 'client-2' },
    ]
    clientUpdateShouldFail = new Set(['client-1'])

    const { purged, failed } = await purgeDueDeletions()

    expect(failed).toEqual(['req-1'])
    expect(purged).toEqual(['req-2'])
  })
})
