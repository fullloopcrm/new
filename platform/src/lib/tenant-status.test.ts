import { describe, it, expect } from 'vitest'
import { tenantServesSite, NON_SERVING_STATUSES, isKnownTenantStatus, KNOWN_TENANT_STATUSES } from './tenant-status'

describe('tenantServesSite', () => {
  it('serves active, pending, setup, and unknown/null statuses', () => {
    expect(tenantServesSite('active')).toBe(true)
    expect(tenantServesSite('pending')).toBe(true)
    expect(tenantServesSite('setup')).toBe(true)
    expect(tenantServesSite(null)).toBe(true)
    expect(tenantServesSite(undefined)).toBe(true)
  })

  it('does not serve suspended, cancelled, or deleted', () => {
    for (const status of NON_SERVING_STATUSES) {
      expect(tenantServesSite(status)).toBe(false)
    }
  })
})

describe('isKnownTenantStatus', () => {
  it('accepts every status the platform actually writes', () => {
    for (const status of KNOWN_TENANT_STATUSES) {
      expect(isKnownTenantStatus(status)).toBe(true)
    }
  })

  it('rejects a case-mismatched status that would silently bypass tenantServesSite', () => {
    expect(isKnownTenantStatus('Suspended')).toBe(false)
    expect(isKnownTenantStatus('CANCELLED')).toBe(false)
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isKnownTenantStatus('banned')).toBe(false)
    expect(isKnownTenantStatus('')).toBe(false)
    expect(isKnownTenantStatus(null)).toBe(false)
    expect(isKnownTenantStatus(undefined)).toBe(false)
    expect(isKnownTenantStatus(123)).toBe(false)
  })
})
