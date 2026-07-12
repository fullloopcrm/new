import { describe, it, expect } from 'vitest'
import { getQuickReplies, EMPTY_CHECKLIST } from './selena-legacy'

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
