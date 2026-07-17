import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/client/book — client's "Choose your team" pick actually takes effect.
 *
 * BUG: the live self-booking UI (nycmaid/book/new, template/book/new,
 * the-florida-maid/book-now) lets a client pick a lead cleaner + extras and
 * sends cleaner_id/extra_cleaner_ids in the POST body, but the route never
 * read either field — create_booking_atomic hardcoded team_member_id to
 * NULL in its INSERT (migrations/2026_07_13_client_book_dedupe_atomic.sql),
 * so the client's explicit pick was silently discarded every time in favor
 * of manual admin assignment. Same shape as the /api/client/recurring gap
 * fixed the same session — a client picking their crew must stay inside
 * their own tenant's active roster.
 *
 * FIX: cleaner_id/extra_cleaner_ids are validated tenant-scoped + active,
 * passed through to create_booking_atomic's new p_team_member_id param
 * (migrations/2026_07_17_client_book_team_member_id.sql), and synced into
 * booking_team_members (lead + extras) same as recurring/reschedule.
 */

const TENANT_A = { id: 'tenant-a', name: 'Tenant A', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }

const holder = vi.hoisted(() => ({
  clients: new Map<string, { id: string; tenant_id: string; do_not_service: boolean }>([
    ['client-a', { id: 'client-a', tenant_id: 'tenant-a', do_not_service: false }],
  ]),
  teamMembers: new Map<string, { id: string; tenant_id: string; active: boolean }>([
    ['tm-a-lead', { id: 'tm-a-lead', tenant_id: 'tenant-a', active: true }],
    ['tm-a-extra', { id: 'tm-a-extra', tenant_id: 'tenant-a', active: true }],
    ['tm-a-inactive', { id: 'tm-a-inactive', tenant_id: 'tenant-a', active: false }],
    ['tm-b-foreign', { id: 'tm-b-foreign', tenant_id: 'tenant-b', active: true }],
  ]),
  rpcCalls: [] as Record<string, unknown>[],
  teamRowUpserts: [] as Record<string, unknown>[],
}))

vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT_A }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/client-properties', () => ({
  resolveProperty: vi.fn(async () => null),
  applyPropertyToBookingClient: vi.fn(() => {}),
}))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ bookingReceived: () => 'sms' }) }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: 's', html: 'h' }),
  referralSignupNotifyEmail: () => ({ subject: 's', html: 'h' }),
}))
vi.mock('@/lib/nycmaid/recurring-discount', () => ({ applyRecurringDiscount: (price: number) => price }))
vi.mock('@/lib/settings', () => ({ getSettings: async () => ({ open_365: true }) }))

function stubChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    ilike: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return chain
}

function clientsSelectBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: { do_not_service: false }, error: null }),
    single: async () => ({ data: { do_not_service: false }, error: null }),
  }
  return chain
}

function teamMembersSelectBuilder() {
  let filterIds: string[] = []
  let filterTenant: string | undefined
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: string) => {
      if (col === 'id') filterIds = [val]
      if (col === 'tenant_id') filterTenant = val
      return chain
    },
    in: (col: string, vals: string[]) => {
      if (col === 'id') filterIds = vals
      return chain
    },
    single: async () => {
      const id = filterIds[0]
      const m = holder.teamMembers.get(id)
      if (!m || m.tenant_id !== filterTenant) return { data: null, error: null }
      return { data: { id: m.id, active: m.active }, error: null }
    },
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
      const rows = filterIds
        .map((id) => holder.teamMembers.get(id))
        .filter((m): m is { id: string; tenant_id: string; active: boolean } => !!m && m.tenant_id === filterTenant)
        .map((m) => ({ id: m.id, active: m.active }))
      return Promise.resolve({ data: rows, error: null }).then(res, rej)
    },
  }
  return chain
}

function bookingTeamMembersBuilder() {
  const chain: Record<string, unknown> = {
    upsert: (rows: Record<string, unknown>[]) => {
      holder.teamRowUpserts.push(...rows)
      return Promise.resolve({ data: rows, error: null })
    },
  }
  return chain
}

const state = vi.hoisted(() => ({ lastBooking: null as { id: string; client_id: string } | null }))

function bookingsSelectBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    single: async () => {
      if (!state.lastBooking) return { data: null, error: { message: 'not found' } }
      return {
        data: { ...state.lastBooking, clients: { name: 'A Client' }, client_properties: null },
        error: null,
      }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsSelectBuilder()
      if (table === 'team_members') return teamMembersSelectBuilder()
      if (table === 'booking_team_members') return bookingTeamMembersBuilder()
      if (table === 'bookings') return bookingsSelectBuilder()
      return stubChain()
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'create_booking_atomic') throw new Error(`unexpected rpc: ${fn}`)
      holder.rpcCalls.push(args)
      const booking = { id: 'bk-1', client_id: args.p_client_id as string }
      state.lastBooking = booking
      return { data: { created: true, booking }, error: null }
    },
  },
}))

import { POST } from './route'

function bookReq(extra: Record<string, unknown> = {}) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({
        client_id: 'client-a',
        start_time: '2026-07-20T10:00:00',
        end_time: '2026-07-20T12:00:00',
        ...extra,
      }),
    }),
  )
}

beforeEach(() => {
  holder.rpcCalls.length = 0
  holder.teamRowUpserts.length = 0
  state.lastBooking = null
})

describe('POST /api/client/book — client cleaner pick takes effect', () => {
  it('a valid, active, same-tenant cleaner_id is passed through to the booking and synced to booking_team_members as lead', async () => {
    const res = await bookReq({ cleaner_id: 'tm-a-lead' })
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_team_member_id).toBe('tm-a-lead')
    expect(holder.teamRowUpserts).toContainEqual(
      expect.objectContaining({ team_member_id: 'tm-a-lead', is_lead: true, booking_id: 'bk-1' }),
    )
  })

  it('extra_cleaner_ids are synced to booking_team_members as non-lead', async () => {
    const res = await bookReq({ cleaner_id: 'tm-a-lead', extra_cleaner_ids: ['tm-a-extra'] })
    expect(res.status).toBe(200)
    expect(holder.teamRowUpserts).toContainEqual(
      expect.objectContaining({ team_member_id: 'tm-a-extra', is_lead: false, booking_id: 'bk-1' }),
    )
  })

  it('rejects a cleaner_id belonging to a DIFFERENT tenant — 400, no booking created', async () => {
    const res = await bookReq({ cleaner_id: 'tm-b-foreign' })
    expect(res.status).toBe(400)
    expect(holder.rpcCalls.length).toBe(0)
  })

  it('rejects an inactive cleaner_id in the caller\'s own tenant — 400', async () => {
    const res = await bookReq({ cleaner_id: 'tm-a-inactive' })
    expect(res.status).toBe(400)
    expect(holder.rpcCalls.length).toBe(0)
  })

  it('no cleaner_id sent — booking still succeeds with team_member_id left null (positive control, pre-existing behavior)', async () => {
    const res = await bookReq()
    expect(res.status).toBe(200)
    expect(holder.rpcCalls[0].p_team_member_id).toBeNull()
    expect(holder.teamRowUpserts.length).toBe(0)
  })
})
