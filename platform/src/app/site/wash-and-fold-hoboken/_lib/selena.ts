import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/app/site/wash-and-fold-hoboken/_lib/supabase'
import { checkAvailability, getSmartSuggestions, checkCleanerAvailability } from '@/app/site/wash-and-fold-hoboken/_lib/availability'
import { notify } from '@/app/site/wash-and-fold-hoboken/_lib/notify'

// ─── Error Monitoring ───────────────────────────────────────────────────────

async function selenaError(context: string, err: unknown, conversationId?: string) {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : ''
  console.error(`[Selena] ${context}:`, err)
  await notify({
    type: 'selena_error',
    title: `Selena Error — ${context}`,
    message: `${message}${conversationId ? `\nConversation: ${conversationId}` : ''}${stack ? `\n${stack}` : ''}`,
  }).catch(() => {})
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BookingChecklist {
  service_type: 'regular' | 'deep' | 'move_in_out' | 'airbnb' | 'emergency' | null
  bedrooms: number | null
  bathrooms: number | null
  rate: 49 | 59 | 75 | 100 | null
  day: string | null
  date: string | null
  time: string | null
  name: string | null
  phone: string | null
  address: string | null
  email: string | null
  notes: string | null
  rating: number | null
  status: 'greeting' | 'collecting' | 'recap' | 'confirmed' | 'rating' | 'closed'
}

export interface SelenaResult {
  text: string
  clientCreated?: boolean
  bookingCreated?: boolean
  checklist: BookingChecklist
}

export type NextStep = { field: string | null; instruction: string }

export const EMPTY_CHECKLIST: BookingChecklist = {
  service_type: null, bedrooms: null, bathrooms: null, rate: null,
  day: null, date: null, time: null, name: null, phone: null,
  address: null, email: null, notes: null, rating: null, status: 'greeting',
}

// ─── Anthropic Client ───────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// ─── State Machine ──────────────────────────────────────────────────────────

export function getNextStep(cl: BookingChecklist): NextStep {
  if (cl.status === 'recap') return { field: null, instruction: 'Do the recap using ALL collected info. If the client already confirmed (said yes/correct/looks good), call create_booking immediately — do NOT recap again. Weekday (Mon-Fri): 30 min arrival buffer. Weekend (Sat-Sun): 60 min for traffic.' }
  if (cl.status === 'confirmed') return { field: null, instruction: 'Booking confirmed. Thank them warmly, tell them booking is pending and they will be notified. Say goodbye.' }
  if (cl.status === 'closed') return { field: null, instruction: 'Conversation is complete.' }

  if (!cl.name) return { field: 'name', instruction: 'Ask for their first and last name.' }
  if (!cl.phone) return { field: 'phone', instruction: 'Ask for their best phone number.' }
  if (!cl.service_type) return { field: 'service_type', instruction: 'Ask what type of cleaning — regular, deep, move-in/out, airbnb, or emergency. Use numbered options on SMS.' }
  if (cl.bedrooms === null || cl.bathrooms === null) return { field: 'bedrooms', instruction: 'Ask how many bedrooms and bathrooms.' }
  if (!cl.rate) return { field: 'rate', instruction: 'Give time estimate RANGE for their size (e.g. "typically runs 2-4 hours"), then pricing: $59/hr (client supplies), $75/hr (we bring everything), $100/hr (same-day). Use numbered options on SMS.' }
  if (!cl.day) return { field: 'day', instruction: 'Ask what day works best. Use numbered options on SMS.' }
  if (!cl.time) return { field: 'time', instruction: 'Ask what time — morning or afternoon, or suggest available times. Use numbered options on SMS.' }
  if (!cl.address) return { field: 'address', instruction: 'Ask for full address — street, apt/unit, city, zip.' }
  if (!cl.email) return { field: 'email', instruction: 'Ask for their email address.' }

  return { field: 'notes', instruction: 'All required info collected. Ask: "Any notes you\'d like included?" If they say no/none, move to recap.' }
}

// ─── Checklist Prompt Builder ───────────────────────────────────────────────

export function buildChecklistPrompt(cl: BookingChecklist, next: NextStep): string {
  const fields = [
    `name: ${cl.name || '-- MISSING'}`,
    `phone: ${cl.phone || '-- MISSING'}`,
    `service_type: ${cl.service_type || '-- MISSING'}`,
    `bedrooms: ${cl.bedrooms !== null ? cl.bedrooms : '-- MISSING'}`,
    `bathrooms: ${cl.bathrooms !== null ? cl.bathrooms : '-- MISSING'}`,
    `rate: ${cl.rate ? '$' + cl.rate + '/hr' : '-- MISSING'}`,
    `day: ${cl.day || '-- MISSING'}`,
    `time: ${cl.time || '-- MISSING'}`,
    `address: ${cl.address || '-- MISSING'}`,
    `email: ${cl.email || '-- MISSING'}`,
    `notes: ${cl.notes || '(none yet)'}`,
  ]
  const missing = fields.filter(f => f.includes('MISSING')).length
  const header = missing === 0
    ? 'BOOKING CHECKLIST — ALL COLLECTED. Ask about notes if not done, then do the recap.'
    : `BOOKING CHECKLIST — ${missing} items still needed`

  return `\n\n${header}\nstatus: ${cl.status}\n${fields.join('\n')}\n\nNEXT: ${next.instruction}`
}

// ─── Quick Replies (state-driven) ───────────────────────────────────────────

export function getQuickReplies(cl: BookingChecklist, next: NextStep): string[] {
  if (cl.status === 'greeting') return ['I need a cleaning', 'Get a quote', 'Book a cleaning']
  if (cl.status === 'recap') return ['Yes, all correct!', 'I need to change something']
  if (cl.status === 'confirmed' || cl.status === 'closed') return []

  switch (next.field) {
    case 'service_type': return ['Regular cleaning', 'Deep cleaning', 'Move-in/move-out', 'Airbnb turnover']
    case 'bedrooms': return ['1 bed 1 bath', '2 bed 1 bath', '2 bed 2 bath', '3 bed 2 bath']
    case 'rate': return ['$75 — you bring everything', '$59 — I have supplies']
    case 'day': return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    case 'time': return ['8am', '10am', '12pm', '2pm', '4pm']
    case 'name': case 'phone': case 'address': case 'email': case 'notes': return []
    default: return []
  }
}

// ─── Checklist DB Operations ────────────────────────────────────────────────

export async function loadChecklist(conversationId: string): Promise<BookingChecklist> {
  const { data } = await supabaseAdmin
    .from('sms_conversations')
    .select('booking_checklist')
    .eq('id', conversationId)
    .single()
  return { ...EMPTY_CHECKLIST, ...(data?.booking_checklist || {}) }
}

export async function updateChecklist(conversationId: string, updates: Partial<BookingChecklist>): Promise<BookingChecklist> {
  const current = await loadChecklist(conversationId)
  const updated = { ...current, ...updates }

  // Auto-transition: all required fields filled → recap
  if (updated.status === 'collecting') {
    const step = getNextStep(updated)
    if (step.field === null || step.field === 'notes') {
      updated.status = 'recap'
    }
  }

  await supabaseAdmin
    .from('sms_conversations')
    .update({ booking_checklist: updated, updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return updated
}

// ════════════════════════════════════════════════════════════════════════════
// LAYER 1: DETERMINISTIC FIELD EXTRACTION
// Runs BEFORE Claude. Parses the message, saves fields, no AI involved.
// ════════════════════════════════════════════════════════════════════════════

const SERVICE_TYPE_MAP: Record<string, BookingChecklist['service_type']> = {
  '1': 'regular', 'regular': 'regular', 'standard': 'regular', 'weekly': 'regular', 'biweekly': 'regular', 'bi-weekly': 'regular', 'monthly': 'regular',
  '2': 'deep', 'deep': 'deep', 'deep clean': 'deep', 'deep cleaning': 'deep',
  '3': 'move_in_out', 'move': 'move_in_out', 'move in': 'move_in_out', 'move out': 'move_in_out', 'move-in': 'move_in_out', 'move-out': 'move_in_out', 'move in/out': 'move_in_out', 'move-in/out': 'move_in_out', 'move-in/move-out': 'move_in_out',
  '4': 'airbnb', 'airbnb': 'airbnb', 'turnover': 'airbnb', 'airbnb turnover': 'airbnb',
  '5': 'emergency', 'emergency': 'emergency', 'same day': 'emergency', 'same-day': 'emergency', 'asap': 'emergency', 'today': 'emergency',
}

const RATE_MAP: Record<string, 49 | 59 | 75 | 100> = {
  '1': 59, '49': 49, '$49': 49,
  '59': 59, '$59': 59,
  '2': 75, '75': 75, '$75': 75,
  '3': 100, '100': 100, '$100': 100,
}

const DAY_MAP: Record<string, string> = {
  '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
  'mon': 'Monday', 'tue': 'Tuesday', 'tues': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday',
  'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday',
  'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday',
}

const TIME_MAP: Record<string, string> = {
  '1': '8am', '2': '10am', '3': '12pm', '4': '2pm', '5': '4pm',
  'morning': '10am', 'afternoon': '2pm', 'evening': '4pm',
}

function resolveDate(dayName: string, forceNextWeek = false): string | null {
  const now = new Date()
  const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    .indexOf(dayName.toLowerCase())
  if (dayIndex === -1) return null
  const currentDay = now.getDay()
  let daysAhead = dayIndex - currentDay
  if (daysAhead <= 0) daysAhead += 7
  if (forceNextWeek && daysAhead < 7) daysAhead += 7
  const target = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  return target.toLocaleDateString('en-CA') // YYYY-MM-DD
}

interface ExtractionResult {
  extracted: Partial<BookingChecklist>
  clientCreated: boolean
}

/**
 * LAYER 1: Deterministic extraction.
 * Parses the client's message for any recognizable booking fields.
 * Saves them directly to the checklist — no AI involved.
 * Returns what was extracted so Claude knows what just happened.
 */
async function extractAndSave(
  message: string,
  checklist: BookingChecklist,
  conversationId: string,
  nextField: string | null,
): Promise<ExtractionResult> {
  const text = message.trim()
  const lower = text.toLowerCase().replace(/[.,!?]+$/g, '').trim()
  const extracted: Partial<BookingChecklist> = {}
  let clientCreated = false

  // ── Name extraction ──
  // Only extract if name is the next expected field and message looks like a name
  if (nextField === 'name' && !checklist.name) {
    // Names: 2-4 words, each starting with a letter, no numbers, no @
    const nameClean = text.replace(/[.!,]+$/g, '').trim()
    if (/^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'-]+){0,3}$/.test(nameClean) && !nameClean.includes('@') && !/\d/.test(nameClean)) {
      extracted.name = nameClean
      // Create or link client
      await createOrLinkClient(nameClean, conversationId)
      clientCreated = true
    }
  }

  // ── Phone extraction ──
  if (nextField === 'phone' && !checklist.phone) {
    const digits = text.replace(/\D/g, '')
    if (digits.length === 10 || (digits.length === 11 && digits[0] === '1')) {
      extracted.phone = digits.slice(-10)
    } else if (/yes|yeah|yep|yup|this one|this number|correct/i.test(lower)) {
      // They confirmed the pre-filled phone — mark as confirmed
      const { data: convo } = await supabaseAdmin.from('sms_conversations').select('phone').eq('id', conversationId).single()
      if (convo?.phone) extracted.phone = convo.phone.replace(/\D/g, '').slice(-10)
    }
  }

  // ── Service type extraction ──
  if (!checklist.service_type) {
    const match = SERVICE_TYPE_MAP[lower] || SERVICE_TYPE_MAP[lower.replace(/\s+/g, ' ')]
    if (match) extracted.service_type = match
    // Also check for service type embedded in longer messages
    if (!match) {
      for (const [key, val] of Object.entries(SERVICE_TYPE_MAP)) {
        if (key.length > 2 && lower.includes(key)) { extracted.service_type = val; break }
      }
    }
  }

  // ── Bedrooms & bathrooms extraction ──
  if (checklist.bedrooms === null || checklist.bathrooms === null) {
    // "2 bed 1 bath", "2br 1ba", "2 bedroom 1 bathroom", "2/1", "2 bed, 1 bath"
    const brBaMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br|bd)\s*[,/&and]*\s*(\d+)\s*(?:bath(?:room)?s?|ba|bt)/i)
    if (brBaMatch) {
      extracted.bedrooms = parseInt(brBaMatch[1])
      extracted.bathrooms = parseInt(brBaMatch[2])
    }
    // "studio" or "0 bed"
    if (/\bstudio\b/i.test(lower)) {
      extracted.bedrooms = 0
      if (!extracted.bathrooms) extracted.bathrooms = 1
    }
  }

  // ── Rate extraction ──
  if (!checklist.rate) {
    // Direct match: "1", "2", "$75", "75"
    const rateMatch = RATE_MAP[lower] || RATE_MAP[lower.replace('$', '').trim()]
    if (rateMatch) extracted.rate = rateMatch
    // Embedded: "the $75 one", "I'll do 75"
    if (!rateMatch) {
      const rateNum = lower.match(/\$?(\d{2,3})(?:\s*(?:\/hr|per hour|an hour|one))?/)
      if (rateNum) {
        const val = parseInt(rateNum[1])
        if (val === 49 || val === 59 || val === 75 || val === 100) extracted.rate = val as 49 | 59 | 75 | 100
      }
    }
    // "you bring everything" / "I have supplies"
    if (!extracted.rate) {
      if (/you bring|you provide|bring everything|full service/i.test(lower)) extracted.rate = 75
      if (/i have supplies|my supplies|i provide|client supplies/i.test(lower)) extracted.rate = 59
    }
  }

  // ── Day extraction ──
  if (!checklist.day) {
    const hasNext = /\bnext\b/i.test(lower)

    // Numbered option or day name
    const dayMatch = DAY_MAP[lower]
    if (dayMatch) {
      extracted.day = dayMatch
      extracted.date = resolveDate(dayMatch, hasNext) || undefined as unknown as string
    }
    // Check for embedded day: "how about wednesday" or "next friday"
    if (!dayMatch) {
      for (const [key, val] of Object.entries(DAY_MAP)) {
        if (key.length > 2 && lower.includes(key)) {
          extracted.day = val
          extracted.date = resolveDate(val, hasNext) || undefined as unknown as string
          break
        }
      }
    }
  }

  // ── Time extraction ──
  if (!checklist.time) {
    // Numbered option
    const timeFromMap = TIME_MAP[lower]
    if (timeFromMap) extracted.time = timeFromMap
    // Direct time: "10am", "2pm", "10:00 am", "2:30pm"
    if (!timeFromMap) {
      const timeMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m?)$/i)
      if (timeMatch) {
        const hr = timeMatch[1]
        const min = timeMatch[2] || ''
        const ampm = timeMatch[3].toLowerCase()
        extracted.time = `${hr}${min ? ':' + min : ''}${ampm.length === 1 ? ampm + 'm' : ampm}`
      }
    }
    // Embedded: "how about 10am" "let's do 2pm"
    if (!extracted.time && !timeFromMap) {
      const embeddedTime = lower.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i)
      if (embeddedTime) {
        const hr = embeddedTime[1]
        const min = embeddedTime[2] || ''
        const ampm = embeddedTime[3].toLowerCase()
        extracted.time = `${hr}${min ? ':' + min : ''}${ampm}`
      }
    }
    if (!extracted.time) {
      if (lower === 'morning') extracted.time = '10am'
      if (lower === 'afternoon') extracted.time = '2pm'
    }
  }

  // ── Address extraction ──
  if (nextField === 'address' && !checklist.address) {
    // Addresses typically have a number followed by a street name
    // Only extract when we're explicitly asking for address to avoid false positives
    if (/\d+\s+\w+\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|pl|place|way|ct|court|pkwy|parkway)/i.test(text)) {
      extracted.address = text.trim()
    }
  }

  // ── Email extraction ──
  if (!checklist.email) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (emailMatch) extracted.email = emailMatch[0].toLowerCase()
  }

  // ── Notes extraction ──
  if (nextField === 'notes' && !checklist.notes) {
    if (/^(no|none|nope|nah|nothing|n\/a|na)$/i.test(lower)) {
      extracted.notes = 'none'
    } else if (checklist.name && checklist.address && checklist.email && lower.length > 2) {
      // If all required fields are filled and this isn't a simple answer, treat as notes
      // But only if it doesn't match other field patterns
      const isOtherField = extracted.service_type || extracted.rate || extracted.day || extracted.time || extracted.bedrooms !== undefined
      if (!isOtherField && !/^(yes|yeah|correct|looks good|confirmed|book it)$/i.test(lower)) {
        extracted.notes = text.trim()
      }
    }
  }

  // ── Save extracted fields ──
  if (Object.keys(extracted).length > 0) {
    await updateChecklist(conversationId, extracted)

    // Mirror to client record
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id').eq('id', conversationId).single()
    if (convo?.client_id) {
      const clientUpdate: Record<string, unknown> = {}
      if (extracted.phone) clientUpdate.phone = extracted.phone
      if (extracted.address) clientUpdate.address = extracted.address
      if (extracted.email) clientUpdate.email = extracted.email
      if (extracted.notes && extracted.notes !== 'none') {
        const { data: c } = await supabaseAdmin.from('clients').select('notes').eq('id', convo.client_id).single()
        clientUpdate.notes = c?.notes ? `${c.notes}\n${extracted.notes}` : extracted.notes
      }
      if (Object.keys(clientUpdate).length > 0) {
        await supabaseAdmin.from('clients').update(clientUpdate).eq('id', convo.client_id)
      }
    }

    // Mirror to conversation columns for admin dashboard
    const convoUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (extracted.service_type) convoUpdate.service_type = extracted.service_type
    if (extracted.bedrooms !== undefined) convoUpdate.bedrooms = extracted.bedrooms
    if (extracted.bathrooms !== undefined) convoUpdate.bathrooms = extracted.bathrooms
    if (extracted.rate) convoUpdate.hourly_rate = extracted.rate
    if (extracted.date) convoUpdate.preferred_date = extracted.date
    if (extracted.time) convoUpdate.preferred_time = extracted.time
    if (Object.keys(convoUpdate).length > 1) {
      await supabaseAdmin.from('sms_conversations').update(convoUpdate).eq('id', conversationId)
    }
  }

  return { extracted, clientCreated }
}

