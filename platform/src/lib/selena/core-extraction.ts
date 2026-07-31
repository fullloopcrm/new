import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptSecretSafe } from '@/lib/secret-crypto'
import { yinezError, NYCMAID_TENANT_ID, type BookingChecklist, type Intent, type NextStep } from './core-types'
import { updateChecklist } from './core-intent'

const SERVICE_TYPE_MAP: Record<string, BookingChecklist['service_type']> = {
  '1': 'regular', 'regular': 'regular', 'standard': 'regular', 'weekly': 'regular', 'biweekly': 'regular', 'bi-weekly': 'regular', 'monthly': 'regular',
  '2': 'deep', 'deep': 'deep', 'deep clean': 'deep', 'deep cleaning': 'deep', 'limpieza profunda': 'deep',
  '3': 'move_in_out', 'move': 'move_in_out', 'move in': 'move_in_out', 'move out': 'move_in_out', 'move-in': 'move_in_out', 'move-out': 'move_in_out', 'move in/out': 'move_in_out', 'move-in/out': 'move_in_out', 'move-in/move-out': 'move_in_out', 'mudanza': 'move_in_out',
  '4': 'airbnb', 'airbnb': 'airbnb', 'turnover': 'airbnb', 'airbnb turnover': 'airbnb',
  '5': 'emergency', 'emergency': 'emergency', 'same day': 'emergency', 'same-day': 'emergency', 'asap': 'emergency', 'today': 'emergency',
  // Spanish
  'limpieza': 'regular', 'limpieza regular': 'regular', 'normal': 'regular', 'estandar': 'regular', 'estándar': 'regular',
}

const RATE_MAP: Record<string, 59 | 69 | 89> = {
  '1': 59, '59': 59, '$59': 59,
  '2': 69, '69': 69, '$69': 69,
  '3': 89, '89': 89, '$89': 89,
}

const DAY_MAP: Record<string, string> = {
  '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
  'mon': 'Monday', 'tue': 'Tuesday', 'tues': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday',
  'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday', 'weds': 'Wednesday',
  'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday',
  // Spanish
  'lunes': 'Monday', 'martes': 'Tuesday', 'miercoles': 'Wednesday', 'miércoles': 'Wednesday',
  'jueves': 'Thursday', 'viernes': 'Friday', 'sabado': 'Saturday', 'sábado': 'Saturday', 'domingo': 'Sunday',
}

const TIME_MAP: Record<string, string> = {
  '1': '8am', '2': '10am', '3': '12pm', '4': '2pm', '5': '4pm',
  'morning': '10am', 'afternoon': '2pm', 'evening': '4pm',
  'noon': '12pm', 'midday': '12pm', 'midnight': '12am',
  'early': '8am', 'late morning': '11am', 'late afternoon': '4pm',
  'mañana': '10am', 'tarde': '2pm', 'noche': '6pm', 'mediodía': '12pm',
}

function resolveDate(dayName: string, forceNextWeek = false): string | null {
  const now = new Date()
  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName.toLowerCase())
  if (dayIndex === -1) return null
  const currentDay = now.getDay()
  let daysAhead = dayIndex - currentDay
  if (daysAhead <= 0) daysAhead += 7
  if (forceNextWeek && daysAhead < 7) daysAhead += 7
  const target = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  return target.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// Resolve "tomorrow", "today", "next week" → { day, date }
function resolveRelativeDay(text: string): { day: string; date: string } | null {
  const lower = text.toLowerCase().trim()
  const now = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const offsetDays = (n: number) => {
    const target = new Date(now.getTime() + n * 86400000)
    return { day: dayNames[target.getDay()], date: target.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) }
  }
  if (/\b(today|hoy|esta noche)\b/i.test(lower)) return offsetDays(0)
  if (/\b(tomorrow|tmrw|tmr|mañana(?!\s))\b/i.test(lower)) return offsetDays(1)
  if (/\b(day after tomorrow|in 2 days)\b/i.test(lower)) return offsetDays(2)
  if (/\b(this weekend)\b/i.test(lower)) {
    const sat = (6 - now.getDay() + 7) % 7 || 7
    return offsetDays(sat)
  }
  return null
}

