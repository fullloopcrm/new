import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — PATCH /api/admin/prospects/[id] (reject action) stored
 * `body.reject_reason` raw into `prospects.reject_reason` with no
 * type/length cap, same class as accounting_periods.notes/reopened_reason
 * (capString, src/lib/validate.ts).
 *
 * FIXED: capString(body.reject_reason, 2000) truncates rather than rejects.
 */

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const holder = vi.hoisted(() => ({
  prospect: { id: 'p1', status: 'pending', owner_email: 'a@b.com' } as Record<string, unknown>,
  lastUpdate: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'prospects') throw new Error(`unexpected table: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: holder.prospect, error: null }),
          }),
        }),
        update: (values: Record<string, unknown>) => {
          holder.lastUpdate = values
          holder.prospect = { ...holder.prospect, ...values }
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: holder.prospect, error: null }),
              }),
            }),
          }
        },
      }
    },
  },
}))

import { PATCH } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/admin/prospects/p1', { method: 'PATCH', body: JSON.stringify(body) })
}
const params = { params: Promise.resolve({ id: 'p1' }) }

beforeEach(() => {
  holder.prospect = { id: 'p1', status: 'pending', owner_email: 'a@b.com' }
  holder.lastUpdate = null
})

describe('admin/prospects/[id] PATCH (reject) — reject_reason cap', () => {
  it('LOCK: an oversized reject_reason is truncated to 2000 chars before the write', async () => {
    const oversized = 'w'.repeat(3000)
    const res = await PATCH(req({ action: 'reject', reject_reason: oversized }), params)
    expect(res.status).toBe(200)
    expect(holder.lastUpdate?.reject_reason).toHaveLength(2000)
    expect(holder.lastUpdate?.reject_reason).toBe(oversized.slice(0, 2000))
  })

  it('CONTROL: a normal-length reject_reason passes through untouched', async () => {
    const res = await PATCH(req({ action: 'reject', reject_reason: 'Not a good fit' }), params)
    expect(res.status).toBe(200)
    expect(holder.lastUpdate?.reject_reason).toBe('Not a good fit')
  })

  it('CONTROL: a non-string reject_reason coerces to null instead of crashing', async () => {
    const res = await PATCH(req({ action: 'reject', reject_reason: { x: 1 } }), params)
    expect(res.status).toBe(200)
    expect(holder.lastUpdate?.reject_reason).toBeNull()
  })
})