// ── Client creation helper (used by extraction layer) ──

async function createOrLinkClient(name: string, conversationId: string): Promise<void> {
  try {
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('phone, client_id').eq('id', conversationId).single()

    if (convo?.client_id) {
      await supabaseAdmin.from('clients').update({ name }).eq('id', convo.client_id)
      return
    }

    const phone = convo?.phone || `web-${conversationId.slice(0, 8)}`
    const cleanPhone = phone.replace(/\D/g, '')

    // Exact national-number match only (no ilike substring) — a short/
    // garbage phone must never resolve to an arbitrary client, since a
    // match here gets its name overwritten and gets linked to this
    // conversation (write-corruption vector).
    const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
    if (cleanPhone.length >= 10 && !phone.startsWith('web-')) {
      const target = nat(cleanPhone)
      const { data: candidates } = await supabaseAdmin.from('clients')
        .select('id, phone')
      const existing = (candidates || []).filter(c => {
        const cDigits = nat((c.phone || '').replace(/\D/g, ''))
        return cDigits.length >= 10 && cDigits === target
      })
      if (existing && existing.length > 0) {
        await supabaseAdmin.from('clients').update({ name }).eq('id', existing[0].id)
        await supabaseAdmin.from('sms_conversations')
          .update({ client_id: existing[0].id, name, phone, updated_at: new Date().toISOString() })
          .eq('id', conversationId)
        return
      }
    }

    const { data: client } = await supabaseAdmin
      .from('clients').insert({ name, phone, status: 'potential', pin: Math.floor(100000 + Math.random() * 900000).toString() }).select('id').single()

    if (client) {
      await supabaseAdmin.from('sms_conversations')
        .update({ client_id: client.id, name, phone, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    }
  } catch (err) {
    await selenaError('createOrLinkClient', err, conversationId)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — Claude only talks, never saves data
// ════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are Selena, the booking concierge for The NYC Maid.

YOUR ROLE: You are the voice. The system already extracted and saved any booking info from the client's message. The BOOKING CHECKLIST below is always up-to-date. Your ONLY jobs are:
1. Acknowledge what was just captured (if anything new)
2. Ask for the next missing field
3. Handle questions about our service
4. Do the recap when all fields are filled
5. Call create_booking when client confirms the recap

CRITICAL: The checklist is the source of truth. If a field has a value, it IS saved. NEVER re-ask for info that's already in the checklist. If the system just extracted 3 fields from one message, acknowledge all of them and move to the next missing field.

PERSONALITY: Warm, welcoming, grateful, real. Make the client feel appreciated. Not a bot.

STYLE:
- SHORT. Under 300 chars. Max 480. Recap is the exception.
- ONE question per message.
- Match their energy.
- 😊 only emoji. Once per message max.
- NEVER say: "certainly" "absolutely" "of course" "great question" "happy to help"
- Say "You are welcome" not "no problem". Say "she" for the cleaner.
- On SMS: give numbered options for multiple choice fields.
- Plain text only. No markdown.
- If Spanish detected, respond entirely in Spanish.

PRICING:
$59/hr — client provides supplies and equipment
$75/hr — we provide everything needed
$100/hr — same-day/emergency
RECURRING DISCOUNT: Weekly/bi-weekly/monthly get 10% off $75/hr = $67.50/hr.
Estimates (ALWAYS give a RANGE, never a single number):
1BR/1BA: 2-3 hours | 2BR/1BA: 2-4 hours | 2BR/2BA: 3-4 hours | 3BR/2BA: 3-5 hours
Deep/first-time: add 1-2 hours to the range.
Say "typically runs" or "averages" — NEVER say "about X hours" with a single number. Always a range like "typically runs 2-4 hours".

COMMON QUESTIONS:
"Can I leave?" → "Yes totally fine as long as payment is made before completion."
"Same cleaner?" → "We do our best to keep the same cleaner each time"
"Insured?" → "Yes, fully insured"
"Supplies?" → "At $75/hr we bring everything. At $59/hr you provide."
"Deep clean?" → "Full top to bottom — kitchen, bathrooms, all surfaces, floors."
"Move out?" → "Yes, typically 4-6 hours depending on size."

SERVICE AREA:
Manhattan, Brooklyn, Queens — yes
Long Island — west half (Nassau County, western Suffolk)
New Jersey — along Hudson, under 30 min from NYC
Bronx, Staten Island — case by case
Outside: "We don't currently cover that area but we're expanding — text us at (212) 202-8400 😊"

CANCELLATION POLICY:
First-time/one-time: NO cancellations, NO rescheduling.
Recurring: 7 days notice to reschedule. Cancellations only if discontinuing entirely.
Why: We don't take payment upfront. We hold spots and turn away other clients.

RECAP FORMAT:
"Ok let's recap: [Name], [address] — [day] @ [time] ([weekday: 30 min / weekend: 60 min] arrival buffer) for about [X] hours at $[RATE]/hr paid via Zelle or Apple 15 minutes before completion. [cancellation policy]. I want to make sure all is correct 😊"

AFTER CLIENT CONFIRMS RECAP:
IMMEDIATELY call create_booking. Do NOT recap again. Do NOT ask for anything else.

POST-CONFIRMATION:
"Thank you so much [Name]! We really appreciate you and look forward to working with you. Thanks for the opportunity 😊 Your booking is pending and will be confirmed by our team shortly — you'll be notified once it's all set!"

WAITLIST: If check_availability returns no openings, tell client you'll add them to the waiting list. Call add_to_waitlist.

ESCALATION: Say "Let me have my manager look at this — one sec 😊" then [ESCALATE: reason] when client is upset, damage reported, unusual request, or outside normal flow.

RETURNING CLIENTS: If CLIENT PROFILE is below, greet by name. Don't re-ask for info you have. Reference their preferred cleaner.

IMPORTANT: When a client answers a question about your service, answer it AND continue the booking flow. Check the checklist and move to the next missing field.`

// ─── Tool Definitions (reduced — no more save_info or create_client) ────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: 'Check if a date/time is available. Call when you need to verify availability before recap.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'e.g. "10:00 AM"' },
        cleaner_name: { type: 'string', description: 'Check specific cleaner' },
      },
      required: ['date'],
    },
  },
  {
    name: 'create_booking',
    description: 'Create a PENDING booking. ONLY call after client confirms the recap.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string' }, time: { type: 'string' },
        service_type: { type: 'string' }, hourly_rate: { type: 'number' },
        estimated_hours: { type: 'number' }, recurring_type: { type: 'string' },
      },
      required: ['date', 'time', 'service_type', 'hourly_rate'],
    },
  },
  {
    name: 'add_to_waitlist',
    description: 'Add client to waiting list when no availability found.',
    input_schema: {
      type: 'object' as const,
      properties: {
        preferred_date: { type: 'string', description: 'YYYY-MM-DD' },
        preferred_time: { type: 'string', description: 'e.g. "10am"' },
      },
      required: ['preferred_date'],
    },
  },
]

// ─── Phone Helpers ──────────────────────────────────────────────────────────

function parseTime(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/i)
  if (!match) return null
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2] || '0')
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hours < 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  return { hours, minutes }
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

async function handleCheckAvailability(input: Record<string, unknown>): Promise<string> {
  try {
    const date = input.date as string
    const requestedTime = input.time as string | undefined
    const cleanerName = input.cleaner_name as string | undefined
    const availability = await checkAvailability(date)

    if (availability.sameDay) {
      return JSON.stringify({ sameDay: true, message: 'Same-day booking. Rate is $100/hr emergency.' })
    }

    if (cleanerName && requestedTime) {
      const parsed = parseTime(requestedTime)
      if (parsed) {
        const timeStr = `${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}`
        const cleanerSlots = await checkCleanerAvailability(date, timeStr)
        const matched = cleanerSlots.find(c => c.name.toLowerCase().includes(cleanerName.toLowerCase()))
        if (matched) {
          if (matched.available) {
            return JSON.stringify({ available: true, cleaner: matched.name, message: `${matched.name} is available at ${requestedTime} on ${date}.` })
          }
          const alts = await getSmartSuggestions(date)
          return JSON.stringify({ available: false, cleaner: matched.name, conflict: matched.conflict, alternative: alts[0], message: `${matched.name} isn't available at ${requestedTime}. Suggest ${alts[0] || 'a different day'}.` })
        }
        return JSON.stringify({ available: false, message: `No cleaner named "${cleanerName}" found.` })
      }
    }

    const open = availability.slots.filter(s => s.available).map(s => s.time)
    const smartTimes = await getSmartSuggestions(date)

    if (open.length === 0) {
      return JSON.stringify({ available: false, waitlist: true, message: `Nothing open on ${date}. Offer to add them to the waiting list.` })
    }

    if (requestedTime) {
      const normalized = requestedTime.replace(/\s+/g, ' ').trim().toUpperCase()
      const isAvailable = open.some(t => t.toUpperCase().replace(/\s+/g, ' ') === normalized)
      if (isAvailable) return JSON.stringify({ available: true, message: `${requestedTime} on ${date} is available.` })
      return JSON.stringify({ available: false, alternative: smartTimes[0] || open[0], message: `${requestedTime} isn't available. Suggest ${smartTimes[0] || open[0]} instead.` })
    }

    return JSON.stringify({ available: true, suggested_times: smartTimes.slice(0, 3), message: `${date} has openings. Best times: ${smartTimes.slice(0, 3).join(', ')}.` })
  } catch (err) {
    await selenaError('check_availability', err)
    return JSON.stringify({ available: true, message: 'Unable to check availability right now. Proceed and we will confirm.' })
  }
}

