import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], rpc: null as null | Harness['rpc'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t), rpc: (fn: string, args: Record<string, unknown>) => holder.rpc!(fn, args) },
}))
const auditMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/audit', () => ({ audit: auditMock }))

import {
  namesAgree,
  pickCanonical,
  hasJobSeqCollision,
  findDuplicatePairs,
  queueForReview,
  resolveFullMatch,
} from './client-dedupe'

function seed() {
  return {
    clients: [
      { id: 'a', tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@test.co', phone: '5551110000', notes: null, active: true, do_not_service: false, created_at: '2026-01-01T00:00:00Z' },
      { id: 'b', tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@test.co', phone: '5551110000', notes: null, active: true, do_not_service: false, created_at: '2026-02-01T00:00:00Z' },
      { id: 'c', tenant_id: TENANT_A, name: 'Someone Else', email: null, phone: '5551110000', notes: null, active: true, do_not_service: false, created_at: '2026-01-15T00:00:00Z' },
      { id: 'd', tenant_id: TENANT_A, name: 'Fourth Person', email: 'fourth@test.co', phone: null, notes: null, active: true, do_not_service: false, created_at: '2026-01-20T00:00:00Z' },
    ],
    bookings: [] as Record<string, unknown>[],
    payments: [] as Record<string, unknown>[],
    client_sms_messages: [] as Record<string, unknown>[],
    comhub_contacts: [] as Record<string, unknown>[],
    jobs: [] as Record<string, unknown>[],
    client_dedupe_queue: [] as Record<string, unknown>[],
    client_contacts: [] as Record<string, unknown>[],
    client_properties: [] as Record<string, unknown>[],
    recurring_schedules: [] as Record<string, unknown>[],
    invoices: [] as Record<string, unknown>[],
    ratings: [] as Record<string, unknown>[],
    deals: [] as Record<string, unknown>[],
    quotes: [] as Record<string, unknown>[],
    audit_logs: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.rpc = h.rpc
  auditMock.mockClear()
})

describe('namesAgree', () => {
  it('matches case- and whitespace-insensitively', () => {
    expect(namesAgree('Jane Doe', '  jane doe  ')).toBe(true)
    expect(namesAgree('Jane Doe', 'John Smith')).toBe(false)
    expect(namesAgree(null, null)).toBe(true) // two blanks agree with each other, not a real signal either way
  })
})

describe('pickCanonical', () => {
  it('picks whichever client has an active booking when only one does', async () => {
    h.seed.bookings.push({ id: 'bk-1', tenant_id: TENANT_A, client_id: 'b', status: 'confirmed' })
    const result = await pickCanonical(TENANT_A, 'a', 'b')
    expect(result.canonicalId).toBe('b')
    expect(result.duplicateId).toBe('a')
    expect(result.reason).toContain('active booking')
  })

  it('ignores non-active booking statuses when checking for an active booking', async () => {
    h.seed.bookings.push({ id: 'bk-1', tenant_id: TENANT_A, client_id: 'b', status: 'completed' })
    // Neither has an ACTIVE booking (b's is completed) -- falls through to the
    // activity tiebreak, which also finds nothing for either -- falls through
    // to newest-created. 'b' was created 2026-02-01, after 'a' (2026-01-01).
    const result = await pickCanonical(TENANT_A, 'a', 'b')
    expect(result.reason).not.toContain('active booking')
  })

  it('falls back to more recent activity when both or neither has an active booking', async () => {
    h.seed.payments.push({ id: 'pay-1', tenant_id: TENANT_A, client_id: 'a', created_at: '2026-03-01T00:00:00Z' })
    const result = await pickCanonical(TENANT_A, 'a', 'b')
    expect(result.canonicalId).toBe('a')
    expect(result.reason).toBe('more recent activity')
  })

  it('falls back to the more recently created row when neither side has any activity', async () => {
    const result = await pickCanonical(TENANT_A, 'a', 'b')
    expect(result.canonicalId).toBe('b') // b created 2026-02-01, after a's 2026-01-01
    expect(result.reason).toContain('neither side has any activity')
  })
})

describe('hasJobSeqCollision', () => {
  it('detects a shared job_seq between the two clients across bookings and jobs', async () => {
    h.seed.bookings.push({ id: 'bk-1', tenant_id: TENANT_A, client_id: 'a', job_seq: 42 })
    h.seed.jobs.push({ id: 'job-1', tenant_id: TENANT_A, client_id: 'b', job_seq: 42 })
    expect(await hasJobSeqCollision(TENANT_A, 'a', 'b')).toBe(true)
  })

  it('returns false when job_seq numbers do not overlap', async () => {
    h.seed.bookings.push({ id: 'bk-1', tenant_id: TENANT_A, client_id: 'a', job_seq: 1 })
    h.seed.bookings.push({ id: 'bk-2', tenant_id: TENANT_A, client_id: 'b', job_seq: 2 })
    expect(await hasJobSeqCollision(TENANT_A, 'a', 'b')).toBe(false)
  })
})

describe('findDuplicatePairs', () => {
  it('classifies a phone+email match as full and a phone-only match as partial', async () => {
    const { full, partial } = await findDuplicatePairs(TENANT_A)
    expect(full).toHaveLength(1)
    expect(full[0]).toMatchObject({ clientAId: 'a', clientBId: 'b', matchType: 'both' })

    // c shares a's/b's phone but has no email -- partial, not full, on both sides.
    const cPairs = partial.filter((p) => p.clientAId === 'c' || p.clientBId === 'c')
    expect(cPairs).toHaveLength(2) // c-a and c-b
    expect(cPairs.every((p) => p.matchType === 'phone')).toBe(true)
  })

  it('does not pair a client that matches nothing', async () => {
    const { full, partial } = await findDuplicatePairs(TENANT_A)
    const dPairs = [...full, ...partial].filter((p) => p.clientAId === 'd' || p.clientBId === 'd')
    expect(dPairs).toHaveLength(0)
  })

  it('excludes retired (inactive) clients from candidacy', async () => {
    h.seed.clients.find((c) => c.id === 'b')!.active = false
    const { full } = await findDuplicatePairs(TENANT_A)
    expect(full).toHaveLength(0)
  })
})

describe('queueForReview', () => {
  it('normalizes pair order and stores a suggested canonical + reason', async () => {
    await queueForReview({ tenantId: TENANT_A, clientAId: 'b', clientBId: 'a', matchType: 'phone', matchValue: '5551110000' })
    expect(h.seed.client_dedupe_queue).toHaveLength(1)
    const row = h.seed.client_dedupe_queue[0] as Record<string, unknown>
    // 'a' < 'b' lexicographically -- stored in sorted order regardless of call order.
    expect(row.client_a_id).toBe('a')
    expect(row.client_b_id).toBe('b')
    expect(row.suggested_canonical_id).toBeTruthy()
  })
})

describe('resolveFullMatch', () => {
  it('merges when names agree and there is no job_seq collision', async () => {
    h.seed.bookings.push({ id: 'bk-1', tenant_id: TENANT_A, client_id: 'a', status: 'confirmed' })
    const result = await resolveFullMatch({ tenantId: TENANT_A, clientAId: 'a', clientBId: 'b', matchType: 'both', matchValue: 'jane@test.co' })
    expect(result.merged).toBe(true)
    expect(result.queued).toBe(false)
    expect(result.mergeResult?.canonicalClientId).toBe('a') // a has the active booking
    expect(h.seed.clients.find((c) => c.id === 'b')!.active).toBe(false) // loser soft-retired, not deleted
  })

  it('queues instead of merging when names disagree', async () => {
    h.seed.clients.find((c) => c.id === 'b')!.name = 'A Totally Different Person'
    const result = await resolveFullMatch({ tenantId: TENANT_A, clientAId: 'a', clientBId: 'b', matchType: 'both', matchValue: 'jane@test.co' })
    expect(result.merged).toBe(false)
    expect(result.queued).toBe(true)
    expect(h.seed.client_dedupe_queue).toHaveLength(1)
    expect(h.seed.clients.find((c) => c.id === 'a')!.active).toBe(true) // nothing touched
    expect(h.seed.clients.find((c) => c.id === 'b')!.active).toBe(true)
  })

  it('queues instead of merging when bookings/jobs have a colliding job_seq', async () => {
    h.seed.bookings.push({ id: 'bk-1', tenant_id: TENANT_A, client_id: 'a', job_seq: 7 })
    h.seed.bookings.push({ id: 'bk-2', tenant_id: TENANT_A, client_id: 'b', job_seq: 7 })
    const result = await resolveFullMatch({ tenantId: TENANT_A, clientAId: 'a', clientBId: 'b', matchType: 'both', matchValue: 'jane@test.co' })
    expect(result.merged).toBe(false)
    expect(result.queued).toBe(true)
  })
})
