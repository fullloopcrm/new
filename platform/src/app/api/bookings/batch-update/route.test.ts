import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/bookings/batch-update — field allowlist + team_member_id ownership.
 *
 * BUG (fixed here): `u.data` (a caller-supplied per-update payload) was
 * applied to `.update()` completely unfiltered, unlike the sibling
 * PUT /api/bookings/[id] which allowlists via `pick()`. The `.eq('tenant_id',
 * tenantId)` filter only gates WHICH row the UPDATE can touch — it does
 * nothing to constrain what the SET clause contains. A caller-supplied
 * `tenant_id` in the payload would have re-tenanted the row to any id the
 * caller chose. Also missing: the same team_member_id cross-tenant-FK
 * ownership check every sibling route in this pass needed.
 *
 * FIX: `u.data` is now allowlisted via `pick()` (same field list as
 * PUT /api/bookings/[id]), and any team_member_id across the whole batch is
 * validated against tenant-scoped team_members before any update runs.
 */

const TENANT = 'tid-a'

const holder = vi.hoisted(() => ({
  bookings: new Map<string, Record<string, unknown>>(),
  members: new Map<string, { id: string; tenant_id: string }>(),
  clients: new Map<string, { id: string; tenant_id: string }>(),
  serviceTypes: new Map<string, { id: string; tenant_id: string }>(),
  updateCalls: [] as { table: string; values: Record<string, unknown>; id: string }[],
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'team_members') {
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => ({
              eq: async (_c: string, tenantId: string) => ({
                data: ids
                  .map((id) => holder.members.get(id))
                  .filter((m): m is { id: string; tenant_id: string } => !!m && m.tenant_id === tenantId)
                  .map((m) => ({ id: m.id })),
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'clients') {
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => ({
              eq: async (_c: string, tenantId: string) => ({
                data: ids
                  .map((id) => holder.clients.get(id))
                  .filter((c): c is { id: string; tenant_id: string } => !!c && c.tenant_id === tenantId)
                  .map((c) => ({ id: c.id })),
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'service_types') {
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => ({
              eq: async (_c: string, tenantId: string) => ({
                data: ids
                  .map((id) => holder.serviceTypes.get(id))
                  .filter((s): s is { id: string; tenant_id: string } => !!s && s.tenant_id === tenantId)
                  .map((s) => ({ id: s.id })),
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'bookings') {
        return {
          update: (values: Record<string, unknown>) => {
            let id = ''
            const chain = {
              eq: (col: string, val: string) => {
                if (col === 'id') id = val
                return chain
              },
              select: () => chain,
              single: async () => {
                holder.updateCalls.push({ table, values, id })
                const existing = holder.bookings.get(id)
                if (!existing) return { data: null, error: { message: 'not found' } }
                Object.assign(existing, values)
                return { data: { ...existing, clients: { name: 'Client' } }, error: null }
              },
            }
            return chain
          },
        }
      }
      if (table === 'notifications') {
        return { insert: async () => ({ error: null }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { PUT } from './route'

function req(updates: unknown) {
  return new Request('http://t/api/bookings/batch-update', {
    method: 'PUT',
    body: JSON.stringify({ updates }),
  })
}

beforeEach(() => {
  holder.bookings.clear()
  holder.members.clear()
  holder.clients.clear()
  holder.serviceTypes.clear()
  holder.updateCalls.length = 0
  holder.bookings.set('bk-1', { id: 'bk-1', tenant_id: TENANT, start_time: '2026-08-01T10:00:00Z', status: 'scheduled' })
  holder.members.set('tm-a', { id: 'tm-a', tenant_id: TENANT })
  holder.members.set('tm-foreign', { id: 'tm-foreign', tenant_id: 'tid-b' })
  holder.clients.set('c-a', { id: 'c-a', tenant_id: TENANT })
  holder.clients.set('c-foreign', { id: 'c-foreign', tenant_id: 'tid-b' })
  holder.serviceTypes.set('st-a', { id: 'st-a', tenant_id: TENANT })
  holder.serviceTypes.set('st-foreign', { id: 'st-foreign', tenant_id: 'tid-b' })
})

describe('batch-update — tenant_id injection is stripped from the update payload', () => {
  it('a caller-supplied tenant_id in the payload never reaches the SET clause', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { status: 'confirmed', tenant_id: 'tid-evil' } }]))
    expect(res.status).toBe(200)
    const call = holder.updateCalls.find((c) => c.id === 'bk-1')
    expect(call).toBeDefined()
    expect(call!.values.tenant_id).toBeUndefined()
    expect(call!.values.status).toBe('confirmed')
    expect(holder.bookings.get('bk-1')!.tenant_id).toBe(TENANT)
  })

  it('a disallowed column (e.g. id override) is dropped, not applied', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { status: 'confirmed', id: 'bk-other' } }]))
    expect(res.status).toBe(200)
    const call = holder.updateCalls.find((c) => c.id === 'bk-1')
    expect(call!.values.id).toBeUndefined()
  })
})

describe('batch-update — cross-tenant team_member_id guard', () => {
  it('rejects the whole batch when any update targets a foreign team member', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { team_member_id: 'tm-foreign' } }]))
    expect(res.status).toBe(400)
    expect(holder.updateCalls.length).toBe(0)
  })

  it('same-tenant team_member_id succeeds', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { team_member_id: 'tm-a' } }]))
    expect(res.status).toBe(200)
    const call = holder.updateCalls.find((c) => c.id === 'bk-1')
    expect(call!.values.team_member_id).toBe('tm-a')
  })
})

/**
 * WITNESS — cross-tenant client_id/service_type_id FK injection on
 * PUT /api/bookings/batch-update.
 *
 * BUG (fixed here): this route only ever verified team_member_id ownership;
 * client_id and service_type_id — both in the same UPDATABLE_FIELDS
 * allowlist — were written verbatim with no ownership check, unlike the
 * sibling PUT /api/bookings/[id] (register P11) which checks all three. The
 * route's own response embeds clients(name, phone, email) off the row, so a
 * foreign client_id leaks another tenant's client PII in the response.
 */
describe('batch-update — cross-tenant client_id guard', () => {
  it('rejects the whole batch when any update targets a foreign client (wrong-tenant probe)', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { client_id: 'c-foreign' } }]))
    expect(res.status).toBe(400)
    expect(holder.updateCalls.length).toBe(0)
  })

  it('same-tenant client_id succeeds', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { client_id: 'c-a' } }]))
    expect(res.status).toBe(200)
    const call = holder.updateCalls.find((c) => c.id === 'bk-1')
    expect(call!.values.client_id).toBe('c-a')
  })
})

describe('batch-update — cross-tenant service_type_id guard', () => {
  it('rejects the whole batch when any update targets a foreign service type (wrong-tenant probe)', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { service_type_id: 'st-foreign' } }]))
    expect(res.status).toBe(400)
    expect(holder.updateCalls.length).toBe(0)
  })

  it('same-tenant service_type_id succeeds', async () => {
    const res = await PUT(req([{ id: 'bk-1', data: { service_type_id: 'st-a' } }]))
    expect(res.status).toBe(200)
    const call = holder.updateCalls.find((c) => c.id === 'bk-1')
    expect(call!.values.service_type_id).toBe('st-a')
  })
})
