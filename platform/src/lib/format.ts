// ── Date / time formatting ───────────────────────────────────────────

/** "Mon, Mar 10" */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Mar 10, 2026" */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "2:30 PM" */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** "Mon, Mar 10 at 2:30 PM" */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`
}

/** "3 days ago", "just now", "in 2 hours" */
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = Date.now()
  const diff = now - d.getTime()
  const absDiff = Math.abs(diff)
  const future = diff < 0

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let label: string
  if (seconds < 60) label = 'just now'
  else if (minutes < 60) label = `${minutes}m`
  else if (hours < 24) label = `${hours}h`
  else if (days < 30) label = `${days}d`
  else label = formatDate(d)

  if (label === 'just now') return label
  return future ? `in ${label}` : `${label} ago`
}

// ── Phone / name / address formatting ────────────────────────────────

// Format phone to (XXX) XXX-XXXX
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone // Return as-is if can't format
}

// Capitalize first letter of each word
export function formatName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

// Lowercase email
export function formatEmail(email: string): string {
  return email.toLowerCase().trim()
}

// Format address - capitalize properly
export function formatAddress(address: string): string {
  // Common abbreviations to keep uppercase
  const abbrevs = ['NY', 'NYC', 'NJ', 'CT', 'ST', 'AVE', 'BLVD', 'DR', 'LN', 'RD', 'PL', 'APT', 'FL']

  return address
    .split(' ')
    .map(word => {
      const upper = word.toUpperCase()
      if (abbrevs.includes(upper)) return upper
      if (/^\d+$/.test(word)) return word // Keep numbers as-is
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
    .trim()
}
