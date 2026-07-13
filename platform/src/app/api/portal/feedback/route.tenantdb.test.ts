import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/portal/feedback.
 * The reviews insert used to omit any tenant_id at all. Proves tenantDb()
 * stamps the caller's real tenant on every inserted review, never a
 * caller-supplied or omitted value, even for clients sharing the same
 * client_id across tenants.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const CLIENT_ID = 'shared-client-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
let idSeq = 0

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const c: Record<string, unknown> = {
    insert: (row: Row) => {
      const created = { id: `row-${++idSeq}`, ...row }
      rowsOf().push(created)
      return {
        select: () => ({ single: async () => ({ data: created, error: null }) }),
      }
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  DB.reviews = []
})

describe('POST /api/portal/feedback — tenantDb scoping', () => {
  it('stamps the caller tenant on every inserted review, isolated per tenant for the same client id', async () => {
    const tokenA = createToken(CLIENT_ID, TENANT_A)
    const reqA = new NextRequest('https://x/api/portal/feedback', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
      body: JSON.stringify({ rating: 5, comment: 'great' }),
    })
    const resA = await POST(reqA)
    expect(resA.status).toBe(201)

    const tokenB = createToken(CLIENT_ID, TENANT_B)
    const reqB = new NextRequest('https://x/api/portal/feedback', {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenB}`, 'content-type': 'application/json' },
      body: JSON.stringify({ rating: 1, comment: 'bad' }),
    })
    const resB = await POST(reqB)
    expect(resB.status).toBe(201)

    expect(DB.reviews).toHaveLength(2)
    const reviewA = DB.reviews.find((r) => r.client_id === CLIENT_ID && r.rating === 5)!
    const reviewB = DB.reviews.find((r) => r.client_id === CLIENT_ID && r.rating === 1)!
    expect(reviewA.tenant_id).toBe(TENANT_A)
    expect(reviewB.tenant_id).toBe(TENANT_B)
  })
})
