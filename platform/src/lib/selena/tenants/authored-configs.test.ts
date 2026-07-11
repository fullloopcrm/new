import { describe, it, expect } from 'vitest'
import { getAuthoredConfig } from './index'
import { EXTERMINATOR_SLUG, exterminatorConfig } from './the-nyc-exterminator'
import { NYC_TOW_SLUG, nycTowConfig } from './nyc-tow'
import { NYC_MOBILE_SALON_SLUG, nycMobileSalonConfig } from './nyc-mobile-salon'
import { WE_PAY_YOU_JUNK_SLUG, wePayYouJunkConfig } from './we-pay-you-junk'
import { LANDSCAPING_IN_NYC_SLUG, landscapingInNycConfig } from './landscaping-in-nyc'
import { THE_FLORIDA_MAID_SLUG, theFloridaMaidConfig } from './the-florida-maid'
import { NYC_ROADSIDE_SLUG, nycRoadsideConfig } from './nycroadsideemergencyassistance'
import { THE_ROADSIDE_HELPER_SLUG, theRoadsideHelperConfig } from './theroadsidehelper'
import { SUNNYSIDE_CLEAN_SLUG, sunnysideCleanConfig } from './sunnyside-clean-nyc'
import { WASH_AND_FOLD_NYC_SLUG, washAndFoldNycConfig } from './wash-and-fold-nyc'
import { FLA_DUMPSTER_RENTALS_SLUG, flaDumpsterRentalsConfig } from './fla-dumpster-rentals'
import { STRETCH_NY_SLUG, stretchNyConfig } from './stretch-ny'
import { STRETCH_SERVICE_SLUG, stretchServiceConfig } from './stretch-service'
import { DSCR_LOAN_SLUG, dscrLoanConfig } from './debt-service-ratio-loan'
import { exterminatorAgentConfig } from '../agent-config'
import { buildPlaybook } from '../build-playbook'
import { assertNycmaidInvariant } from '../prompt-assembler'

const GENERIC_PERSONA = 'professional, warm, and efficient'

/**
 * The per-tenant authored-config layer. The base engine derives a NEUTRAL config
 * from DB; a tenant listed in the registry instead resolves to its OWN authored
 * persona. These tests pin: (1) the exterminator resolves to its reassuring
 * pest-control persona — not the generic default; (2) it stays quote_only (never
 * quotes a price — this is authored, not a bug); (3) nycmaid is NOT in the
 * registry and its assembled prompt is byte-unchanged.
 */

describe('exterminator wiring — the previously-dead exterminatorAgentConfig', () => {
  it('registry resolves the exterminator slug to the authored config', () => {
    expect(getAuthoredConfig(EXTERMINATOR_SLUG)).toBe(exterminatorConfig)
  })

  it('the per-tenant file re-exports the authored config (F2: dead export now imported)', () => {
    expect(exterminatorConfig).toBe(exterminatorAgentConfig)
  })

  it('resolves to its OWN reassuring persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(EXTERMINATOR_SLUG)!
    expect(cfg.identity.business_name).toBe('The NYC Exterminator')
    expect(cfg.voice.persona).toContain('calm, competent, and reassuring')
    // The generic default persona (agent-config-loader) says "professional,
    // warm, and efficient" — prove we are NOT getting that.
    expect(cfg.voice.persona).not.toContain('professional, warm, and efficient')
  })

  it('is quote_only — the agent NEVER quotes a price (authored, by design)', () => {
    const cfg = getAuthoredConfig(EXTERMINATOR_SLUG)!
    expect(cfg.pricing.model).toBe('quote_only')
    expect(cfg.pricing.copy).toContain('NEVER quote a price')
    // buildPlaybook must render the DO-NOT-QUOTE block for this tenant.
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('PRICING — DO NOT QUOTE')
    expect(playbook).toContain('212-202-8545')
  })
})

