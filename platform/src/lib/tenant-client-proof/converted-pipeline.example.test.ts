import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the pipeline conversion: the single read flows through
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass), stays scoped to
 * deals + tenant_id + status:active, keeps the embedded clients join, and the pure
 * downstream grouping/forecast is preserved.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { pipelineConverted } from './converted-pipeline.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'

type QueryRecord = { table: string; selects: string[]; eqs: Array<[string, unknown]> }

function makeRecordingDb(result: unknown) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, selects: [], eqs: [] }
      calls.push(rec)
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.order = passthrough
      builder.limit = passthrough
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
  return { db, calls }
}

const OPTS = { includeClosed: true, monthsAhead: 6, now: new Date('2026-07-12T00:00:00Z') }

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('pipelineConverted', () => {
  it('routes through tenantClient(tenantId), scopes deals by tenant + active, keeps the clients join, groups by stage', async () => {
    // All stages are valid PIPELINE_STAGES values. We intentionally do NOT feed an
    // unknown/null stage here — that hits the faithfully-mirrored latent bug documented in
    // the .example.ts (byStage['lead'] is undefined); covered separately below.
    const deals = [
      { id: 'd1', stage: 'new', status: 'active', value_cents: 1000, probability: 20, expected_close_date: '2026-08-01', follow_up_at: '2026-07-01T00:00:00Z' },
      { id: 'd2', stage: 'quoted', status: 'active', value_cents: 5000, probability: 60, expected_close_date: '2026-09-01', follow_up_at: null },
      { id: 'd3', stage: 'new', status: 'active', value_cents: 2000, probability: 30, expected_close_date: '2026-08-15', follow_up_at: null },
    ]
    const { db, calls } = makeRecordingDb({ data: deals, error: null })
    tenantClientMock.mockReturnValue(db)

    const res = await pipelineConverted(TENANT, OPTS)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('deals')
    expect(calls[0].eqs).toEqual([
      ['tenant_id', TENANT],
      ['status', 'active'],
    ])
    // Embedded join preserved (cross-table RLS dependency rides on it).
    expect(calls[0].selects[0]).toContain('clients(id, name, email, phone)')
    // Grouping preserved: d1,d3→new; d2→quoted.
    expect(res.byStage['new'].map((d) => d.id)).toEqual(['d1', 'd3'])
    expect(res.byStage['quoted'].map((d) => d.id)).toEqual(['d2'])
    // d1's follow_up_at (2026-07-01) is before the injected now (2026-07-12) → overdue.
    expect(res.overdueFollowUps).toBe(1)
    expect(res.total).toBe(3)
    expect(Array.isArray(res.forecast)).toBe(true)
    expect(res.stageTotals.length).toBeGreaterThan(0)
  })

  it('DOCUMENTS the latent bug: an unknown/null stage throws (byStage["lead"] is undefined in the live route)', async () => {
    // This is NOT a property of the conversion — it pre-exists in src/app/api/pipeline/route.ts
    // and is mirrored verbatim. Pinning it makes the bug visible and gives a regression anchor
    // for whoever fixes it (add 'lead' to byStage, or normalize to a real stage like 'new').
    const deals = [
      { id: 'x1', stage: 'not_a_real_stage', status: 'active', value_cents: 0, probability: 0, expected_close_date: null, follow_up_at: null },
    ]
    const { db } = makeRecordingDb({ data: deals, error: null })
    tenantClientMock.mockReturnValue(db)

    await expect(pipelineConverted(TENANT, OPTS)).rejects.toThrow(TypeError)
  })

  it('omits forecast when includeClosed is false', async () => {
    const { db } = makeRecordingDb({ data: [], error: null })
    tenantClientMock.mockReturnValue(db)

    const res = await pipelineConverted(TENANT, { includeClosed: false, monthsAhead: 6 })
    expect(res.forecast).toEqual([])
    expect(res.total).toBe(0)
  })

  it('propagates a query error (fail-closed, no silent empty result)', async () => {
    const { db } = makeRecordingDb({ data: null, error: new Error('rls denied') })
    tenantClientMock.mockReturnValue(db)

    await expect(pipelineConverted(TENANT, OPTS)).rejects.toThrow('rls denied')
  })
})
