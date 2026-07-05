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