describe('nyc-tow — roadside/towing dispatch persona', () => {
  it('registry resolves the tow slug to the authored config', () => {
    expect(getAuthoredConfig(NYC_TOW_SLUG)).toBe(nycTowConfig)
  })

  it('resolves to its OWN dispatcher persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(NYC_TOW_SLUG)!
    expect(cfg.identity.business_name).toBe('The NYC Towing Service')
    expect(cfg.voice.persona).toContain('roadside dispatcher')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL flat rates (carried via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(NYC_TOW_SLUG)!
    expect(cfg.pricing.model).toBe('flat')
    // The three published tiers from the marketing site.
    expect(cfg.pricing.copy).toContain('$85')
    expect(cfg.pricing.copy).toContain('$125')
    expect(cfg.pricing.copy).toContain('$175')
    // flat model → no /hr unit on the rate list.
    expect(cfg.pricing.copy).toContain('Roadside (jump, tire, lockout, gas) — $85')
    expect(cfg.pricing.copy).not.toContain('$85/hr')
  })

  it('renders a quote-first dispatch flow with the real phone', () => {
    const cfg = getAuthoredConfig(NYC_TOW_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('PRICING — DO NOT GUESS')
    expect(playbook).toContain('quote-first')
    expect(playbook).toContain('(212) 470-4068')
  })
})

describe('nyc-mobile-salon — mobile beauty booking-concierge persona', () => {
  it('registry resolves the salon slug to the authored config', () => {
    expect(getAuthoredConfig(NYC_MOBILE_SALON_SLUG)).toBe(nycMobileSalonConfig)
  })

  it('resolves to its OWN warm/grateful persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(NYC_MOBILE_SALON_SLUG)!
    expect(cfg.identity.business_name).toBe('The NYC Mobile Salon')
    expect(cfg.voice.persona).toContain('warm, welcoming, grateful')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL flat per-service rates (carried via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(NYC_MOBILE_SALON_SLUG)!
    expect(cfg.pricing.model).toBe('flat')
    expect(cfg.pricing.copy).toContain('Haircut — $50')
    expect(cfg.pricing.copy).toContain('Color — $150')
    expect(cfg.pricing.copy).toContain('Bridal (hair + makeup) — $200')
    expect(cfg.pricing.copy).toContain('10% off') // recurring discount
    expect(cfg.pricing.copy).not.toContain('/hr') // flat, not hourly
  })

  it('renders an appointment BOOKING FLOW with real prices and phone', () => {
    const cfg = getAuthoredConfig(NYC_MOBILE_SALON_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('BOOKING FLOW')
    expect(playbook).toContain('PRICING — DO NOT GUESS')
    expect(playbook).toContain('$150')
    expect(playbook).toContain('(212) 202-9075')
  })
})

describe('we-pay-you-junk — junk removal, hourly + resale-credit persona', () => {
  it('registry resolves the junk slug to the authored config', () => {
    expect(getAuthoredConfig(WE_PAY_YOU_JUNK_SLUG)).toBe(wePayYouJunkConfig)
  })

  it('resolves to its OWN honest/transparent persona, not the generic default', () => {
    const cfg = getAuthoredConfig(WE_PAY_YOU_JUNK_SLUG)!
    expect(cfg.identity.business_name).toBe('We Pay You Junk Removal')
    expect(cfg.voice.persona).toContain('honest, upfront')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL hourly rate + credit policy (rate carried via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(WE_PAY_YOU_JUNK_SLUG)!
    expect(cfg.pricing.model).toBe('hourly')
    expect(cfg.pricing.copy).toContain('Junk Removal — $200/hr') // hourly unit present
    expect(cfg.pricing.copy).toContain('50%') // resale credit
    expect(cfg.pricing.copy).toContain('we pay YOU the difference')
  })

  it('renders an hourly BOOKING FLOW with real rate and phone', () => {
    const cfg = getAuthoredConfig(WE_PAY_YOU_JUNK_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('BOOKING FLOW')
    expect(playbook).toContain('$200/hr')
    expect(playbook).toContain('(888) 831-3001')
  })
})

describe('landscaping-in-nyc — bespoke landscaping, quote-first persona', () => {
  it('registry resolves the landscaping slug to the authored config', () => {
    expect(getAuthoredConfig(LANDSCAPING_IN_NYC_SLUG)).toBe(landscapingInNycConfig)
  })

  it('resolves to its OWN landscaping persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(LANDSCAPING_IN_NYC_SLUG)!
    expect(cfg.identity.business_name).toBe('Landscaping In NYC')
    expect(cfg.voice.persona).toContain('landscaping pro')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('is quote_only — bespoke jobs are estimated on-site, agent quotes nothing', () => {
    const cfg = getAuthoredConfig(LANDSCAPING_IN_NYC_SLUG)!
    expect(cfg.pricing.model).toBe('quote_only')
    expect(cfg.pricing.copy).toContain('NEVER quote a price')
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('PRICING — DO NOT QUOTE')
    expect(playbook).toContain('quote-first')
    expect(playbook).toContain('(212) 470-9637')
  })
})

describe('the-florida-maid — Florida cleaning, hourly booking persona', () => {
  it('registry resolves the florida-maid slug to the authored config', () => {
    expect(getAuthoredConfig(THE_FLORIDA_MAID_SLUG)).toBe(theFloridaMaidConfig)
  })

  it('resolves to its OWN Florida cleaning persona, not the generic default', () => {
    const cfg = getAuthoredConfig(THE_FLORIDA_MAID_SLUG)!
    expect(cfg.identity.business_name).toBe('The Florida Maid')
    expect(cfg.voice.persona).toContain('cleaning-service manager')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL hourly rate (carried via buildPriceCopy) and never a flat total', () => {
    const cfg = getAuthoredConfig(THE_FLORIDA_MAID_SLUG)!
    expect(cfg.pricing.model).toBe('hourly')
    expect(cfg.pricing.copy).toContain('Home Cleaning — $49/hr')
    expect(cfg.pricing.copy).toContain('do NOT lock in a flat total')
  })

  it('renders an hourly BOOKING FLOW with self-book offer and real phone', () => {
    const cfg = getAuthoredConfig(THE_FLORIDA_MAID_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('BOOKING FLOW')
    expect(playbook).toContain('$49/hr')
    expect(playbook).toContain('SELF-BOOK OFFER')
    expect(playbook).toContain('(954) 710-3636')
  })

  it('is a SEPARATE tenant from nycmaid — florida-maid is authored, nycmaid is not', () => {
    // the-florida-maid rides the authored registry; nycmaid keeps its verbatim
    // short-circuit path and must NOT be in the registry.
    expect(getAuthoredConfig(THE_FLORIDA_MAID_SLUG)).not.toBeNull()
    expect(getAuthoredConfig('nycmaid')).toBeNull()
  })
})

describe('nycroadsideemergencyassistance — 24/7 roadside dispatch persona', () => {
  it('registry resolves the roadside slug to the authored config', () => {
    expect(getAuthoredConfig(NYC_ROADSIDE_SLUG)).toBe(nycRoadsideConfig)
  })

  it('resolves to its OWN dispatcher persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(NYC_ROADSIDE_SLUG)!
    expect(cfg.identity.business_name).toBe('NYC Roadside Emergency Assistance')
    expect(cfg.voice.persona).toContain('roadside dispatcher')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL one-rate hourly pricing (carried via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(NYC_ROADSIDE_SLUG)!
    expect(cfg.pricing.model).toBe('hourly')
    expect(cfg.pricing.copy).toContain('Roadside, towing & recovery — $149/hr')
    expect(cfg.pricing.copy).toContain('$124') // first hour booked online
    expect(cfg.pricing.copy).toContain('1-hour minimum')
  })

  it('renders a quote-first dispatch flow with the real phone', () => {
    const cfg = getAuthoredConfig(NYC_ROADSIDE_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('PRICING — DO NOT GUESS')
    expect(playbook).toContain('quote-first')
    expect(playbook).toContain('(212) 470-4068')
  })
})

describe('theroadsidehelper — nationwide, no-membership roadside dispatch persona', () => {
  it('registry resolves the roadside-helper slug to the authored config', () => {
    expect(getAuthoredConfig(THE_ROADSIDE_HELPER_SLUG)).toBe(theRoadsideHelperConfig)
  })

  it('resolves to its OWN dispatcher persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(THE_ROADSIDE_HELPER_SLUG)!
    expect(cfg.identity.business_name).toBe('The Roadside Helper')
    expect(cfg.voice.persona).toContain('roadside dispatcher')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL one-rate hourly pricing + no-membership pitch (via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(THE_ROADSIDE_HELPER_SLUG)!
    expect(cfg.pricing.model).toBe('hourly')
    expect(cfg.pricing.copy).toContain('Roadside, towing & recovery — $149/hr')
    expect(cfg.pricing.copy).toContain('$124') // first hour booked online
    expect(cfg.pricing.copy).toContain('No membership')
  })

  it('serves nationwide and renders a quote-first dispatch flow with the real phone', () => {
    const cfg = getAuthoredConfig(THE_ROADSIDE_HELPER_SLUG)!
    expect(cfg.service_area).toContain('nationwide')
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('PRICING — DO NOT GUESS')
    expect(playbook).toContain('quote-first')
    expect(playbook).toContain('(888) 944-3001')
  })
})

describe('sunnyside-clean-nyc — NYC cleaning, tiered hourly booking persona', () => {
  it('registry resolves the sunnyside slug to the authored config', () => {
    expect(getAuthoredConfig(SUNNYSIDE_CLEAN_SLUG)).toBe(sunnysideCleanConfig)
  })

  it('resolves to its OWN cleaning persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(SUNNYSIDE_CLEAN_SLUG)!
    expect(cfg.identity.business_name).toBe('Sunnyside Clean NYC')
    expect(cfg.voice.persona).toContain('cleaning-service manager')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL tiered hourly rates (carried via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(SUNNYSIDE_CLEAN_SLUG)!
    expect(cfg.pricing.model).toBe('hourly')
    expect(cfg.pricing.copy).toContain('You provide supplies — $59/hr')
    expect(cfg.pricing.copy).toContain('We bring everything — $79/hr')
    expect(cfg.pricing.copy).toContain('Same-day / emergency — $99/hr')
    expect(cfg.pricing.copy).toContain('do NOT lock in a flat total')
  })

  it('renders an hourly BOOKING FLOW with real tiers and phone', () => {
    const cfg = getAuthoredConfig(SUNNYSIDE_CLEAN_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('BOOKING FLOW')
    expect(playbook).toContain('$59/hr')
    expect(playbook).toContain('(212) 202-9030')
  })
})

describe('wash-and-fold-nyc — per-pound laundry pickup/delivery persona', () => {
  it('registry resolves the wash-and-fold slug to the authored config', () => {
    expect(getAuthoredConfig(WASH_AND_FOLD_NYC_SLUG)).toBe(washAndFoldNycConfig)
  })

  it('resolves to its OWN laundry persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(WASH_AND_FOLD_NYC_SLUG)!
    expect(cfg.identity.business_name).toBe('The NYC Wash and Fold Service Company')
    expect(cfg.voice.persona).toContain('laundry-service manager')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL per-pound rate, minimum, and rush fee (authored copy)', () => {
    const cfg = getAuthoredConfig(WASH_AND_FOLD_NYC_SLUG)!
    expect(cfg.pricing.model).toBe('flat')
    expect(cfg.pricing.copy).toContain('$3/lb')
    expect(cfg.pricing.copy).toContain('$39 minimum')
    expect(cfg.pricing.copy).toContain('+$20') // same-day rush
    expect(cfg.pricing.copy).toContain('never invent a flat total')
  })

  it('renders an appointment BOOKING FLOW with real per-pound pricing and phone', () => {
    const cfg = getAuthoredConfig(WASH_AND_FOLD_NYC_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('BOOKING FLOW')
    expect(playbook).toContain('$3/lb')
    expect(playbook).toContain('(917) 970-6002')
  })
})

describe('fla-dumpster-rentals — Florida roll-off dumpster, flat-rate quote-first persona', () => {
  it('registry resolves the dumpster slug to the authored config', () => {
    expect(getAuthoredConfig(FLA_DUMPSTER_RENTALS_SLUG)).toBe(flaDumpsterRentalsConfig)
  })

  it('resolves to its OWN dumpster persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(FLA_DUMPSTER_RENTALS_SLUG)!
    expect(cfg.identity.business_name).toBe('Florida Dumpster Rentals')
    expect(cfg.voice.persona).toContain('dumpster-rental pro')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL flat starting rates by size (carried via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(FLA_DUMPSTER_RENTALS_SLUG)!
    expect(cfg.pricing.model).toBe('flat')
    expect(cfg.pricing.copy).toContain('10 yard roll-off — $275')
    expect(cfg.pricing.copy).toContain('20 yard roll-off — $350')
    expect(cfg.pricing.copy).toContain('30 yard roll-off — $450')
    expect(cfg.pricing.copy).not.toContain('$275/hr') // flat, not hourly
  })

  it('renders a quote-first flow with the real phone', () => {
    const cfg = getAuthoredConfig(FLA_DUMPSTER_RENTALS_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('PRICING — DO NOT GUESS')
    expect(playbook).toContain('quote-first')
    expect(playbook).toContain('954-710-2332')
  })
})

describe('stretch-ny — NYC mobile assisted-stretch booking persona', () => {
  it('registry resolves the stretch-ny slug to the authored config', () => {
    expect(getAuthoredConfig(STRETCH_NY_SLUG)).toBe(stretchNyConfig)
  })

  it('resolves to its OWN wellness persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(STRETCH_NY_SLUG)!
    expect(cfg.identity.business_name).toBe('Stretch NYC')
    expect(cfg.voice.persona).toContain('mobile-wellness concierge')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL hourly session rate (carried via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(STRETCH_NY_SLUG)!
    expect(cfg.pricing.model).toBe('hourly')
    expect(cfg.pricing.copy).toContain('60-minute mobile stretch session — $99/hr')
    expect(cfg.pricing.copy).toContain('10%') // weekly recurring discount
  })

  it('renders an appointment BOOKING FLOW with real rate and phone', () => {
    const cfg = getAuthoredConfig(STRETCH_NY_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('BOOKING FLOW')
    expect(playbook).toContain('$99/hr')
    expect(playbook).toContain('(212) 202-7080')
  })
})

describe('stretch-service — nationwide mobile assisted-stretch booking persona', () => {
  it('registry resolves the stretch-service slug to the authored config', () => {
    expect(getAuthoredConfig(STRETCH_SERVICE_SLUG)).toBe(stretchServiceConfig)
  })

  it('resolves to its OWN wellness persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(STRETCH_SERVICE_SLUG)!
    expect(cfg.identity.business_name).toBe('Stretch Service')
    expect(cfg.voice.persona).toContain('mobile-wellness concierge')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('quotes its REAL hourly session rate and serves nationwide (via buildPriceCopy)', () => {
    const cfg = getAuthoredConfig(STRETCH_SERVICE_SLUG)!
    expect(cfg.pricing.model).toBe('hourly')
    expect(cfg.pricing.copy).toContain('60-minute mobile stretch session — $99/hr')
    expect(cfg.service_area).toContain('nationwide')
  })

  it('renders an appointment BOOKING FLOW with real rate and phone', () => {
    const cfg = getAuthoredConfig(STRETCH_SERVICE_SLUG)!
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('BOOKING FLOW')
    expect(playbook).toContain('$99/hr')
    expect(playbook).toContain('(888) 734-7274')
  })
})

describe('debt-service-ratio-loan — DSCR investor-loan lead-intake persona', () => {
  it('registry resolves the DSCR slug to the authored config', () => {
    expect(getAuthoredConfig(DSCR_LOAN_SLUG)).toBe(dscrLoanConfig)
  })

  it('resolves to its OWN loan-intake persona, not the generic professional default', () => {
    const cfg = getAuthoredConfig(DSCR_LOAN_SLUG)!
    expect(cfg.identity.business_name).toBe('DebtServiceRatioLoan.com')
    expect(cfg.voice.persona).toContain('DSCR-loan concierge')
    expect(cfg.voice.persona).not.toContain(GENERIC_PERSONA)
  })

  it('is quote_only — regulated lending, the agent NEVER quotes a rate (authored)', () => {
    const cfg = getAuthoredConfig(DSCR_LOAN_SLUG)!
    expect(cfg.pricing.model).toBe('quote_only')
    expect(cfg.pricing.copy).toContain('NEVER quote an interest rate')
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('PRICING — DO NOT QUOTE')
  })

  it('renders a lead-capture flow (not booking/quote-first) with the real phone', () => {
    const cfg = getAuthoredConfig(DSCR_LOAN_SLUG)!
    expect(cfg.booking.model).toBe('lead_only')
    const playbook = buildPlaybook(cfg)
    expect(playbook).toContain('lead capture')
    expect(playbook).toContain('(855) 300-3727')
  })
})

describe('nycmaid is untouched by the per-tenant layer', () => {
  it('is NOT in the authored-config registry (keeps its verbatim prompt path)', () => {
    // nycmaid is served by agent.ts short-circuit, never the registry. Both its
    // slug and its well-known UUID must miss the registry.
    expect(getAuthoredConfig('nycmaid')).toBeNull()
    expect(getAuthoredConfig('00000000-0000-0000-0000-000000000001')).toBeNull()
  })

  it('empty / unknown slug falls through to the base engine (null)', () => {
    expect(getAuthoredConfig(null)).toBeNull()
    expect(getAuthoredConfig(undefined)).toBeNull()
    expect(getAuthoredConfig('')).toBeNull()
    expect(getAuthoredConfig('some-other-tenant')).toBeNull()
  })

  it("nycmaid's assembled prompt is byte-identical to its authored prompt", () => {
    expect(assertNycmaidInvariant()).toEqual({ ok: true })
  })
})