// STRICT name validation — prevents "Just paid via Zelle", "Thank you", "ok great", "Fuck Yinez"
const PROFANITY = ['fuck', 'fuk', 'fck', 'shit', 'bitch', 'dick', 'cunt', 'asshole', 'ass', 'cock', 'pussy', 'slut', 'whore', 'bastard', 'fag', 'retard', 'nigger', 'nigga']
// Junk words — if EVERY word of input is junk, it's not a name. "Just paid",
// "sounds good", "ok great" all get rejected by this rule without needing to
// enumerate every 2-word combination.
const JUNK_WORDS = new Set([
  'ok', 'okay', 'sure', 'yes', 'yeah', 'yep', 'yup', 'no', 'nope', 'nah',
  'hi', 'hey', 'hello', 'yo', 'sup', 'hola',
  'thanks', 'thank', 'you', 'thx', 'ty', 'appreciate',
  'good', 'great', 'fine', 'cool', 'awesome', 'perfect', 'nice',
  'paid', 'pay', 'paying', 'just', 'sent', 'sending', 'send', 'zelle', 'venmo', 'cashapp', 'stripe', 'card', 'via', 'through',
  'stop', 'start', 'help', 'please', 'cancel', 'book', 'booking', 'clean', 'cleaning', 'cleaner',
  'morning', 'afternoon', 'evening', 'night', 'today', 'tomorrow', 'yesterday',
  'bye', 'see', 'ya', 'take', 'care', 'talk', 'soon',
  'all', 'got', 'it', 'sounds', 'looks', 'lol', 'idk',
  'my', 'name', 'is', 'im', 'am', 'are', 'the', 'a', 'an', 'and', 'or', 'but',
])
export function isValidName(text: string): boolean {
  const clean = text.replace(/[.!,]+$/g, '').trim()
  // Must be 1-4 words, letters only, no numbers, no @
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'-]+){0,3}$/.test(clean)) return false
  if (clean.includes('@') || /\d/.test(clean)) return false
  const words = clean.split(/\s+/)
  // First word (first name) must be ≥ 2 chars
  if (words[0].length < 2) return false
  const lowerWords = words.map(w => w.toLowerCase())
  // Reject if ANY word is junk — one 'paid', 'via', 'zelle', 'is', 'my' etc. tanks it.
  // Catches 'just paid via Zelle', 'my name is', 'paying with Zelle', 'sending now'.
  if (lowerWords.some(w => JUNK_WORDS.has(w))) return false
  // Reject any name containing profanity
  if (lowerWords.some(w => PROFANITY.includes(w))) return false
  return true
}

export interface ExtractionResult {
  extracted: Partial<BookingChecklist>
  clientCreated: boolean
}

