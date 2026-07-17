import { describe, it, expect } from 'vitest'
import {
  smsBookingConfirmation,
  smsJobAssignment,
  smsReschedule,
  smsBookingReceivedES,
} from './sms-templates'

// Item (115): item (70)'s own flagged-but-deferred follow-up. These generic
// (non-cleaning) templates -- sent to all ~23 non-cleaning tenants spanning
// all 4 US zones, per item (70) -- formatted every date/time with zero
// `timeZone` option at all, so they rendered in the server runtime's
// default zone (UTC on Vercel), not even the tenant's own configured zone.
// Confirms the new optional `timezone` param actually changes the rendered
// clock time, not a no-op passthrough, and that omitting it still falls
// back to a real US zone (ET) rather than silently reverting to UTC.

const booking = { start_time: '2026-01-15T02:30:00.000Z' } // Jan 15, 2:30am UTC

describe('sms-templates — timezone plumbing (item 115)', () => {
  it('smsBookingConfirmation renders in the Pacific tenant zone passed in, not the runtime default', () => {
    const body = smsBookingConfirmation('Acme', booking, undefined, 'America/Los_Angeles')
    expect(body).toContain('Jan 14')
    expect(body).toContain('6:30 PM')
  })

  it('smsBookingConfirmation renders differently for an Eastern tenant, same instant', () => {
    const body = smsBookingConfirmation('Acme', booking, undefined, 'America/New_York')
    expect(body).toContain('Jan 14')
    expect(body).toContain('9:30 PM')
  })

  it('falls back to America/New_York when no timezone is provided (documented default, not silent UTC)', () => {
    const body = smsBookingConfirmation('Acme', booking)
    expect(body).toContain('Jan 14')
    expect(body).toContain('9:30 PM')
  })

  it('smsJobAssignment (team-facing) honors the same timezone param', () => {
    const body = smsJobAssignment('Acme', { ...booking, clients: { name: 'Jane' } }, undefined, 'America/Los_Angeles')
    expect(body).toContain('Jan 14')
    expect(body).toContain('6:30 PM')
  })

  it('smsReschedule (client-facing) honors the same timezone param', () => {
    const body = smsReschedule('Acme', booking, undefined, 'America/Los_Angeles')
    expect(body).toContain('Jan 14')
    expect(body).toContain('6:30 PM')
  })

  it('ES variant (smsBookingReceivedES) honors the same timezone param', () => {
    const body = smsBookingReceivedES('Acme', booking, 'America/Los_Angeles')
    expect(body).toContain('14')
    expect(body).toContain('6:30 PM')
  })
})
