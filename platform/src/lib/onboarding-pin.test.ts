import { describe, it, expect } from 'vitest'
import { expectedOnboardingPin } from './onboarding-pin'

describe('expectedOnboardingPin', () => {
  it('returns the last 4 digits of phone', () => {
    expect(expectedOnboardingPin({ phone: '(212) 555-0199', owner_phone: null })).toBe('0199')
  })

  it('falls back to owner_phone when phone is missing', () => {
    expect(expectedOnboardingPin({ phone: null, owner_phone: '+1 917 555 4321' })).toBe('4321')
  })

  it('prefers phone over owner_phone when both are present', () => {
    expect(expectedOnboardingPin({ phone: '2125550199', owner_phone: '9175554321' })).toBe('0199')
  })

  it('returns null when neither field has enough digits', () => {
    expect(expectedOnboardingPin({ phone: null, owner_phone: null })).toBeNull()
    expect(expectedOnboardingPin({ phone: '12', owner_phone: null })).toBeNull()
    expect(expectedOnboardingPin({ phone: '', owner_phone: '' })).toBeNull()
  })
})
