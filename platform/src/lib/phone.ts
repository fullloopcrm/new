/**
 * Format a phone number as the user types: (555) 123-4567
 * Strips non-digits first, then applies formatting progressively.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)

  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/**
 * Strip a phone string to digits only, for storage.
 */
export function stripPhone(value: string): string {
  return value.replace(/\D/g, '')
}

const KEYPAD_LETTERS: Record<string, string> = {
  A: '2', B: '2', C: '2',
  D: '3', E: '3', F: '3',
  G: '4', H: '4', I: '4',
  J: '5', K: '5', L: '5',
  M: '6', N: '6', O: '6',
  P: '7', Q: '7', R: '7', S: '7',
  T: '8', U: '8', V: '8',
  W: '9', X: '9', Y: '9', Z: '9',
}

/**
 * Strip a phone string to dialable digits for a `tel:` href, converting any
 * vanity keypad letters (e.g. "(415) 573-FILM") to their numeric equivalent
 * first. A plain numeric phone passes through exactly like `stripPhone`.
 */
export function dialDigits(value: string): string {
  return value
    .toUpperCase()
    .split('')
    .map((ch) => KEYPAD_LETTERS[ch] ?? ch)
    .join('')
    .replace(/\D/g, '')
}

/**
 * Normalize a phone number to E.164 (+1XXXXXXXXXX) for storage. Same
 * canonical format as client_contacts.phone_e164 and the normalization
 * lib/sms.ts already applies at the send boundary — see that file's comment
 * for why E.164 was chosen (Telnyx rejects bare 10-digit numbers). Null if
 * unparseable so callers can distinguish "no phone" from "bad phone".
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 0) return null
  return `+${digits}`
}
