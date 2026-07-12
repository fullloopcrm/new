import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Isolation proof for the leads/attribution conversion: the read flows through
 * tenantClient(tenantId) (RLS-enforced), NOT supabaseAdmin (RLS bypass), stays scoped to
 * website_visits + tenant_id, and the in-memory referrer→source aggregation is preserved.
 */

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { attributionConverted } from './converted-leads-attribution.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const SINCE = '2026-07-11T00:00:00Z'

type QueryRecord = { table: string; eqs: Array<[string, unknown]>; ranges: Array<[string, string, unknown]> }

function makeRecordingDb(result: unknown) {
  const calls: QueryRecord[] = []
  const db = {
    from(table: string) {
      const rec: QueryRecord = { table, eqs: [], ranges: [] }
      calls.push(rec)
      const builder: Record<string, unknown> = {}
      const passthrough = () => builder
      builder.select = passthrough
      builder.not = passthrough
      builder.eq = (col: string, val: unknown) => {
        rec.eqs.push([col, val])
        return builder
      }
      builder.gte = (col: string, val: unknown) => {
        rec.ranges.push(['gte', col, val])
        return builder
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(result)
      return builder
    },
  }
  return { db, calls }
}

beforeEach(() => {
  tenantClientMock.mockReset()
})

describe('attributionConverted', () => {
  it('routes through tenantClient(tenantId), scopes website_visits by tenant, aggregates + sorts sources', async () => {
    const { db, calls } = makeRecordingDb({
      data: [
        { referrer: 'https://www.google.com/' },
        { referrer: 'https://www.google.com/search' },
        { referrer: 'https://l.facebook.com/' },
        { referrer: 'direct' },
      ],
    })
    tenantClientMock.mockReturnValue(db)

    const res = await attributionConverted(TENANT, SINCE, 72)

    expect(tenantClientMock).toHaveBeenCalledTimes(1)
    expect(tenantClientMock).toHaveBeenCalledWith(TENANT)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('website_visits')
    expect(calls[0].eqs).toEqual([['tenant_id', TENANT]])
    expect(calls[0].ranges).toEqual([['gte', 'created_at', SINCE]])
    // Aggregation preserved: Google=2 first (sorted desc), then Facebook=1, direct=1.
    expect(res.attribution[0]).toEqual({ source: 'Google', count: 2 })
    expect(res.attribution).toContainEqual({ source: 'Facebook', count: 1 })
    expect(res.attribution).toContainEqual({ source: 'direct', count: 1 })
    expect(res.total).toBe(4)
    expect(res.window_hours).toBe(72)
  })

  it('handles a null/empty visit set without throwing (total 0, empty attribution)', async () => {
    const { db } = makeRecordingDb({ data: null })
    tenantClientMock.mockReturnValue(db)

    const res = await attributionConverted(TENANT, SINCE, 24)

    expect(res).toEqual({ attribution: [], total: 0, window_hours: 24 })
  })
})
