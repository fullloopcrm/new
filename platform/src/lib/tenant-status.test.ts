import { describe, it, expect } from 'vitest'
import { tenantServesSite, NON_SERVING_STATUSES } from './tenant-status'

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