async function handleCreateBooking(input: Record<string, unknown>, conversationId: string, result: SelenaResult): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations')
      .select('client_id, bedrooms, bathrooms').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No client linked — collect their name first' })

    const date = input.date as string
    const time = input.time as string
    const serviceType = input.service_type as string
    const hourlyRate = input.hourly_rate as number
    const estimatedHours = (input.estimated_hours as number) || 2
    const recurringType = (input.recurring_type as string) || 'one_time'

    const parsed = parseTime(time)
    if (!parsed) return JSON.stringify({ error: 'Invalid time format' })

    const startTimeStr = `${date}T${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    const endHours = parsed.hours + estimatedHours
    const endTimeStr = `${date}T${endHours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`

    // Prevent duplicates
    const { data: existing } = await supabaseAdmin.from('bookings').select('id')
      .eq('client_id', convo.client_id).eq('start_time', startTimeStr)
      .in('status', ['pending', 'scheduled', 'in_progress']).limit(1)
    if (existing && existing.length > 0) {
      return JSON.stringify({ success: true, bookingId: existing[0].id, message: 'Booking already exists' })
    }

    const bedrooms = convo.bedrooms || 0
    const bathrooms = convo.bathrooms || 0
    const { data: booking, error } = await supabaseAdmin.from('bookings').insert({
      client_id: convo.client_id,
      start_time: startTimeStr, end_time: endTimeStr,
      status: 'pending', service_type: serviceType,
      hourly_rate: hourlyRate, price: hourlyRate * estimatedHours * 100,
      recurring_type: recurringType,
      notes: `SMS booking | ${bedrooms}BR/${bathrooms}BA`,
    }).select('id').single()

    if (error) throw error

    await supabaseAdmin.from('sms_conversations').update({
      booking_id: booking.id, completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), outcome: 'booked',
      summary: `Booked ${serviceType} ${date} ${time} $${hourlyRate}/hr`,
    }).eq('id', conversationId)

    await updateChecklist(conversationId, { status: 'confirmed' })
    result.bookingCreated = true
    return JSON.stringify({ success: true, bookingId: booking.id })
  } catch (err) {
    await selenaError('create_booking', err, conversationId)
    return JSON.stringify({ success: true, message: 'Booking noted — admin will confirm' })
  }
}

async function handleAddToWaitlist(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const preferredDate = input.preferred_date as string
    const preferredTime = (input.preferred_time as string) || null

    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id, phone, name, booking_checklist').eq('id', conversationId).single()

    const checklist = convo?.booking_checklist || {}

    await supabaseAdmin.from('sms_conversations').update({
      outcome: 'waitlisted',
      updated_at: new Date().toISOString(),
      summary: `Waitlisted for ${preferredDate}${preferredTime ? ' ' + preferredTime : ''}`,
      booking_checklist: {
        ...checklist,
        waitlist_preferred_date: preferredDate,
        waitlist_preferred_time: preferredTime,
      },
    }).eq('id', conversationId)

    await notify({
      type: 'waitlist',
      title: 'New Waitlist Entry',
      message: `${convo?.name || convo?.phone || 'Client'} added to waitlist for ${preferredDate}${preferredTime ? ' at ' + preferredTime : ''}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Client added to waiting list.' })
  } catch (err) {
    await selenaError('add_to_waitlist', err, conversationId)
    return JSON.stringify({ success: true, message: 'Waitlist noted.' })
  }
}

