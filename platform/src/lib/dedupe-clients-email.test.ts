/**
 * Pure-logic tests for scripts/dedupe-clients-email.mjs — no DB, no network.
 * Covers the grouping + merge-plan functions that back the (tenant_id,
 * email) dedupe finder ahead of idx_clients_tenant_email_unique
 * (2026_07_13_clients_tenant_email_unique.sql).
 */
import { describe, it, expect } from 'vitest'
import { findDuplicateGroups, planMerge } from '../../scripts/dedupe-clients-email.mjs'

describe('findDuplicateGroups', () => {
  it('groups rows by (tenant_id, lowercased email) and keeps only groups with >1 row', () => {
    const rows = [
      { id: 'a', tenant_id: 't1', email: 'Foo@Test.co', created_at: '2026-01-01T00:00:00Z' },
      { id: 'b', tenant_id: 't1', email: 'foo@test.co', created_at: '2026-01-02T00:00:00Z' },
      { id: 'c', tenant_id: 't1', email: 'bar@test.co', created_at: '2026-01-01T00:00:00Z' },
      { id: 'd', tenant_id: 't2', email: 'foo@test.co', created_at: '2026-01-01T00:00:00Z' },
    ]
    const groups = findDuplicateGroups(rows)
    expect(groups.length).toBe(1)
    expect(groups[0].tenant_id).toBe('t1')
    expect(groups[0].email_lc).toBe('foo@test.co')
    expect(groups[0].rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('ignores rows with no email and returns nothing when no duplicates exist', () => {
    const rows = [
      { id: 'a', tenant_id: 't1', email: null, created_at: '2026-01-01T00:00:00Z' },
      { id: 'b', tenant_id: 't1', email: 'unique@test.co', created_at: '2026-01-01T00:00:00Z' },
    ]
    expect(findDuplicateGroups(rows)).toEqual([])
  })

  it('sorts each group oldest-first', () => {
    const rows = [
      { id: 'newer', tenant_id: 't1', email: 'x@test.co', created_at: '2026-02-01T00:00:00Z' },
      { id: 'oldest', tenant_id: 't1', email: 'x@test.co', created_at: '2026-01-01T00:00:00Z' },
      { id: 'middle', tenant_id: 't1', email: 'x@test.co', created_at: '2026-01-15T00:00:00Z' },
    ]
    const [group] = findDuplicateGroups(rows)
    expect(group.rows.map((r) => r.id)).toEqual(['oldest', 'middle', 'newer'])
  })
})

describe('planMerge', () => {
  it('keeps the oldest row as winner and lists the rest as losers', () => {
    const groups = [
      {
        tenant_id: 't1',
        email_lc: 'x@test.co',
        rows: [
          { id: 'oldest', created_at: '2026-01-01T00:00:00Z' },
          { id: 'middle', created_at: '2026-01-15T00:00:00Z' },
          { id: 'newer', created_at: '2026-02-01T00:00:00Z' },
        ],
      },
    ]
    const plan = planMerge(groups)
    expect(plan).toEqual([
      { tenant_id: 't1', email_lc: 'x@test.co', winnerId: 'oldest', loserIds: ['middle', 'newer'] },
    ])
  })
})
