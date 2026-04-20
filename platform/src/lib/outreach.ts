/**
 * Calendar-based outreach moments — warm seasonal check-ins.
 * Tenant-aware port from nycmaid: business name + AI name templated per tenant.
 *
 * Templates: {name} = client first name, {pet} = pet name, {biz} = business name,
 *            {ai} = AI assistant name (defaults to "Selena").
 */

export interface OutreachMoment {
  id: string
  name: string
  sendMonth: number       // 0-indexed
  sendDayStart: number
  sendDayEnd: number
  petOnly?: 'dog' | 'cat'
  petAny?: boolean
  messages: string[]
}

export const OUTREACH_MOMENTS: OutreachMoment[] = [
  { id: 'new_year', name: 'New Year', sendMonth: 0, sendDayStart: 5, sendDayEnd: 10,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy new year — hope the holidays were amazing. Wishing you a great start to the year!"] },
  { id: 'spring', name: 'Spring check-in', sendMonth: 3, sendDayStart: 1, sendDayEnd: 5,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy first day of spring! Hope you're enjoying the warmer weather. Have a great day!"] },
  { id: 'puppy_day', name: 'National Puppy Day', sendMonth: 2, sendDayStart: 23, sendDayEnd: 23, petOnly: 'dog',
    messages: ["Hey {name}, it's {ai} with {biz}! Happy National Puppy Day — hope {pet} is living the good life! Have a great day!"] },
  { id: 'pet_day', name: 'National Pet Day', sendMonth: 3, sendDayStart: 11, sendDayEnd: 11, petAny: true,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy National Pet Day — hope {pet} is getting spoiled today! Have a great one!"] },
  { id: 'memorial_day', name: 'Memorial Day', sendMonth: 4, sendDayStart: 24, sendDayEnd: 26,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy Memorial Day weekend! Hope you get to relax and enjoy it. Take care!"] },
  { id: 'summer', name: 'First day of summer', sendMonth: 5, sendDayStart: 20, sendDayEnd: 22,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy first day of summer! Hope you have some fun plans. Enjoy the season!"] },
  { id: 'july_4th', name: 'July 4th', sendMonth: 6, sendDayStart: 3, sendDayEnd: 4,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy 4th of July! Hope you have an amazing holiday!"] },
  { id: 'cat_day_intl', name: 'International Cat Day', sendMonth: 7, sendDayStart: 8, sendDayEnd: 8, petOnly: 'cat',
    messages: ["Hey {name}, it's {ai} with {biz}! Happy International Cat Day — hope {pet} is ruling the house as usual! Have a great day!"] },
  { id: 'dog_day', name: 'National Dog Day', sendMonth: 7, sendDayStart: 26, sendDayEnd: 26, petOnly: 'dog',
    messages: ["Hey {name}, it's {ai} with {biz}! Happy National Dog Day — hope {pet} is getting extra belly rubs today! Have a great one!"] },
  { id: 'labor_day', name: 'Labor Day', sendMonth: 8, sendDayStart: 1, sendDayEnd: 3,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy Labor Day weekend! Hope you enjoy the last bit of summer. Take care!"] },
  { id: 'fall', name: 'First day of fall', sendMonth: 8, sendDayStart: 22, sendDayEnd: 24,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy first day of fall! Hope you're doing great. Here's to a good season!"] },
  { id: 'cat_day', name: 'National Cat Day', sendMonth: 9, sendDayStart: 29, sendDayEnd: 29, petOnly: 'cat',
    messages: ["Hey {name}, it's {ai} with {biz}! Happy National Cat Day — hope {pet} is getting spoiled today! Take care!"] },
  { id: 'thanksgiving', name: 'Thanksgiving', sendMonth: 10, sendDayStart: 26, sendDayEnd: 28,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy Thanksgiving! Hope you're enjoying the day with people you love. Take care!"] },
  { id: 'christmas', name: 'Christmas', sendMonth: 11, sendDayStart: 24, sendDayEnd: 25,
    messages: ["Hi {name}! {ai} with {biz}. Merry Christmas! Wishing you a wonderful holiday. Take care!"] },
  { id: 'nye', name: "New Year's Eve", sendMonth: 11, sendDayStart: 31, sendDayEnd: 31,
    messages: ["Hey {name}, it's {ai} with {biz}! Happy New Year's Eve — wishing you an amazing year ahead!"] },
]

export function getActiveMoments(today: Date = new Date()): OutreachMoment[] {
  const month = today.getMonth()
  const day = today.getDate()
  return OUTREACH_MOMENTS.filter(m =>
    month === m.sendMonth && day >= m.sendDayStart && day <= m.sendDayEnd
  )
}

export function pickMessage(
  moment: OutreachMoment,
  clientId: string,
  clientName: string | null | undefined,
  petName: string | null | undefined,
  businessName: string,
  aiName: string = 'Selena'
): string {
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
    .replace(/\{biz\}/g, businessName)
    .replace(/\{ai\}/g, aiName)
}

export function qualifiesForMoment(moment: OutreachMoment, petType: string | null | undefined, petName: string | null | undefined): boolean {
  if (moment.petOnly) return petType === moment.petOnly && !!petName
  if (moment.petAny) return !!petName
  return true
}
