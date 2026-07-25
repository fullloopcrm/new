/**
 * buildBookingConfirmationEmail() — the rendered HTML for a booking
 * confirmation, on the shared Full Loop template (baseTemplate/
 * bookingConfirmationEmail in email-templates.ts), enriched from the booking
 * itself (cleaner photo/rating, client PIN, recurring flag).
 *
 * This replaces nycmaid's old standalone clientConfirmationEmail
 * (nycmaid/email-templates.ts) — the content parity this suite checks:
 *   1. cleaner name + photo
 *   2. confirmation details, with NO cleaner contact info
 *   3. cancellation-policy / prep-tips content
 *   4. client portal PIN block
 *
 * Unlike notify.test.ts (which mocks bookingConfirmationEmail away to test
 * notify()'s dispatch plumbing), this suite leaves the real template
 * function in place so assertions run against actual rendered HTML.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NYCMAID_TENANT_ID } from './nycmaid/tenant'

const OTHER_TENANT_ID = 'bbbbbbbb-1111-2222-3333-444444444444'
const BOOKING_ID = 'booking-1'

type Row = Record<string, unknown>
const tableData: Record<string, Row | null> = {}

function makeChain() {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: (tableData.tenants as Row) ?? null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: (tableData.bookings as Row) ?? null, error: null })),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      const chain = makeChain()
      if (table === 'tenants') {
        chain.single = vi.fn(() => Promise.resolve({ data: (tableData.tenants as Row) ?? null, error: null }))
      }
      if (table === 'bookings') {
        chain.maybeSingle = vi.fn(() => Promise.resolve({ data: (tableData.bookings as Row) ?? null, error: null }))
      }
      return chain
    }),
  },
}))
vi.mock('./comms-prefs', () => ({
  getCommPolicy: async (tenantId: string) => (tableData[`policy:${tenantId}`] as Row) || {},
  buildTemplateData: (tenant: { name: string; primary_color?: string | null; logo_url?: string | null }, policy: Record<string, unknown>) => ({
    tenantName: tenant.name,
    primaryColor: tenant.primary_color || undefined,
    logoUrl: tenant.logo_url || undefined,
    ...policy,
  }),
}))
// Everything else notify.ts imports but this suite never exercises.
vi.mock('./email', () => ({ sendEmail: vi.fn(), tenantSender: () => 'noreply@example.com' }))
vi.mock('./sms', () => ({ sendSMS: vi.fn() }))
vi.mock('./telegram', () => ({ sendTelegram: vi.fn(), notifyOwnerOnTelegram: vi.fn() }))
vi.mock('./secret-crypto', () => ({ decryptSecret: (v: string) => v }))

import { buildBookingConfirmationEmail } from './notify'

beforeEach(() => {
  for (const k of Object.keys(tableData)) delete tableData[k]
})

describe('buildBookingConfirmationEmail — content parity with nycmaid old template', () => {
  it('renders cleaner name + photo + rating when the booking has an assigned team member', async () => {
    tableData.tenants = { name: 'Test Co', slug: 'test-co', primary_color: '#111827', logo_url: null }
    tableData.bookings = {
      recurring_type: null,
      clients: { email: null, pin: null },
      team_members: { photo_url: 'https://example.com/photo.jpg', avg_rating: 4.876, rating_count: 12 },
    }
    const html = await buildBookingConfirmationEmail(OTHER_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Standard Cleaning',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
      teamMemberName: 'Maria',
    })
    expect(html).toContain('https://example.com/photo.jpg')
    expect(html).toContain('Maria')
    expect(html).toContain('4.9') // toFixed(1) of 4.876
    expect(html).toContain('12')
  })

  it('never includes the cleaner\'s phone or email — confirmation details only', async () => {
    tableData.tenants = { name: 'Test Co', slug: 'test-co' }
    tableData.bookings = {
      recurring_type: null,
      clients: { email: null, pin: null },
      team_members: { photo_url: null, avg_rating: null, rating_count: null },
    }
    const html = await buildBookingConfirmationEmail(OTHER_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Standard Cleaning',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
      teamMemberName: 'Maria',
    })
    expect(html).not.toContain('555-')
    expect(html).not.toContain('cleaner@')
  })

  it('renders the client portal PIN block only when the client has a PIN on file', async () => {
    tableData.tenants = { name: 'Test Co', slug: 'test-co' }
    tableData.bookings = {
      recurring_type: null,
      clients: { email: 'jane@example.com', pin: '445566' },
      team_members: null,
    }
    const html = await buildBookingConfirmationEmail(OTHER_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Standard Cleaning',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
    })
    expect(html).toContain('445566')
    expect(html).toContain('jane@example.com')
    expect(html).toContain('Your Client Portal')
  })

  it('omits the portal PIN block when the client has no PIN on file', async () => {
    tableData.tenants = { name: 'Test Co', slug: 'test-co' }
    tableData.bookings = { recurring_type: null, clients: { email: 'jane@example.com', pin: null }, team_members: null }
    const html = await buildBookingConfirmationEmail(OTHER_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Standard Cleaning',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
    })
    expect(html).not.toContain('Your Client Portal')
  })

  it('nycmaid falls back to its original cancellation-policy + prep-tips copy when no tenant policy is configured', async () => {
    tableData.tenants = { name: 'The NYC Maid', slug: 'nycmaid' }
    tableData.bookings = { recurring_type: null, clients: { email: null, pin: null }, team_members: null }
    tableData[`policy:${NYCMAID_TENANT_ID}`] = {}
    const html = await buildBookingConfirmationEmail(NYCMAID_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Standard Cleaning',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
    })
    expect(html).toContain('cannot be cancelled or rescheduled')
    expect(html).toContain('Clear the work area')
  })

  it('a non-nycmaid tenant with no configuration gets the same standard policy and trade-agnostic prep tips as nycmaid\'s default', async () => {
    tableData.tenants = { name: 'Tucker\'s Landscaping', slug: 'tuckers-landscaping-company' }
    tableData.bookings = { recurring_type: null, clients: { email: null, pin: null }, team_members: null }
    const html = await buildBookingConfirmationEmail(OTHER_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Lawn Care',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
    })
    expect(html).toContain('cannot be cancelled or rescheduled')
    expect(html).toContain('Clear the work area')
    expect(html).not.toContain('countertops') // old nycmaid-only, cleaning-specific copy is gone
  })

  it('a non-nycmaid tenant with its OWN configured cancellation policy gets that text rendered', async () => {
    tableData.tenants = { name: 'Test Co', slug: 'test-co' }
    tableData.bookings = { recurring_type: false, clients: { email: null, pin: null }, team_members: null }
    tableData[`policy:${OTHER_TENANT_ID}`] = { cancellationPolicyOneTime: 'Our custom 48-hour cancellation policy.' }
    const html = await buildBookingConfirmationEmail(OTHER_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Standard Cleaning',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
    })
    expect(html).toContain('Our custom 48-hour cancellation policy.')
  })

  it('a tenant with its own configured prep tips gets that text instead of the trade-agnostic default', async () => {
    tableData.tenants = { name: 'Test Co', slug: 'test-co' }
    tableData.bookings = { recurring_type: false, clients: { email: null, pin: null }, team_members: null }
    tableData[`policy:${OTHER_TENANT_ID}`] = { prepTips: 'Move vehicles off the driveway\nKeep gates unlocked during the visit' }
    const html = await buildBookingConfirmationEmail(OTHER_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Lawn Care',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
    })
    expect(html).toContain('Move vehicles off the driveway')
    expect(html).toContain('Keep gates unlocked during the visit')
    expect(html).not.toContain('Clear the work area')
  })

  it('uses the Full Loop shared branded shell, not nycmaid\'s standalone one', async () => {
    tableData.tenants = { name: 'The NYC Maid', slug: 'nycmaid' }
    tableData.bookings = { recurring_type: null, clients: { email: null, pin: null }, team_members: null }
    const html = await buildBookingConfirmationEmail(NYCMAID_TENANT_ID, BOOKING_ID, {
      clientName: 'Jane',
      serviceName: 'Standard Cleaning',
      dateTime: 'Fri, Jul 24 at 9:00 AM',
    })
    expect(html).toContain('Full') // "Full Loop" footer wordmark from baseTemplate
    expect(html).not.toContain('thenycmaid.com/logo.png') // nycmaid's old hardcoded asset
  })
})