// ─── Client Profile ─────────────────────────────────────────────────────────

export async function getClientProfile(phone: string): Promise<string> {
  try {
    // Exact national-number match only (no ilike substring). A short/
    // garbage phone must never resolve to an arbitrary client — that would
    // leak an unrelated client's name/address/email/notes/booking history
    // into the AI's system-prompt context.
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) return JSON.stringify({ error: 'Client not found' })
    const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
    const target = nat(digits)
    const { data: candidates } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, address, notes, active, do_not_service, created_at')
    const client = (candidates || []).find(c => {
      const cDigits = nat((c.phone || '').replace(/\D/g, ''))
      return cDigits.length >= 10 && cDigits === target
    })
    if (!client) return JSON.stringify({ error: 'Client not found' })

    const { data: recentBookings } = await supabaseAdmin.from('bookings')
      .select('id, start_time, service_type, price, hourly_rate, status, cleaners(name)')
      .eq('client_id', client.id).in('status', ['completed', 'scheduled', 'in_progress', 'pending'])
      .order('start_time', { ascending: false }).limit(5)

    const { count: totalBookings } = await supabaseAdmin.from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id).in('status', ['completed', 'scheduled', 'in_progress'])

    let preferredCleaner: string | null = null
    const { data: completedBookings } = await supabaseAdmin.from('bookings')
      .select('cleaners(name)').eq('client_id', client.id).eq('status', 'completed')
    if (completedBookings && completedBookings.length > 0) {
      const counts: Record<string, number> = {}
      for (const b of completedBookings) {
        const n = (b.cleaners as unknown as { name: string })?.name
        if (n) counts[n] = (counts[n] || 0) + 1
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) preferredCleaner = sorted[0][0]
    }

    const formatTime = (s: string | null) => {
      if (!s) return null
      const h = parseInt(s.split('T')[1]?.split(':')[0] || '0')
      return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`
    }

    const upcoming = (recentBookings || [])
      .filter(b => ['scheduled', 'pending', 'in_progress'].includes(b.status))
      .map(b => ({
        booking_id: b.id, date: b.start_time?.split('T')[0], time: formatTime(b.start_time),
        service_type: b.service_type, cleaner: (b.cleaners as unknown as { name: string })?.name || 'unassigned',
        hourly_rate: b.hourly_rate, status: b.status,
      }))

    const { data: prevConvos } = await supabaseAdmin.from('sms_conversations')
      .select('outcome, summary, created_at').eq('client_id', client.id)
      .not('outcome', 'is', null).order('created_at', { ascending: false }).limit(3)

    const { data: prevMessages } = await supabaseAdmin.from('client_sms_messages')
      .select('direction, message, created_at').eq('client_id', client.id)
      .order('created_at', { ascending: false }).limit(20)

    return JSON.stringify({
      name: client.name, address: client.address, email: client.email,
      notes: client.notes, active: client.active, do_not_service: client.do_not_service,
      total_bookings: totalBookings || 0, preferred_cleaner: preferredCleaner,
      last_rate: recentBookings?.[0]?.hourly_rate || null,
      upcoming,
      recent_bookings: (recentBookings || []).map(b => ({
        date: b.start_time?.split('T')[0], service_type: b.service_type,
        cleaner: (b.cleaners as unknown as { name: string })?.name || 'unassigned',
        hourly_rate: b.hourly_rate, status: b.status,
      })),
      conversation_history: (prevConvos || []).map(c => ({ date: c.created_at?.split('T')[0], outcome: c.outcome, summary: c.summary })),
      previous_messages: (prevMessages || []).reverse().map(m => ({ from: m.direction === 'inbound' ? 'client' : 'selena', message: m.message })),
    })
  } catch (err) {
    await selenaError('getClientProfile', err)
    return JSON.stringify({ error: 'Failed to fetch profile' })
  }
}

// ─── Calendar Context Builder ───────────────────────────────────────────────

function buildCalendarContext(): string {
  const now = new Date()
  const fullDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
  const currentHour = parseInt(now.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }))
  const afterHours = currentHour >= 21 || currentHour < 7
  const timeNote = afterHours ? '\nNOTE: After hours. Be brief.' : ''

  const days: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    days.push(`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} = ${d.toLocaleDateString('en-CA')}`)
  }

  return `\n\nToday is ${fullDate}. Time: ${currentTime} ET.${timeNote}\nCALENDAR:\n${days.join('\n')}`
}

// ─── Message Builder ────────────────────────────────────────────────────────

function buildMessages(transcript: Array<{ role: 'user' | 'assistant'; content: string }>, newMessage: string) {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  const recent = transcript.slice(-20)
  for (const msg of recent) {
    if (messages.length > 0 && messages[messages.length - 1].role === msg.role) {
      messages[messages.length - 1].content += '\n' + msg.content
      continue
    }
    messages.push({ role: msg.role, content: msg.content })
  }
  if (messages.length > 0 && messages[0].role === 'assistant') messages.shift()
  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content += '\n' + newMessage
  } else {
    messages.push({ role: 'user', content: newMessage })
  }
  return messages
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — TWO-LAYER ARCHITECTURE
// Layer 1: Extract fields deterministically (no AI)
// Layer 2: Claude just talks (3 tools max: availability, booking, waitlist)
// ════════════════════════════════════════════════════════════════════════════

export async function askSelena(
  channel: 'sms' | 'web',
  message: string,
  conversationId: string,
  phone?: string,
): Promise<SelenaResult> {
  const result: SelenaResult = { text: '', checklist: EMPTY_CHECKLIST }

  try {
    // ── STEP 0: Load current state ──
    let checklist = await loadChecklist(conversationId)
    if (checklist.status === 'greeting') {
      checklist = await updateChecklist(conversationId, { status: 'collecting' })
    }

    const preStep = getNextStep(checklist)

    // ── LAYER 1: Deterministic extraction ──
    // Parse the message for any recognizable fields and save them.
    // This happens BEFORE Claude sees anything.
    const extraction = await extractAndSave(message, checklist, conversationId, preStep.field)
    if (extraction.clientCreated) result.clientCreated = true

    // Reload checklist after extraction
    checklist = await loadChecklist(conversationId)
    const nextStep = getNextStep(checklist)

    // ── Build context for Claude ──
    const calendar = buildCalendarContext()
    const checklistPrompt = buildChecklistPrompt(checklist, nextStep)

    // Tell Claude what was just extracted so it can acknowledge naturally
    let extractionContext = ''
    const extractedKeys = Object.keys(extraction.extracted)
    if (extractedKeys.length > 0) {
      const items = extractedKeys.map(k => {
        const val = extraction.extracted[k as keyof BookingChecklist]
        return `${k}: ${val}`
      }).join(', ')
      extractionContext = `\n\nJUST EXTRACTED FROM CLIENT'S LAST MESSAGE (already saved — do NOT re-ask): ${items}`
    }

    let clientContext = ''
    const lookupPhone = channel === 'sms'
      ? await supabaseAdmin.from('sms_conversations').select('phone').eq('id', conversationId).single().then(r => r.data?.phone)
      : phone || null
    if (lookupPhone && !lookupPhone.startsWith('web-')) {
      const profile = await getClientProfile(lookupPhone)
      if (!profile.includes('"error"')) clientContext = `\n\nCLIENT PROFILE:\n${profile}`
    }

    const systemPrompt = SYSTEM_PROMPT + calendar + '\n' + checklistPrompt + extractionContext + clientContext

    // ── Load transcript ──
    const { data: msgs } = await supabaseAdmin
      .from('sms_conversation_messages')
      .select('direction, message')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20)

    const transcript = (msgs || []).map(m => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.message,
    }))

    const messages = buildMessages(transcript, message)

    // ── LAYER 2: Claude conversation (3 tools only) ──
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
      let currentMessages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }> = [...messages]

      // Max 3 iterations (down from 5 — fewer tools means fewer loops needed)
      for (let i = 0; i < 3; i++) {
        const response = await getClient().messages.create(
          { model: 'claude-sonnet-4-20250514', max_tokens: 700, system: systemPrompt, messages: currentMessages, tools: TOOLS },
          { signal: controller.signal }
        )

        const toolBlocks = response.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
        const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')

        if (textBlocks.length > 0) {
          const text = textBlocks.map(b => b.text).join(' ').trim()
          if (text) result.text = text
        }

        if (toolBlocks.length === 0) break

        currentMessages.push({ role: 'assistant', content: response.content as Anthropic.Messages.ContentBlockParam[] })
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

        for (const tool of toolBlocks) {
          const inp = tool.input as Record<string, unknown>
          let toolResult: string
          try {
            switch (tool.name) {
              case 'check_availability': toolResult = await handleCheckAvailability(inp); break
              case 'create_booking': toolResult = await handleCreateBooking(inp, conversationId, result); break
              case 'add_to_waitlist': toolResult = await handleAddToWaitlist(inp, conversationId); break
              default: toolResult = JSON.stringify({ error: `Unknown tool: ${tool.name}` })
            }
          } catch (toolErr) {
            await selenaError(`tool_loop:${tool.name}`, toolErr, conversationId)
            toolResult = JSON.stringify({ success: true })
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: toolResult, ...(toolResult.includes('"error"') ? { is_error: true } : {}) })
        }

        currentMessages.push({ role: 'user', content: toolResults })
      }

      // Fallback if no text captured
      if (!result.text) {
        const fallback = await getClient().messages.create(
          { model: 'claude-sonnet-4-20250514', max_tokens: 700, system: systemPrompt, messages: currentMessages },
          { signal: controller.signal }
        )
        const fallbackText = fallback.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        if (fallbackText.length > 0) result.text = fallbackText.map(b => b.text).join(' ').trim()
      }
    } finally {
      clearTimeout(timeout)
    }

    // ── Final checks ──
    if (!result.text) {
      await selenaError('empty_response', new Error('Selena returned no text'), conversationId)
      result.text = "Sorry, nothing came through on my end! Could you resend that? 😊"
    }
    if (result.text.length > 600) result.text = result.text.slice(0, 597) + '...'

    result.checklist = await loadChecklist(conversationId)
    return result
  } catch (err) {
    await selenaError('askSelena_main', err, conversationId)
    result.text = 'Text us at (212) 202-8400 and we\'ll help you right away 😊'
    return result
  }
}