export async function extractAndSave(
  message: string,
  checklist: BookingChecklist,
  conversationId: string,
  nextField: string | null,
): Promise<ExtractionResult> {
  const text = message.trim()
  const lower = text.toLowerCase().replace(/[.,!?]+$/g, '').trim()
  const extracted: Partial<BookingChecklist> = {}
  let clientCreated = false

  // ── Name extraction (STRICT — only when asked, validated) ──
  if (nextField === 'name' && !checklist.name) {
    let nameCandidate: string | null = null
    // Pattern: "My name is John Smith", "I'm John", "this is John Smith", "soy Carmen"
    // Stop at stop-words like "and", "my", "phone", "is", "at" to avoid "John Smith and my phone"
    const namePhrase = text.match(/(?:\bmy name is|\bi am\b|\bi'?m\b|\bthis is|\bname'?s|\bsoy\b|\bme llamo)\s+([A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+(?!and\b|at\b|is\b|my\b|phone\b|number\b|email\b|address\b|from\b|but\b|by\b|with\b|for\b|the\b|to\b)[A-Za-zÀ-ÖØ-öø-ÿ'-]+)?)/i)
    if (namePhrase && isValidName(namePhrase[1])) {
      nameCandidate = namePhrase[1].trim()
    } else if (isValidName(text)) {
      nameCandidate = text.replace(/[.!,]+$/g, '').trim()
    }
    if (nameCandidate) {
      extracted.name = nameCandidate
      await createOrLinkClient(nameCandidate, conversationId)
      clientCreated = true

      // If user also gave phone in same message: "...and my number is 2125550052"
      if (!checklist.phone) {
        const phoneInText = text.match(/(?:number|phone|cell|mobile|reach me at|call me at)\s*(?:is\s*)?[:\s]*\+?1?[\s.-]?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/i)
        if (phoneInText) {
          extracted.phone = phoneInText[1] + phoneInText[2] + phoneInText[3]
        }
      }
    }
  }

  // ── Phone extraction ──
  if (nextField === 'phone' && !checklist.phone) {
    const digits = text.replace(/\D/g, '')
    if (digits.length === 10 || (digits.length === 11 && digits[0] === '1')) {
      extracted.phone = digits.slice(-10)
    } else if (/yes|yeah|yep|yup|this one|this number|correct/i.test(lower)) {
      const { data: convo } = await supabaseAdmin.from('sms_conversations').select('phone').eq('id', conversationId).single()
      if (convo?.phone) extracted.phone = convo.phone.replace(/\D/g, '').slice(-10)
    }
  }

  // ── Service type ──
  if (!checklist.service_type) {
    const match = SERVICE_TYPE_MAP[lower] || SERVICE_TYPE_MAP[lower.replace(/\s+/g, ' ')]
    if (match) extracted.service_type = match
    if (!match) {
      for (const [key, val] of Object.entries(SERVICE_TYPE_MAP)) {
        if (key.length > 2 && lower.includes(key)) { extracted.service_type = val; break }
      }
    }
  }

  // ── Bedrooms & bathrooms ──
  if (checklist.bedrooms === null || checklist.bathrooms === null) {
    // Full pattern: "2 bed 1 bath", "2br/1ba", "2 habitaciones 1 baño", etc.
    const brBaMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br|bd|hab(?:itacion(?:es)?)?|recamara|recámara|cuarto)s?\s*[,/&and]*\s*(\d+)\s*(?:bath(?:room)?s?|ba|bt|baño|bano|baños|banos)/i)
    if (brBaMatch) {
      extracted.bedrooms = parseInt(brBaMatch[1])
      extracted.bathrooms = parseInt(brBaMatch[2])
    }
    // Partial: "2 bed" or "2 bedroom" or "2 habitaciones" without bathrooms
    if (!brBaMatch) {
      const bedOnly = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br|bd|hab(?:itacion(?:es)?)?|recamara|recámara|cuarto)/i)
      if (bedOnly && checklist.bedrooms === null) {
        extracted.bedrooms = parseInt(bedOnly[1])
      }
      const bathOnly = lower.match(/(\d+)\s*(?:bath(?:room)?s?|ba|bt|baño|bano|baños|banos)/i)
      if (bathOnly && checklist.bathrooms === null) {
        extracted.bathrooms = parseInt(bathOnly[1])
      }
    }
    // Just a single digit when bedrooms is the next expected field — it's bedrooms
    if (!brBaMatch && nextField === 'bedrooms' && checklist.bedrooms === null && /^\d$/.test(lower)) {
      extracted.bedrooms = parseInt(lower)
      // Don't assume bathrooms — ask separately
    }
    if (/\bstudio\b/i.test(lower)) {
      extracted.bedrooms = 0
      if (!extracted.bathrooms && checklist.bathrooms === null) extracted.bathrooms = 1
    }
  }

  // ── Rate ──
  if (!checklist.rate) {
    const rateMatch = RATE_MAP[lower] || RATE_MAP[lower.replace('$', '').trim()]
    if (rateMatch) extracted.rate = rateMatch
    if (!rateMatch) {
      const rateNum = lower.match(/\$?(\d{2,3})(?:\s*(?:\/hr|per hour|an hour|one))?/)
      if (rateNum) {
        const val = parseInt(rateNum[1])
        if (val === 49 || val === 59 || val === 65 || val === 69 || val === 75 || val === 79 || val === 89 || val === 99 || val === 100) extracted.rate = val as 49 | 59 | 65 | 69 | 75 | 79 | 89 | 99 | 100
      }
    }
    if (!extracted.rate) {
      if (/you bring|you provide|bring everything|full service/i.test(lower)) extracted.rate = 69
      if (/i have supplies|my supplies|i provide|client supplies/i.test(lower)) extracted.rate = 59
    }
  }

  // ── Day ──
  if (!checklist.day) {
    const hasNext = /\bnext\b/i.test(lower)
    // Relative days first: tomorrow, today, day after tomorrow, this weekend
    const relative = resolveRelativeDay(lower)
    if (relative) {
      extracted.day = relative.day
      extracted.date = relative.date
    }
    const dayMatch = !extracted.day ? DAY_MAP[lower] : undefined
    if (dayMatch) {
      extracted.day = dayMatch
      extracted.date = resolveDate(dayMatch, hasNext) || undefined as unknown as string
    }
    if (!dayMatch && !extracted.day) {
      for (const [key, val] of Object.entries(DAY_MAP)) {
        if (key.length > 2 && lower.includes(key)) {
          extracted.day = val
          extracted.date = resolveDate(val, hasNext) || undefined as unknown as string
          break
        }
      }
    }
  }

  // ── Time ──
  if (!checklist.time) {
    const timeFromMap = TIME_MAP[lower]
    if (timeFromMap) extracted.time = timeFromMap
    if (!timeFromMap) {
      const timeMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m?)$/i)
      if (timeMatch) {
        extracted.time = `${timeMatch[1]}${timeMatch[2] ? ':' + timeMatch[2] : ''}${timeMatch[3].length === 1 ? timeMatch[3] + 'm' : timeMatch[3]}`
      }
    }
    if (!extracted.time && !timeFromMap) {
      const embeddedTime = lower.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i)
      if (embeddedTime) {
        extracted.time = `${embeddedTime[1]}${embeddedTime[2] ? ':' + embeddedTime[2] : ''}${embeddedTime[3].toLowerCase()}`
      }
    }
    // Substring matching for time keywords (e.g. "Thursday at noon", "in the morning")
    if (!extracted.time) {
      for (const [key, val] of Object.entries(TIME_MAP)) {
        if (key.length >= 4 && new RegExp(`\\b${key}\\b`, 'i').test(lower)) {
          extracted.time = val
          break
        }
      }
    }
  }

  // ── Address ──
  if (!checklist.address) {
    // When address is the next expected field, accept the whole message
    if (nextField === 'address' && /\d+\s+[\w\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|pl|place|way|ct|court|pkwy|parkway)\b/i.test(text)) {
      extracted.address = text.trim()
    } else {
      // Opportunistic: when address appears inside another message (e.g. first
      // message "Need cleaning at 500 W 57th St Apt 12D NY 10019"), grab just
      // the address portion.
      const addrMatch = text.match(/\d+\s+(?:[NSEW]\.?\s+)?[\w']+(?:\s+\w+)*\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|pl|place|way|ct|court|pkwy|parkway)\b(?:\s+(?:apt|unit|suite|ste|#)\s*[\w\d-]+)?(?:\s*,?\s*[A-Za-z ]+)?(?:\s*,?\s*\d{5})?/i)
      if (addrMatch) extracted.address = addrMatch[0].trim()
    }
  }

  // ── Email ──
  if (!checklist.email) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (emailMatch) extracted.email = emailMatch[0].toLowerCase()
  }

  // ── Notes ──
  if (nextField === 'notes' && !checklist.notes) {
    if (/^(no|none|nope|nah|nothing|n\/a|na|no notes|no special|none needed|nah im good|no thanks|not really|nope no|all good|im good|we're good|thats it|that's it)$/i.test(lower) || /^no\s+\w+\s+notes?$/i.test(lower)) {
      extracted.notes = 'none'
    } else if (checklist.name && checklist.address && lower.length > 2) {
      const isOtherField = extracted.service_type || extracted.rate || extracted.day || extracted.time || extracted.bedrooms !== undefined
      if (!isOtherField && !/^(yes|yeah|correct|looks good|confirmed|book it)$/i.test(lower)) {
        extracted.notes = text.trim()
      }
    }
  }

  // ── Save extracted fields ──
  if (Object.keys(extracted).length > 0) {
    await updateChecklist(conversationId, extracted)

    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID
    if (convo?.client_id) {
      const clientUpdate: Record<string, unknown> = {}
      if (extracted.phone) clientUpdate.phone = extracted.phone
      if (extracted.address) {
        // Only fill the client's primary address if it's empty; always add/dedupe
        // the address as a property so multi-address history is preserved.
        const { data: cur } = await supabaseAdmin.from('clients').select('address').eq('id', convo.client_id).eq('tenant_id', tid).single()
        if (!cur?.address || !cur.address.trim()) clientUpdate.address = extracted.address
        const { resolveProperty } = await import('@/lib/client-properties')
        await resolveProperty(convo.client_id, extracted.address, null, { changedBy: 'agent', actorId: 'yinez', source: 'api' })
      }
      if (extracted.email) clientUpdate.email = extracted.email
      if (extracted.notes && extracted.notes !== 'none') {
        const { data: c } = await supabaseAdmin.from('clients').select('notes').eq('id', convo.client_id).eq('tenant_id', tid).single()
        clientUpdate.notes = c?.notes ? `${c.notes}\n${extracted.notes}` : extracted.notes
      }
      if (Object.keys(clientUpdate).length > 0) {
        await supabaseAdmin.from('clients').update(clientUpdate).eq('id', convo.client_id).eq('tenant_id', tid)
      }
    }

    const convoUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (extracted.service_type) convoUpdate.service_type = extracted.service_type
    if (extracted.bedrooms !== undefined) convoUpdate.bedrooms = extracted.bedrooms
    if (extracted.bathrooms !== undefined) convoUpdate.bathrooms = extracted.bathrooms
    if (extracted.rate) convoUpdate.hourly_rate = extracted.rate
    if (extracted.date) convoUpdate.preferred_date = extracted.date
    if (extracted.time) convoUpdate.preferred_time = extracted.time
    if (Object.keys(convoUpdate).length > 1) {
      await supabaseAdmin.from('sms_conversations').update(convoUpdate).eq('id', conversationId).eq('tenant_id', tid)
    }
  }

  return { extracted, clientCreated }
}

