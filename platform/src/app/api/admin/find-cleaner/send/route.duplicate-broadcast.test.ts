import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/admin/find-cleaner/send had no protection against re-posting the
 * same job broadcast. Unlike campaigns/[id]/send, there is no pre-existing
 * "draft" record to atomically claim — every call inserts a brand-new
 * cleaner_broadcasts row and re-texts every selected cleaner. A double-click
 * of the confirm button, or a client retry after a slow/timeout response,
 * re-blasted the same "are you available" SMS to every selected cleaner
 * again. Fix rejects an identical job (same tenant/date/start_time/address)
 * posted again within a 2-minute window.
 */

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: 'tenant-1' },
    error: null,
  })),
}))

vi.mock('@/lib/service-zones', () => ({
  guessZoneFromAddress: () => null,
  SERVICE_ZONES: [],
}))

let smsSends = 0
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async () => {
    smsSends++
    return { success: true }
  }),
}))

const tenantRow = { name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15550000000' }
const cleaners = [
  { id: 'c-1', name: 'Jeff Tucker', phone: '+15551234567', preferred_language: 'en', hourly_rate: 25 },
]
let broadcasts: Array<{ id: string; tenant_id: string; job_date: string; start_time: string; job_address: string | null; created_at: string }> = []
let broadcastSeq = 0

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'tenants') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: tenantRow }) }) }) }
    }
    if (table === 'team_members') {
      return { select: () => ({ eq: () => ({ in: async () => ({ data: cleaners, error: null }) }) }) }
    }
    if (table === 'cleaner_broadcasts') {
      return {
        select: () => {
          const filters: Record<string, unknown> = {}
          let sinceIso = ''
          const chain = {
            eq: (col: string, val: unknown) => { filters[col] = val; return chain },
            is: (col: string, val: null) => { filters[col] = val; return chain },
            gte: (_col: string, val: string) => { sinceIso = val; return chain },
            limit: () => chain,
            maybeSingle: async () => {
              const hit = broadcasts.find((b) =>
                b.tenant_id === filters.tenant_id &&
                b.job_date === filters.job_date &&
                b.start_time === filters.start_time &&
                b.job_address === (filters.job_address ?? null) &&
                b.created_at >= sinceIso
              )
              return { data: hit ? { id: hit.id } : null }
            },
          }
          return chain
        },
        insert: (payload: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              broadcastSeq++
              const row = {
                id: `b-${broadcastSeq}`,
                tenant_id: payload.tenant_id as string,
                job_date: payload.job_date as string,
                start_time: payload.start_time as string,
                job_address: (payload.job_address as string | null) ?? null,
                created_at: new Date().toISOString(),
              }
              broadcasts.push(row)
              return { data: row, error: null }
            },
          }),
        }),
      }
    }
    if (table === 'cleaner_broadcast_recipients') {
      return { insert: async () => ({ data: null, error: null }) }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function makeBody() {
  return {
    job_date: '2026-08-01',
    start_time: '09:00',
    duration_hours: 3,
    qty_needed: 1,
    job_address: '123 Main St',
    cleaner_ids: ['c-1'],
    confirmed: true,
  }
}
function callRoute() {
  return POST(new Request('http://x', { method: 'POST', body: JSON.stringify(makeBody()) }))
}

describe('POST /api/admin/find-cleaner/send — duplicate-broadcast guard', () => {
  beforeEach(() => {
    broadcasts = []
    broadcastSeq = 0
    smsSends = 0
  })

  it('sends once for a normal single call', async () => {
    const res = await callRoute()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(smsSends).toBe(1)
  })

  it('rejects an identical job re-posted moments later (double-click / retry)', async () => {
    await callRoute()
    const res2 = await callRoute()
    const json2 = await res2.json()
    expect(res2.status).toBe(409)
    expect(json2.error).toMatch(/already sent/i)
    expect(smsSends).toBe(1)
  })

  it('allows a different job (different start_time) through even within the window', async () => {
    await callRoute()
    const differentBody = { ...makeBody(), start_time: '13:00' }
    const res2 = await POST(new Request('http://x', { method: 'POST', body: JSON.stringify(differentBody) }))
    expect(res2.status).toBe(200)
    expect(smsSends).toBe(2)
  })
})
