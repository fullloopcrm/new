import { describe, it, expect, vi } from 'vitest'
import { COMM_TIMING } from './comms-registry'

type Resolution = { data: unknown; error: unknown }
let resolveTenantRead: () => Resolution

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => resolveTenantRead(),
        }),
      }),
    }),
  },
}))

const { defaultCommTiming, getCapabilities } = await import('./comms-prefs')

describe('defaultCommTiming', () => {
  it('mirrors the registry defaults exactly', () => {
    expect(defaultCommTiming()).toEqual({
      reminder_days: [3, 1],
      reminder_hours_before: [2],
      review_delay_hours: 2,
      daily_summary_hour: 0,
      payment_reminder_hours: 24,
    })
  })

  it('array-typed defaults are copied per call, not shared by reference', () => {
    // Regression guard: defaultCommTiming() must return a fresh array each call.
    // Previously it returned `COMM_TIMING.reminder_days.default` directly, so every
    // caller got the SAME array object and mutating one "fresh" prefs object
    // corrupted the registry default for the rest of the process until restart.
    const a = defaultCommTiming()
    const b = defaultCommTiming()
    a.reminder_days.push(99)
    a.reminder_hours_before.push(99)
    expect(b.reminder_days).toEqual([3, 1])
    expect(b.reminder_hours_before).toEqual([2])
    expect(a.reminder_days).not.toBe(b.reminder_days)
    expect(a.reminder_hours_before).not.toBe(b.reminder_hours_before)
    expect(COMM_TIMING.reminder_days.default).toEqual([3, 1])
    expect(COMM_TIMING.reminder_hours_before.default).toEqual([2])
  })
})

describe('getCapabilities', () => {
  it('MASKED-ERROR PROBE: a genuine DB failure on the api-key read fails loud, not silently treated as "no keys configured"', async () => {
    resolveTenantRead = () => ({ data: null, error: { message: 'read replica unreachable' } })
    await expect(getCapabilities('t-1')).rejects.toThrow(/TENANT_CAPABILITIES_LOOKUP_ERROR/)
  })

  it('returns real capabilities when the tenant row loads normally', async () => {
    resolveTenantRead = () => ({
      data: { resend_api_key: 'k', telnyx_api_key: 'tk', telnyx_phone: '+15551234567' },
      error: null,
    })
    expect(await getCapabilities('t-1')).toEqual({ email: true, sms: true })
  })
})
