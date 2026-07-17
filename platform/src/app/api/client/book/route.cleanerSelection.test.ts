import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * client/book — the "Choose your team" self-booking step (site/nycmaid/book/new
 * and the shared site/template/book/new form) lets a client pick a specific
 * cleaner (form.cleaner_id) and extra crew (form.extra_cleaner_ids), fed by
 * GET /api/client/smart-schedule's tenant-scoped, active-only roster.
 *
 * BUG: this route parsed neither field. The bookings insert hardcoded
 * `team_member_id: null` unconditionally, so every self-booked booking landed
 * unassigned regardless of what the client picked -- their choice was
 * silently discarded every time, and the booking always fell back to manual
 * admin assignment. `suggested_team_member_id` (a separate, purely advisory
 * column written by the smart-suggestion pass below) is not the same as an
 * actual assignment and was never surfaced to the client as such.
 *
 * FIX: validate cleaner_id/extra_cleaner_ids against this tenant's active
 * team_members roster (same ownership gate PUT /api/client/reschedule/[id]
 * already enforces), write the lead onto bookings.team_member_id, and sync
 * booking_team_members for lead + extras (same gap already fixed at every
 * other bookings.team_member_id write site this session).
 */

const TENANT = { id: 'tenant-a', name: 'Test Tenant', phone: null, resend_api_key: null, telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null }
const CLIENT_ID = 'client-1'
const ACTIVE_MEMBER = 'member-active'
const EXTRA_MEMBER = 'member-extra'
const INACTIVE_MEMBER = 'member-inactive'
const FOREIGN_MEMBER = 'member-foreign-tenant'

const holder = vi.hoisted(() => ({
  insertedBookings: [] as Array<Record<string, unknown>>,
  upsertedTeamRows: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => TENANT }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 10 }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [] }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ autoAttributeBooking: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/client-properties', () => ({
  resolveProperty: vi.fn(async () => ({ id: 'prop-1', address: '1 Main St', latitude: null, longitude: null })),
  applyPropertyToBookingClient: vi.fn(() => {}),
}))
vi.mock('@/lib/messaging/client-email', () => ({ bookingReceivedEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplates: () => ({ bookingReceived: () => 'sms' }) }))
vi.mock('@/lib/email-templates', () => ({
  adminNewBookingRequestEmail: () => ({ subject: 's', html: 'h' }),
  referralSignupNotifyEmail: () => ({ subject: 's', html: 'h' }),
}))
vi.mock('@/lib/nycmaid/recurring-discount', () => ({ applyRecurringDiscount: (price: number) => price }))

function stubChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    gte: () => chain,
    lte: () => chain,
    ilike: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
  }
  return chain
}

function clientsChain() {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: async () => ({ data: { id: CLIENT_ID, do_not_service: false }, error: null }),
          maybeSingle: async () => ({ data: { do_not_service: false }, error: null }),
        }),
      }),
    }),
  }
}

function teamMembersChain() {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          in: async () => ({ data: [{ id: ACTIVE_MEMBER }, { id: EXTRA_MEMBER }], error: null }),
        }),
      }),
    }),
  }
}

function bookingTeamMembersChain() {
  return {
    upsert: (rows: Array<Record<string, unknown>>) => {
      holder.upsertedTeamRows.push(...rows)
      return Promise.resolve({ data: null, error: null })
    },
  }
}

function bookingsChain() {
  let isInsert = false
  const chain: Record<string, unknown> = {
    insert: (payload: Record<string, unknown>) => {
      isInsert = true
      holder.insertedBookings.push(payload)
      return chain
    },
    select: () => chain,
    update: () => chain,
    eq: () => chain,
    is: () => chain,
    in: () => chain,
    gte: () => chain,
    lte: () => chain,
    ilike: () => chain,
    order: () => chain,
    single: async () => {
      if (!isInsert) return { data: null, error: { message: 'not found' } }
      const last = holder.insertedBookings[holder.insertedBookings.length - 1]
      return {
        data: {
          id: `bk-${holder.insertedBookings.length}`,
          tenant_id: TENANT.id,
          client_id: CLIENT_ID,
          team_member_id: last.team_member_id,
          price: last.price,
          hourly_rate: last.hourly_rate,
          created_at: new Date().toISOString(),
          service_type: 'Standard Cleaning',
          clients: { name: 'Client', phone: '555-0100', email: 'client@example.com', address: '1 Main St' },
          client_properties: { id: 'prop-1', address: '1 Main St' },
        },
        error: null,
      }
    },
    maybeSingle: async () => ({ data: null, error: null }),
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve({ count: 0, data: [], error: null }).then(res, rej),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') return clientsChain()
      if (table === 'bookings') return bookingsChain()
      if (table === 'team_members') return teamMembersChain()
      if (table === 'booking_team_members') return bookingTeamMembersChain()
      return stubChain()
    },
  },
}))

import { POST } from './route'

function bookReq(body: Record<string, unknown>) {
  return POST(
    new Request('http://t/api/client/book', {
      method: 'POST',
      body: JSON.stringify({
        client_id: CLIENT_ID,
        address: '1 Main St',
        start_time: '2026-08-01T10:00:00',
        end_time: '2026-08-01T12:00:00',
        ...body,
      }),
    }),
  )
}

beforeEach(() => {
  holder.insertedBookings.length = 0
  holder.upsertedTeamRows.length = 0
})

describe('client/book honors the client-selected cleaner', () => {
  it('writes the chosen active cleaner onto bookings.team_member_id and booking_team_members (is_lead)', async () => {
    const res = await bookReq({ cleaner_id: ACTIVE_MEMBER })
    expect(res.status).toBe(200)

    expect(holder.insertedBookings[0].team_member_id).toBe(ACTIVE_MEMBER)
    expect(holder.upsertedTeamRows).toContainEqual(
      expect.objectContaining({ team_member_id: ACTIVE_MEMBER, is_lead: true, position: 1 }),
    )
  })

  it('writes extra crew as non-lead booking_team_members rows', async () => {
    const res = await bookReq({ cleaner_id: ACTIVE_MEMBER, extra_cleaner_ids: [EXTRA_MEMBER], team_size: 2 })
    expect(res.status).toBe(200)

    expect(holder.upsertedTeamRows).toContainEqual(
      expect.objectContaining({ team_member_id: EXTRA_MEMBER, is_lead: false, position: 2 }),
    )
  })

  it('ignores a cleaner_id that is not in this tenant\'s active roster (inactive/foreign), leaving the booking unassigned', async () => {
    const res = await bookReq({ cleaner_id: INACTIVE_MEMBER })
    expect(res.status).toBe(200)

    expect(holder.insertedBookings[0].team_member_id).toBeNull()
    expect(holder.upsertedTeamRows.length).toBe(0)
  })

  it('leaves the booking unassigned when no cleaner_id is supplied (unchanged default behavior)', async () => {
    const res = await bookReq({})
    expect(res.status).toBe(200)

    expect(holder.insertedBookings[0].team_member_id).toBeNull()
    expect(holder.upsertedTeamRows.length).toBe(0)
  })
})
