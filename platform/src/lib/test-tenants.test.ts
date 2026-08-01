import { describe, expect, test } from 'vitest'
import { isKnownTestTenant } from './test-tenants'

describe('isKnownTestTenant', () => {
  test('matches a tenant whose slug carries the sim- prefix', () => {
    expect(isKnownTestTenant({ slug: 'sim-sim-electrical-9-mrnk4tot-bb42-0311b8' })).toBe(true)
  })

  test('matches a real-looking tenant whose tagline still carries the sim marker', () => {
    // Real live case found 2026-08-01: "Tucker's Landscaping Company" was
    // renamed after provisioning — slug/name no longer carry sim-, but the
    // tagline (set once, at provisioning time, from the pre-rename name)
    // still does.
    expect(
      isKnownTestTenant({
        slug: 'tuckers-landscaping-company',
        selena_config: { business_tagline: "Tucker's Landscaping Company (sim-mrqle65i-0fc7) — reliable lawn_care service" },
      }),
    ).toBe(true)
  })

  test('does not match a real tenant with a normal slug and tagline', () => {
    expect(
      isKnownTestTenant({
        slug: 'the-florida-maid',
        selena_config: { business_tagline: 'The Florida Maid — reliable cleaning service' },
      }),
    ).toBe(false)
  })

  test('does not match when selena_config or tagline is missing', () => {
    expect(isKnownTestTenant({ slug: 'the-florida-maid' })).toBe(false)
    expect(isKnownTestTenant({ slug: 'the-florida-maid', selena_config: {} })).toBe(false)
    expect(isKnownTestTenant({ slug: 'the-florida-maid', selena_config: null })).toBe(false)
  })

  test('does not false-positive on a business name that merely contains "sim" as a substring', () => {
    expect(
      isKnownTestTenant({
        slug: 'simply-clean-nyc',
        selena_config: { business_tagline: 'Simply Clean NYC — reliable cleaning service' },
      }),
    ).toBe(false)
  })
})
