// Selena's check-in outreach
// Warm, friendly, personal — Selena with The NYC Maid checking in
// No selling, no discounts, no "if you need anything" — just genuine warmth
// Send on Saturdays at 10am ET (single-day moments send on the day)

export interface OutreachMoment {
  id: string
  name: string
  sendMonth: number       // 0-indexed
  sendDayStart: number
  sendDayEnd: number
  petOnly?: 'dog' | 'cat' // Only send to clients with this pet type
  petAny?: boolean         // Any pet owner
  messages: string[]       // {name} = first name, {pet} = pet name
}

export const OUTREACH_MOMENTS: OutreachMoment[] = [
  // 1. New Year
  {
    id: 'new_year',
    name: 'New Year',
    sendMonth: 0, sendDayStart: 5, sendDayEnd: 10,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy new year — hope the holidays were amazing. Wishing you a great start to the year!",
    ],
  },
  // 2. First day of spring
  {
    id: 'spring_2026',
    name: 'Spring check-in',
    sendMonth: 3, sendDayStart: 1, sendDayEnd: 5,  // April — first send for 2026 launch
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy first day of spring! Hope you're enjoying the warmer weather. Have a great day!",
    ],
  },
  // 3. National Puppy Day — Mar 23
  {
    id: 'puppy_day',
    name: 'National Puppy Day',
    sendMonth: 2, sendDayStart: 23, sendDayEnd: 23,
    petOnly: 'dog',
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy National Puppy Day — hope {pet} is living the good life! Have a great day!",
    ],
  },
  // 4. National Pet Day — Apr 11
  {
    id: 'pet_day',
    name: 'National Pet Day',
    sendMonth: 3, sendDayStart: 11, sendDayEnd: 11,
    petAny: true,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy National Pet Day — hope {pet} is getting spoiled today! Have a great one!",
    ],
  },
  // 5. Memorial Day weekend
  {
    id: 'memorial_day',
    name: 'Memorial Day',
    sendMonth: 4, sendDayStart: 24, sendDayEnd: 26,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy Memorial Day weekend! Hope you get to relax and enjoy it. Take care!",
    ],
  },
  // 6. First day of summer
  {
    id: 'summer',
    name: 'First day of summer',
    sendMonth: 5, sendDayStart: 20, sendDayEnd: 22,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy first day of summer! Hope you have some fun plans. Enjoy the season!",
    ],
  },
  // 7. July 4th
  {
    id: 'july_4th',
    name: 'July 4th',
    sendMonth: 6, sendDayStart: 3, sendDayEnd: 4,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy 4th of July! Hope you have an amazing holiday!",
    ],
  },
  // 8. International Cat Day — Aug 8
  {
    id: 'cat_day_intl',
    name: 'International Cat Day',
    sendMonth: 7, sendDayStart: 8, sendDayEnd: 8,
    petOnly: 'cat',
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy International Cat Day — hope {pet} is ruling the house as usual! Have a great day!",
    ],
  },
  // 9. National Dog Day — Aug 26
  {
    id: 'dog_day',
    name: 'National Dog Day',
    sendMonth: 7, sendDayStart: 26, sendDayEnd: 26,
    petOnly: 'dog',
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy National Dog Day — hope {pet} is getting extra belly rubs today! Have a great one!",
    ],
  },
  // 10. Labor Day weekend
  {
    id: 'labor_day',
    name: 'Labor Day',
    sendMonth: 8, sendDayStart: 1, sendDayEnd: 3,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy Labor Day weekend! Hope you enjoy the last bit of summer. Take care!",
    ],
  },
  // 11. First day of fall
  {
    id: 'fall',
    name: 'First day of fall',
    sendMonth: 8, sendDayStart: 22, sendDayEnd: 24,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy first day of fall! Hope you're doing great. Here's to a good season!",
    ],
  },
  // 12. National Cat Day — Oct 29
  {
    id: 'cat_day',
    name: 'National Cat Day',
    sendMonth: 9, sendDayStart: 29, sendDayEnd: 29,
    petOnly: 'cat',
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy National Cat Day — hope {pet} is getting spoiled today! Take care!",
    ],
  },
  // 13. Thanksgiving
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    sendMonth: 10, sendDayStart: 26, sendDayEnd: 28,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy Thanksgiving! Hope you're enjoying the day with people you love. Take care!",
    ],
  },
  // 14. Christmas
  {
    id: 'christmas',
    name: 'Christmas',
    sendMonth: 11, sendDayStart: 24, sendDayEnd: 25,
    messages: [
      "Hi {name}! Selena with The NYC Maid. Merry Christmas! Wishing you a wonderful holiday. Take care!",
    ],
  },
  // 15. New Year's Eve
  {
    id: 'nye',
    name: "New Year's Eve",
    sendMonth: 11, sendDayStart: 31, sendDayEnd: 31,
    messages: [
      "Hey {name}, it's Selena with The NYC Maid! Happy New Year's Eve — wishing you an amazing year ahead!",
    ],
  },
]

/**
 * Get active outreach moments for today.
 */
export function getActiveMoments(): OutreachMoment[] {
  const now = new Date()
  const month = now.getMonth()
  const day = now.getDate()

  return OUTREACH_MOMENTS.filter(m =>
    month === m.sendMonth && day >= m.sendDayStart && day <= m.sendDayEnd
  )
}

/**
 * Pick a message for a client (deterministic by client ID).
 */
export function pickMessage(moment: OutreachMoment, clientId: string, clientName: string, petName?: string): string {
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    hash = ((hash << 5) - hash) + clientId.charCodeAt(i)
    hash = hash & hash
  }
  const index = Math.abs(hash) % moment.messages.length
  const firstName = (clientName || '').split(' ')[0] || 'there'
  return moment.messages[index]
    .replace(/\{name\}/g, firstName)
    .replace(/\{pet\}/g, petName || 'your pet')
}

/**
 * Check if a client qualifies for a moment.
 */
export function qualifiesForMoment(moment: OutreachMoment, petType: string | null, petName: string | null): boolean {
  if (moment.petOnly) {
    return petType === moment.petOnly && !!petName
  }
  if (moment.petAny) {
    return !!petName
  }
  return true
}
