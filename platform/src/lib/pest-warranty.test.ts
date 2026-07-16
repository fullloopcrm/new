import { describe, it, expect } from 'vitest'
import { warrantyStatus, warrantyExpiresOn, suggestWarrantyDays } from './pest-warranty'

describe('warrantyStatus', () => {
  const today = new Date('2026-07-16T12:00:00Z')

  it('is "none" when no warranty_days is set', () => {
    expect(warrantyStatus('2026-07-01', null, today)).toBe('none')
    expect(warrantyStatus('2026-07-01', undefined, today)).toBe('none')
    expect(warrantyStatus('2026-07-01', 0, today)).toBe('none')
  })

  it('is "none" for a missing/invalid application_date', () => {
    expect(warrantyStatus(null, 30, today)).toBe('none')
    expect(warrantyStatus('not-a-date', 30, today)).toBe('none')
  })

  it('is "active" comfortably inside the window', () => {
    // applied 2026-07-01 + 30 days = expires 2026-07-31, today is 07-16 (15 days out)
    expect(warrantyStatus('2026-07-01', 30, today)).toBe('active')
  })

  it('is "expiring_soon" within the last 7 days of the window', () => {
    // applied 2026-07-01 + 20 days = expires 2026-07-21, today 07-16 = 5 days out
    expect(warrantyStatus('2026-07-01', 20, today)).toBe('expiring_soon')
    // exactly 7 days out is still expiring_soon (inclusive boundary)
    expect(warrantyStatus('2026-07-01', 22, today)).toBe('expiring_soon')
  })

  it('is "expired" once the window has passed', () => {
    expect(warrantyStatus('2026-06-01', 30, today)).toBe('expired')
  })

  it('the expiry boundary itself (today) is expiring_soon, not expired', () => {
    // applied 2026-06-16 + 30 days = expires exactly 2026-07-16 (today)
    expect(warrantyStatus('2026-06-16', 30, today)).toBe('expiring_soon')
  })

  it('the day after expiry is expired', () => {
    // applied 2026-06-15 + 30 days = expires 2026-07-15 (yesterday)
    expect(warrantyStatus('2026-06-15', 30, today)).toBe('expired')
  })
})

describe('warrantyExpiresOn', () => {
  it('adds warranty_days to the application date', () => {
    expect(warrantyExpiresOn('2026-07-01', 30)).toBe('2026-07-31')
  })

  it('handles a 90-day bed bug window across a month boundary', () => {
    expect(warrantyExpiresOn('2026-07-16', 90)).toBe('2026-10-14')
  })

  it('handles a 365-day termite window across a year boundary', () => {
    expect(warrantyExpiresOn('2026-07-16', 365)).toBe('2027-07-16')
  })
})

describe('suggestWarrantyDays', () => {
  it('suggests 90 days for bed bug treatments', () => {
    expect(suggestWarrantyDays('Bed Bugs')).toBe(90)
    expect(suggestWarrantyDays('bedbug')).toBe(90)
  })

  it('suggests 365 days for termite treatments', () => {
    expect(suggestWarrantyDays('Termites')).toBe(365)
  })

  it('defaults to 30 days for general pests', () => {
    expect(suggestWarrantyDays('Cockroach')).toBe(30)
    expect(suggestWarrantyDays('Mice')).toBe(30)
    expect(suggestWarrantyDays(null)).toBe(30)
    expect(suggestWarrantyDays(undefined)).toBe(30)
  })
})