async function createOrLinkClient(name: string, conversationId: string): Promise<void> {
  try {
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('phone, client_id, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID

    if (convo?.client_id) {
      await supabaseAdmin.from('clients').update({ name }).eq('id', convo.client_id).eq('tenant_id', tid)
      return
    }

    const rawPhone = convo?.phone || `web-${conversationId.slice(0, 8)}`
    const cleanPhone = rawPhone.replace(/\D/g, '')
    // Store digits-only so ILIKE substring lookups by digits actually match.
    const phone = rawPhone.startsWith('web-') ? rawPhone : (cleanPhone || rawPhone)

    if (cleanPhone.length >= 7 && !phone.startsWith('web-')) {
      const { data: existing } = await supabaseAdmin.from('clients')
        .select('id').eq('tenant_id', tid).ilike('phone', `%${cleanPhone.slice(-10)}%`).limit(1)
      if (existing && existing.length > 0) {
        await supabaseAdmin.from('clients').update({ name }).eq('id', existing[0].id).eq('tenant_id', tid)
        await supabaseAdmin.from('sms_conversations')
          .update({ client_id: existing[0].id, name, phone, updated_at: new Date().toISOString() })
          .eq('id', conversationId).eq('tenant_id', tid)
        return
      }
    }

    // sec-07: encrypt at creation — real gap, this path was creating
    // plaintext pins outside the audited write-site sweep.
    const { data: client } = await supabaseAdmin
      .from('clients').insert({ tenant_id: tid, name, phone, status: 'potential', pin: encryptSecretSafe(randomInt(100000, 1000000).toString()) }).select('id').single()

    if (client) {
      const { createPrimaryContact } = await import('@/lib/nycmaid/client-contacts')
      await createPrimaryContact(tid, client.id, { name, phone }).catch(() => {})
      await supabaseAdmin.from('sms_conversations')
        .update({ client_id: client.id, name, phone, updated_at: new Date().toISOString() })
        .eq('id', conversationId).eq('tenant_id', tid)
    }
  } catch (err) {
    await yinezError('createOrLinkClient', err, conversationId)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ════════════════════════════════════════════════════════════════════════════

// Base personality — stays the same every turn, kept SHORT
export const YINEZ_PERSONALITY = `You are Yinez from The NYC Maid. You ARE the business — say "we" and "our."
Short messages (under 300 chars, max 480). One question per message. 😊 only emoji, once max.
BANNED PHRASES — never say these: "certainly" "absolutely" "of course" "great question" "happy to help" "I'd love to help" "I'd be happy"
Say "she" for the cleaner. Plain text, no markdown. Spanish detected = respond in Spanish. Spanglish = respond in whatever they use.
NEVER invent prices or totals. Only quote hourly rates: $69/hr (WE bring supplies) or $59/hr (CLIENT provides their own supplies). $89/hr same-day. NEVER confuse which is which.
All bookings are ONE-TIME. Never ask about recurring frequency. Never mention discounts.
When ALL booking fields are collected, you MUST do the recap and then call create_booking tool after client confirms. The booking is NOT created until you call the tool.`

// Step-specific instructions — changes per turn based on intent + checklist state
export function buildStepPrompt(intent: Intent, cl: BookingChecklist, next: NextStep, isReturning: boolean): string {
  // Non-booking intents get focused instructions
  const intentPrompts: Partial<Record<Intent, string>> = {
    greeting: 'Welcome them warmly. Ask what you can help with. Do NOT ask for their name.',
    casual: 'Respond naturally. "You are welcome 😊" for thanks. Wish them well based on time of day. Do NOT push booking.',
    not_interested: 'Say ONLY: "No worries at all! We\'re here whenever you need us 😊" If they\'re offering cleaning services, say "Thanks for reaching out! We\'re not hiring right now but we\'ll keep you in mind." Do NOT ask any questions. Do NOT mention booking.',
    human_request: '"Let me have someone call you — give us just a few minutes 😊" then use request_callback.',
    payment_confirm: 'Client says they paid. If the message mentions the payer (e.g. "my husband sent it" / "my wife paid" / "my partner sent") OR the message includes a different name, extract that name as sender_name. If NOT mentioned AND you don\'t know it, FIRST reply: "Got it — was that paid from your own account or someone else\'s? If someone else, please reply with their name so we can match it 😊" DO NOT call confirm_payment yet. If they confirm own name OR give sender name, THEN call confirm_payment with method + optional sender_name. Thank them warmly by name. "Got it, thank you! We\'re verifying now 😊"',
    payment_question: 'Use check_payment tool. Payment options: card (Stripe), Zelle (hi@thenycmaid.com), Venmo (@thenycmaid). Collected 30 min before completion, billed in 30-min increments.',
    dispute: 'The BOOKING DATA below has already been pulled. You ARE The NYC Maid — use "we" and "our." Present the facts: "I pulled up your records — she checked in at [check_in time] at [check_in location] and checked out at [check_out time]. That is [raw_minutes] minutes, which we round to [billed_hours] hours at $[rate]/hr = $[total]." Explain rounding: "We bill in 30-minute increments — after 10 minutes past a half hour, we round up to the next 30 minutes. Our check-in and check-out times are recorded automatically by GPS." Be empathetic but firm — the data is the data. If they still disagree, say "I understand your concern. Let me have my manager review this and give you a call."',
    schedule_change: 'Use lookup_bookings to find their booking. First-time bookings CANNOT be cancelled or rescheduled. Recurring = 7 days notice. Use reschedule_booking or cancel_booking.',
    account_help: 'PIN issues → send_pin tool. Missing confirmation email → resend_confirmation tool. Update info → update_account tool. Portal: thenycmaid.com/portal',
    cleaner_request: 'Note the preference with remember tool. If booking, check that cleaner\'s availability with score_cleaners.',
    feedback_positive: 'Thank them genuinely. Invite review at thenycmaid.com/reviews/submit. Use remember to save what they said.',
    feedback_negative: 'Acknowledge. Apologize sincerely. Use report_issue tool. Do NOT be defensive.',
    referral: 'Thank them. Ask for the friend\'s name/number. Use remember to log the referral.',
    question: 'Answer their question directly. Pricing: $69/hr (we supply everything) | $59/hr (client provides supplies) | $89/hr same-day. Recurring discounts (only mention if asked): $69 tier saves 20% weekly / 10% biweekly+monthly; $59 tier saves 10% weekly / 5% biweekly+monthly. Areas: Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island (Nassau and western Suffolk), Westchester County, and Northern New Jersey (Hudson and close-in Bergen). Insurance: yes, fully insured up to $1 million. Cancellation: first-time bookings cannot be cancelled or rescheduled — we hold spots and turn away other clients. Phone: (212) 202-8400. After answering, do NOT push booking — let them decide.',
    rebook: 'Use lookup_bookings to find their last booking. Offer to rebook same setup. Check availability.',
    emergency: 'Same-day cleaning at $89/hr. Check today\'s availability immediately.',
  }

  if (intent !== 'booking' && intentPrompts[intent]) {
    return intentPrompts[intent]!
  }

  // BOOKING FLOW — step-specific micro-prompt
  // Single-number estimates only; clients never see a range.
  const sizeEstimates: Record<string, number> = {
    'regular-0-1': 2.5, 'regular-1-1': 2.5, 'regular-2-1': 3, 'regular-2-2': 3.5, 'regular-3-2': 4,
    'deep-0-1': 4, 'deep-1-1': 4, 'deep-2-1': 4, 'deep-2-2': 5, 'deep-3-2': 5.5,
    'move_in_out-0-1': 4, 'move_in_out-1-1': 4, 'move_in_out-2-1': 4, 'move_in_out-2-2': 5, 'move_in_out-3-2': 6,
  }
  const est = cl.service_type && cl.bedrooms !== null && cl.bathrooms !== null
    ? `${sizeEstimates[`${cl.service_type}-${cl.bedrooms}-${cl.bathrooms}`] ?? 3}hrs`
    : null

  // Build a summary of what we have so far
  const have: string[] = []
  if (cl.service_type) have.push(cl.service_type.replace('_', '/'))
  if (cl.bedrooms !== null) have.push(`${cl.bedrooms}BR/${cl.bathrooms}BA`)
  if (cl.rate) have.push(`$${cl.rate}/hr`)
  if (cl.day) have.push(cl.day)
  if (cl.time) have.push(cl.time)
  if (cl.name) have.push(cl.name)
  const summary = have.length > 0 ? `Client so far: ${have.join(', ')}.` : ''

  switch (next.field) {
    case 'service_type':
      return `${summary} Ask what type of cleaning: regular, deep, move-in/out, airbnb, or emergency. Numbered options on SMS.`
    case 'bedrooms':
      return `${summary} Ask how many bedrooms and bathrooms.`
    case 'rate':
      return `${summary}${est ? ` That typically runs ${est}.` : ''} Present TWO options clearly: 1) $69/hr — WE bring all cleaning supplies and equipment 2) $59/hr — THEY provide their own cleaning supplies and equipment. Also $89/hr for same-day emergency. NEVER mix up which is which. $69 = we supply, $59 = they supply. No discount on the first booking itself, but if they've mentioned wanting recurring/weekly/biweekly/monthly service, proactively mention it unlocks a discount after visit 1: 20% off weekly / 10% off biweekly/monthly at $69/hr, 10% off weekly / 5% off biweekly/monthly at $59/hr.`
    case 'day':
      return `${summary} Ask what day works best.`
    case 'time':
      return `${summary} Ask what time. Default slots: 8am, 12pm, 4pm. We can adjust.`
    case 'name':
      return `${summary} Ask for their first and last name.`
    case 'phone':
      return `${summary} Ask for their phone number so the cleaner can reach them day of service.`
    case 'address':
      return `${summary} Ask for their full address — street, apt/unit, city, zip.`
    case 'email':
      return `${summary} Ask for their email for booking confirmation.`
    case 'notes':
      return `${summary} Ask: "Any special notes for the cleaner? You can also add notes anytime through your portal at thenycmaid.com/portal 😊" If they say no/none, move to recap.`
    case null:
      if (cl.status === 'recap') {
        const dayOfWeek = cl.day ? ['Saturday','Sunday'].includes(cl.day) ? 'weekend' : 'weekday' : 'weekday'
        const buffer = dayOfWeek === 'weekend' ? '60 min arrival buffer due to traffic' : '30 min arrival buffer'
        return `ALL INFO IS ALREADY COLLECTED. Do NOT ask for any more information. Do NOT ask for name, phone, address, or anything else.

HERE IS EVERYTHING — say this EXACTLY:

"To recap: We are scheduling you for ${cl.day} ${cl.date || ''} @ ${cl.time} (${buffer}) at the rate of $${cl.rate}/hr for an estimated ${est || '2-4'} hours to be paid via Zelle, credit card, CashApp, or Venmo 30 minutes before completion. You will receive a text with total time, balance and payment links. Payment needs to be made before the cleaner is complete please. We have a no cancellation policy for first-time services so I want to make sure all is correct 😊 Upon confirmation you will receive an email confirmation with all related info."

Client: ${cl.name} | Phone: ${cl.phone} | Address: ${cl.address} | Email: ${cl.email} | Service: ${cl.service_type} | Size: ${cl.bedrooms}BR/${cl.bathrooms}BA | Notes: ${cl.notes}

If client already said yes/correct/confirmed/yep/looks good → IMMEDIATELY call create_booking with date="${cl.date}", time="${cl.time}", service_type="${cl.service_type}", hourly_rate=${cl.rate}. The booking does NOT exist until you call the tool.`
      }
      if (cl.status === 'confirmed') {
        return `Booking created! Say: "Thank you so much ${cl.name}! We really appreciate you and look forward to working with you 😊 Your booking is pending and will be confirmed by our team shortly. Your portal PIN is [PIN from client profile if available] — log in at thenycmaid.com/portal to view your booking and add notes. If you need anything, text or call us at (212) 202-8400." Do NOT mention reviews.`
      }
      return summary
    default:
      return summary
  }
}

