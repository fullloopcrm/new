import { describe, it, expect } from 'vitest'
import { getAuthoredConfig } from './index'
import { EXTERMINATOR_SLUG, exterminatorConfig } from './the-nyc-exterminator'
import { NYC_TOW_SLUG, nycTowConfig } from './nyc-tow'
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
