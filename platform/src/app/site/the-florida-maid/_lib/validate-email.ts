/**
 * Validates email and catches common typos in domains/TLDs.
 * Returns null if valid, or a suggestion string if a typo is detected.
 */

const TYPO_MAP: Record<string, string> = {
  // TLD typos
  '.con': '.com',
  '.cmo': '.com',
  '.ocm': '.com',
  '.vom': '.com',
  '.xom': '.com',
  '.comm': '.com',
  '.coom': '.com',
  '.comn': '.com',
  '.coml': '.com',
  '.nett': '.net',
  '.ner': '.net',
  '.nte': '.net',
  '.orgg': '.org',
  '.ogr': '.org',
}

const DOMAIN_TYPOS: Record<string, string> = {
  'gmal.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cmo': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllook.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'aol.con': 'aol.com',
}

const VALID_TLDS = [
  '.com', '.net', '.org', '.edu', '.gov', '.mil',
  '.io', '.co', '.me', '.us', '.uk', '.ca', '.de', '.fr',
  '.info', '.biz', '.xyz', '.app', '.dev', '.nyc'
]

export function validateEmail(email: string): { valid: boolean; suggestion?: string; error?: string } {
  if (!email) return { valid: false, error: 'Email is required' }

  const trimmed = email.trim().toLowerCase()

  if (!trimmed.includes('@')) return { valid: false, error: 'Please enter a valid email' }

  const [local, domain] = trimmed.split('@')
  if (!local || !domain) return { valid: false, error: 'Please enter a valid email' }
  if (!domain.includes('.')) return { valid: false, error: 'Please enter a valid email' }

  // Check domain typos first (most specific)
  if (DOMAIN_TYPOS[domain]) {
    return { valid: false, suggestion: `${local}@${DOMAIN_TYPOS[domain]}` }
  }

  // Check TLD typos
  for (const [typo, fix] of Object.entries(TYPO_MAP)) {
    if (domain.endsWith(typo) && fix !== null) {
      const correctedDomain = domain.slice(0, -typo.length) + fix
      return { valid: false, suggestion: `${local}@${correctedDomain}` }
    }
  }

  // Check if TLD is recognized
  const hasValidTLD = VALID_TLDS.some(tld => domain.endsWith(tld))
  if (!hasValidTLD) {
    // Extract the TLD
    const lastDot = domain.lastIndexOf('.')
    const tld = domain.slice(lastDot)
    if (tld.length <= 2 || tld.length > 6) {
      return { valid: false, error: `"${tld}" doesn't look like a valid email ending` }
    }
  }

  return { valid: true }
}
