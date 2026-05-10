// US phone validation + normalization.
// Strips non-digits, drops a leading country-code 1 if present, then enforces
// 10 digits with NANP-valid area code (NXX, N=2-9) and exchange (NXX, N=2-9).

export interface PhoneValidation {
  valid: boolean
  normalized: string // 10-digit string when valid, else input stripped
  reason?: 'too_short' | 'too_long' | 'bad_area_code' | 'bad_exchange' | 'empty'
}

export function validateUsPhone(input: string | null | undefined): PhoneValidation {
  if (!input) return { valid: false, normalized: '', reason: 'empty' }
  const digits = String(input).replace(/\D/g, '')
  let core = digits
  if (core.length === 11 && core.startsWith('1')) core = core.slice(1)
  if (core.length < 10) return { valid: false, normalized: digits, reason: 'too_short' }
  if (core.length > 10) return { valid: false, normalized: digits, reason: 'too_long' }
  const areaFirst = core.charCodeAt(0) - 48
  if (areaFirst < 2 || areaFirst > 9) return { valid: false, normalized: core, reason: 'bad_area_code' }
  const exchangeFirst = core.charCodeAt(3) - 48
  if (exchangeFirst < 2 || exchangeFirst > 9) return { valid: false, normalized: core, reason: 'bad_exchange' }
  return { valid: true, normalized: core }
}

// Reason → human-readable error for forms / emails.
export function phoneReasonText(r: PhoneValidation['reason']): string {
  switch (r) {
    case 'too_short': return 'Phone number is too short — 10 digits required.'
    case 'too_long': return 'Phone number is too long — only 10 digits (or 11 starting with 1) accepted.'
    case 'bad_area_code': return 'Area code is not valid (must start with 2-9).'
    case 'bad_exchange': return 'Phone exchange is not valid (must start with 2-9).'
    case 'empty': return 'Phone number is required.'
    default: return 'Phone number is not valid.'
  }
}
