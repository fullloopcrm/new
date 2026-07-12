import { describe, it, expect } from 'vitest'
import { getQuickReplies, getNextStep, EMPTY_CHECKLIST } from './selena-legacy'

// F5: getQuickReplies() must never leak cleaning-specific vocabulary
// ("Cleaning", "Deep clean", bed/bath sizes) into a non-cleaning trade's
// web-chat quick-reply buttons. The bug: /api/chat/route.ts called
// getQuickReplies() without the tenant's serviceTypes/config, so every
// non-nycmaid tenant — towing, HVAC, plumbing, etc — fell through to a
// hardcoded cleaning-industry default.

const CLEANING_WORDS = /\bclean(?:ing|er)?\b|\bdeep clean\b|\bmove-in\/out\b|\bbed\b|\bbath\b/i

const askingServiceType = { ...EMPTY_CHECKLIST, status: 'collecting' as const }
const nextStepServiceType = { field: 'service_type', instruction: 'Ask what type of service they need.' }

describe('getQuickReplies — trade-neutral vocabulary (F5)', () => {
  it('does not leak cleaning vocabulary for a towing tenant with real service types', () => {
    const towingServiceTypes = ['Local Tow', 'Long-distance Tow', 'Jumpstart/Lockout', 'Winch/Recovery']

    const replies = getQuickReplies(askingServiceType, nextStepServiceType, towingServiceTypes)

    expect(replies).toEqual(towingServiceTypes.slice(0, 4))
    expect(replies.some((r) => CLEANING_WORDS.test(r))).toBe(false)
  })

  it('does not leak cleaning vocabulary for an HVAC tenant with real service types', () => {
    const hvacServiceTypes = ['Tune-up', 'Repair', 'Install', 'Emergency']

    const replies = getQuickReplies(askingServiceType, nextStepServiceType, hvacServiceTypes)

    expect(replies.some((r) => CLEANING_WORDS.test(r))).toBe(false)
  })

  it('falls back to trade-neutral copy (not hardcoded cleaning terms) when no service types are configured', () => {
    // Regression guard for the fallback itself — even with nothing configured,
    // the default must not be cleaning-specific.
    const replies = getQuickReplies(askingServiceType, nextStepServiceType)

    expect(replies.some((r) => CLEANING_WORDS.test(r))).toBe(false)
  })
})

// Sweep finding: DEFAULT_CHECKLIST_FIELDS (used whenever a tenant hasn't
// configured its own checklist_fields) hardcoded the 'bedrooms' step to ask
// "how many bedrooms and bathrooms" and offer "1 bed 1 bath" style quick
// replies for EVERY tenant — the same class of bug as F5's service_type leak,
// just in the size/scope step instead of the service-type step. A towing or
// HVAC tenant that never configured checklist_fields would still get this.
const askingBedrooms = { ...EMPTY_CHECKLIST, status: 'collecting' as const, service_type: 'Local Tow' }

describe('bedrooms/size step — trade-neutral default (sweep)', () => {
  it('getNextStep does not ask a non-cleaning trade about bedrooms/bathrooms when unconfigured', () => {
    const next = getNextStep(askingBedrooms) // no config → DEFAULT_CHECKLIST_FIELDS
    expect(next.field).toBe('bedrooms')
    expect(CLEANING_WORDS.test(next.instruction)).toBe(false)
  })

  it('getQuickReplies offers no bed/bath quick replies for the bedrooms step when unconfigured', () => {
    const nextStepBedrooms = { field: 'bedrooms', instruction: 'Ask for whatever size/scope detail is relevant to this job.' }
    const replies = getQuickReplies(askingBedrooms, nextStepBedrooms)
    expect(replies).toEqual([])
  })
})
