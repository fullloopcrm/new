import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * PATCH accepted a caller-supplied assignee_id with no check that it's a
 * real tenant_members row for this tenant — a thread could be assigned to
 * a garbage or foreign id (data-integrity risk, flagged in the
 * 2026-07-17 05:11 report). Now rejects with 400 unless assignee_id
 * resolves to a tenant_members row scoped to the caller's tenant.
 */

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: vi.fn(async () => 'tenant-1'),
}))

let memberLookupEqCalls: Array<[string, unknown]> = []
let memberRow: Record<string, unknown> | null = null
let updatePayload: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'tenant_members') {
      return {
        select: () => ({
          eq: (col: string, val: unknown) => {
            memberLookupEqCalls.push([col, val])
            return {
              eq: (col2: string, val2: unknown) => {
                memberLookupEqCalls.push([col2, val2])
                return { maybeSingle: async () => ({ data: memberRow, error: null }) }
              },
            }
          },
        }),
      }
    }
    if (table === 'comhub_threads') {
      return {
        update: (payload: Record<string, unknown>) => {
          updatePayload = payload
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: { id: 'thread-1', ...payload }, error: null }),
                }),
              }),
            }),
          }
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { PATCH } from './route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/comhub/threads/thread-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH threads/[id] — assignee_id validation', () => {
  beforeEach(() => {
    memberLookupEqCalls = []
    memberRow = null
    updatePayload = null
  })

  it('rejects an assignee_id that does not belong to a tenant_members row for this tenant', async () => {
    memberRow = null
    const res = await PATCH(makeRequest({ assignee_id: 'not-a-member' }), {
      params: Promise.resolve({ id: 'thread-1' }),
    })
    expect(res.status).toBe(400)
    expect(memberLookupEqCalls).toEqual([
      ['id', 'not-a-member'],
      ['tenant_id', 'tenant-1'],
    ])
    expect(updatePayload).toBeNull()
  })

  it('accepts an assignee_id that resolves to a tenant_members row', async () => {
    memberRow = { id: 'member-1' }
    const res = await PATCH(makeRequest({ assignee_id: 'member-1' }), {
      params: Promise.resolve({ id: 'thread-1' }),
    })
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ assignee_id: 'member-1' })
  })

  it('allows clearing assignee_id with null without a membership lookup', async () => {
    const res = await PATCH(makeRequest({ assignee_id: null }), {
      params: Promise.resolve({ id: 'thread-1' }),
    })
    expect(res.status).toBe(200)
    expect(memberLookupEqCalls).toEqual([])
    expect(updatePayload).toMatchObject({ assignee_id: null })
  })
})
