import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAnthropic } from '@/lib/anthropic-client'
import { scoreCleanersForBooking } from '@/lib/nycmaid/smart-schedule'
import { notify } from '@/lib/nycmaid/notify'
import { sendSMS } from '@/lib/nycmaid/sms'
import { smsAdmins } from '@/lib/nycmaid/admin-contacts'
import { sendEmail } from '@/lib/nycmaid/email'
import { emailWrapper } from '@/lib/nycmaid/email-templates'

// nycmaid's well-known UUID — fallback when a conversation row pre-dates the
// tenant_id column. Phase 3.2 sweep: every tenant-scoped query in this file
// resolves tid from convo.tenant_id and falls back to this constant.
const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

// ─── Error Monitoring ───────────────────────────────────────────────────────

export async function yinezError(context: string, err: unknown, conversationId?: string) {
  let message: string
  if (err instanceof Error) {
    message = err.message
  } else if (err && typeof err === 'object') {
    // Supabase errors: { message, code, details, hint }
    const e = err as Record<string, unknown>
    const parts = [e.message, e.code, e.details, e.hint].filter(Boolean)
    message = parts.length > 0 ? parts.join(' | ') : JSON.stringify(err)
  } else {
    message = String(err)
  }
  const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : ''
  console.error(`[Yinez] ${context}:`, err)
  await notify({
    type: 'yinez_error',
    title: `Yinez Error — ${context}`,
    message: `${message}${conversationId ? `\nConversation: ${conversationId}` : ''}${stack ? `\n${stack}` : ''}`,
  }).catch(() => {})
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BookingChecklist {
  service_type: 'regular' | 'deep' | 'move_in_out' | 'airbnb' | 'emergency' | null
  bedrooms: number | null
  bathrooms: number | null
  rate: 49 | 59 | 65 | 69 | 75 | 79 | 89 | 99 | 100 | null
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

export type Intent =
  | 'booking' | 'rebook' | 'emergency'
  | 'payment_confirm' | 'payment_question' | 'dispute'
  | 'account_help' | 'schedule_change' | 'cleaner_request'
  | 'feedback_positive' | 'feedback_negative'
  | 'casual' | 'question' | 'referral'
  | 'human_request' | 'not_interested'
  | 'greeting'

export interface YinezResult {
  text: string
  clientCreated?: boolean
  bookingCreated?: boolean
  checklist: BookingChecklist
  intent?: Intent
  isCleaner?: boolean
  debug?: string
}

export type NextStep = { field: string | null; instruction: string }

export const EMPTY_CHECKLIST: BookingChecklist = {
  service_type: null, bedrooms: null, bathrooms: null, rate: null,
  day: null, date: null, time: null, name: null, phone: null,
  address: null, email: null, notes: null, rating: null, status: 'greeting',
}

// ─── Anthropic Client ───────────────────────────────────────────────────────
// No module-level client — resolved per request from the conversation's tenant
// (its own key if set, platform key otherwise) in askSelena below.

// ════════════════════════════════════════════════════════════════════════════
// CLEANER DETECTION — Check if this phone belongs to staff, not a client
// ════════════════════════════════════════════════════════════════════════════

export async function isCleanerPhone(phone: string, tenantId: string): Promise<{ isCleaner: boolean; name?: string }> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)
  if (!cleanPhone || cleanPhone.length < 7) return { isCleaner: false }

  // tenantId REQUIRED — always tenant-scope so this can never match another
  // tenant's team across the shared cleaners/team table.
  const q = supabaseAdmin
    .from('cleaners')
    .select('name')
    .eq('active', true)
    .eq('tenant_id', tenantId)
    .ilike('phone', `%${cleanPhone}%`)
    .limit(1)

  const { data } = await q

  if (data && data.length > 0) return { isCleaner: true, name: data[0].name }
  return { isCleaner: false }
}

// ════════════════════════════════════════════════════════════════════════════
// INTENT ROUTER — Classifies what the client wants BEFORE any flow
// ════════════════════════════════════════════════════════════════════════════

const INTENT_PATTERNS: { intent: Intent; patterns: RegExp[] }[] = [
  // Human request — highest priority
  { intent: 'human_request', patterns: [
    /\b(?:talk to|speak to|transfer|connect me|call me|human|real person|manager|supervisor)\b/i,
    /\bcan(?:'t| not) (?:do all this )?text/i,
  ]},
  // Payment confirmation — narrowed so "i paid for 3 hours" (dispute context) does NOT match
  { intent: 'payment_confirm', patterns: [
    /^(?:just )?paid[\s.!]*$/i,
    /\bjust paid\b/i,
    /\bpaid (?:you|now|it|via|with|thru|through)\b/i,
    /\bpayment sent\b/i,
    /\bjust sent\b/i,
    /\bsent (?:you |the )?(?:zelle|venmo|payment|money)/i,
    /\bzelle[d']?\b/i, /\bvenmo[d']?\b/i,
    /\bjust zelle/i, /\bjust venmo/i,
    /\btransferred\b/i, /\bsent it\b/i, /\bmoney sent\b/i,
  ]},
  // Not interested
  { intent: 'not_interested', patterns: [
    /\b(?:not (?:looking|interested|need)|don'?t need|no(?:t)? (?:right now|at (?:the|this) moment)|no services?|no clean)/i,
    /\bI (?:offer|provide|do|am a) clean/i, // someone offering services, not requesting
    /\b(?:looking for (?:work|job|employment)|hiring|do you hire|are you hiring)/i,
    /^(?:maybe (?:later|next time|another time|tomorrow))[\s.!]*$/i,
    /^(?:no thanks?|no thank you|nah|nope)[\s.!]*$/i,
    /^(?:wrong number|wrong #|not me)[\s.!]*$/i,
  ]},
  // Payment question
  { intent: 'payment_question', patterns: [
    /\b(?:how much (?:do I owe|is it)|what(?:'s| is| do I) (?:owe|balance)|receipt|invoice|payment (?:method|option))/i,
    /\b(?:pay (?:with|via|by)|accept (?:venmo|zelle|credit|card|cash))\b/i,
    /\b(?:my balance|what do I owe|what'?s owed|how do i pay)/i,
    /\bsend (?:me )?(?:my |the )?(?:invoice|receipt|bill)/i,
    /\bresend (?:my |the )?(?:invoice|receipt|confirmation)/i,
    /\b(?:add|leave|include) (?:a )?tip/i,
    /\bdidn'?t get (?:my |the )?(?:receipt|confirmation)/i,
    /\bnever got (?:my |a |the )?receipt/i,
  ]},
  // Dispute — client challenges time, price, hours, arrival, threatens chargeback, demands discount/refund
  { intent: 'dispute', patterns: [
    /\b(?:charged|overcharged|too (?:much|many|long|expensive)|wasn'?t (?:here|there) (?:that|for)|only (?:here|there) for)/i,
    /\b(?:dispute|wrong (?:amount|charge|price|time|hours)|not right|incorrect|doesn'?t? (?:add up|look right|seem right))/i,
    /\b(?:she (?:was|wasn'?t) (?:late|here|only)|arrived (?:late|at)|didn'?t (?:arrive|come|show))/i,
    /\bcleaner (?:didn'?t|never|wasn'?t) (?:show|come|arrive|clean)/i,
    /\b(?:shouldn'?t (?:have to )?pay|not paying|refuse to pay|that'?s (?:too much|wrong))/i,
    /\b(?:4 hours|3 hours|2 hours).*\b(?:but|only|wasn'?t|not)\b/i,
    /\b(?:but|only|wasn'?t|not)\b.*\b(?:4 hours|3 hours|2 hours)/i,
    /\b(?:how (?:long|many hours)|actual (?:time|hours)|check.in|check.out)\b/i,
    // Refund demands
    /\b(?:refund(?:ed)?|money back|give me (?:my )?money|want my money)\b/i,
    // Chargeback threats
    /\b(?:chargeback|charge ?back|dispute (?:this )?(?:with|to) (?:my )?(?:bank|card|cc))\b/i,
    /\bcancel (?:my |the )?payment\b/i,
    // Discount demands — exclude "recurring discount" / "loyalty discount" (those are questions about the standard recurring offer)
    /\b(?:give me|want|need|deserve|any|ill take|can i get|i'?d like|gimme) (?:a |the |any )?(?!recurring |loyalty |first.?time )discount\b/i,
    /\b(?:take \$?\d+ off|\$?\d+ off (?:the |my )?(?:bill|payment|total)|half off|take half off|mark (?:it )?down|knock (?:\$?\d+ )?off|deserve \$?\d+ off)\b/i,
    // Not authorized / unauthorized
    /\b(?:never authorized|didn'?t authorize|unauthorized|did not authorize)\b/i,
    // Quality-based partial-pay demands
    /\b(?:only did half|did half the job|half the job|didn'?t finish|half (?:finished|done)|partial (?:job|work|clean))\b/i,
    // Time-based gaslight — more flexible than "was late" adjacent
    /\b(?:she|cleaner|was|she was|cleaner was)\b.{0,20}\b(\d+|one|two|three|four|five)\s*(?:hours?|hrs?|minutes?|mins?)\s*(?:late|early)\b/i,
    /\bleft (?:\d+ )?(?:hours?|hrs?|minutes?|mins?) early\b/i,
    /\bleft early\b/i,
    /\bleft (?:after )?\d+ (?:hours?|hrs?|minutes?|mins?)\b/i,
    /\b(?:she|cleaner|he) (?:only )?(?:stayed|was here|here) (?:for )?\d+ (?:hours?|hrs?|minutes?|mins?)/i,
    /\bclock (?:started|was) (?:\d+ )?(?:min(?:ute)?s? |hrs? |hours? )?early\b/i,
    /\bstarted (?:the )?(?:clock|time) early\b/i,
    /\bthought (?:it|the rate|the price) (?:was|is) \$?\d+/i,
    // Pay counter-offer
    /\bi(?:'ll| will)? (?:only )?pay \$?\d+/i,
    /\bpay \$?\d+ total\b/i,
    // "You canceled on me" — our cancellation complaint (not their cancellation)
    /\byou (?:guys |people )?canceled?\b/i,
    // Payment delay request
    /\b(?:need|want) more time to pay\b/i,
    /\bsplit (?:the |my )?bill\b/i,
    // Damage to property (physical damage) — flexible word spacing
    /\b(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|lamp|door|cabinet) (?:damage|scratched?|broken|cracked|ruined|chipped|dented)\b/i,
    /\bdamage to (?:my )?(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|apartment|home|property|lamp|door)\b/i,
    /\b(?:deep |bad |big )?scratch(?:ed)?.{0,40}(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|lamp|door|cabinet)\b/i,
    /\bthere(?:'s| is) (?:a |some )?(?:deep |bad |big )?(?:scratch|dent|crack|chip|hole)\b/i,
  ]},
  // Schedule change
  { intent: 'schedule_change', patterns: [
    /\b(?:reschedul|cancel (?:my|the|next))/i,
    /\bchange (?:my|the)\b.*?\b(?:appointment|booking|cleaning|time|date|day|upcoming)/i,
    /\b(?:change|move) (?:my|the) (?:upcoming |next )?(?:appointment|booking|cleaning)/i,
    /\b(?:move (?:my|the) [\w\s]*(?:appointment|booking|cleaning))/i,
    /\b(?:cancel (?:next |this )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
    /\b(?:pause|skip|hold) (?:my )?(?:recurring|weekly|biweekly|service|this week|next week)/i,
    /\bskip (?:this |next |a )?week\b/i,
  ]},
  // Account help
  { intent: 'account_help', patterns: [
    /\b(?:pin|portal|log.?in|access|can'?t (?:get in|access|log)|account|password|confirmation email)/i,
    /\b(?:change|update) (?:my )?(?:address|email|phone|number)/i,
    /\b(?:didn'?t (?:get|receive) (?:the |my )?(?:email|confirmation))/i,
    // Next appointment / upcoming booking lookups
    /\b(?:when is|what time is|whats? the time of) (?:my|the) (?:next |upcoming )?(?:appointment|booking|cleaning|service)/i,
    /\bmy (?:next |upcoming )(?:appointment|booking|cleaning|service)/i,
    // ETA / on-her-way requests
    /\b(?:eta|on (?:her|his|the) way|when (?:is|will) (?:she|the cleaner) (?:arrive|come|get here|show))/i,
    /\btext me when (?:she|the cleaner|someone)/i,
    // Switch plan
    /\bswitch (?:from |to )?\$?\d+ ?(?:plan|rate|hour)?/i,
    /\bi moved\b/i,
    // New address on file
    /\bnew address:/i,
  ]},
  // Cleaner request
  { intent: 'cleaner_request', patterns: [
    /\b(?:(?:can I |I )?(?:want|request|prefer|have|get) (?:the same )?(?:cleaner|Maria|Gloria|Karina|Martha|Eunice|Katrina))/i,
    /\b(?:is (?:Maria|Gloria|Karina|Martha|Eunice|Katrina) available)/i,
    /\b(?:same cleaner|prefer \w+)\b/i,
  ]},
  // Rebook — requires explicit "again"/"another" signals (prior booking implied)
  { intent: 'rebook', patterns: [
    /\b(?:same (?:as last|thing|again)|book (?:again|another)|need another clean)/i,
    /\b(?:schedule (?:another|again|next))/i,
  ]},
  // Feedback positive — moved BEFORE emergency so "great service today" doesn't misfire on emergency's "today" trigger
  { intent: 'feedback_positive', patterns: [
    /\b(?:she was|they were|it was|cleaning was|cleaner was|Gloria was|Maria was|Karina was|Martha was|Eunice was)\s+(?:great|amazing|awesome|perfect|wonderful|fantastic|excellent|incredible)\b/i,
    /\b(?:Gloria|Maria|Karina|Martha|Eunice)\b.*\b(?:incredible|amazing|awesome|great|fantastic|wonderful|excellent|perfect)\b/i,
    /\blove (?:my|the|our) cleaner/i, /\bamazing job\b/i, /\bgreat job\b/i,
    /\bthank(?:s| you)\b.*\b(?:clean|service|job)/i,
    /\b(?:great|amazing|awesome|perfect|wonderful|fantastic|excellent|incredible)\s+(?:service|cleaning|clean|work|job)\b/i,
  ]},
  // Emergency — moved AFTER dispute/feedback_negative/feedback_positive so complaints/praise with "today" don't misfire
  { intent: 'emergency', patterns: [
    /\b(?:today|asap|emergency|urgent|right now|immediately|same.?day|tonight|this (?:evening|morning|afternoon))\b/i,
    /\b(?:need (?:someone|a cleaner) (?:today|now|tonight|asap|soon))\b/i,
    /\b(?:can you clean (?:tonight|today|now|soon))\b/i,
  ]},
  // Feedback negative
  { intent: 'feedback_negative', patterns: [
    /\b(?:not happy|not satisfied|complaint|terrible|awful|horrible|worst|damage|broke|missing|stole|damaged|stolen)/i,
    /\b(?:didn'?t clean|missed|forgot|skipped)/i,
    /\b(?:haven'?t|have not|never) (?:called|responded|heard|got back|reached out)/i,
    /\b(?:why haven'?t|why havent|why hasnt|why has not)/i,
    /\b(?:broke my|broken my|damaged my|scratched my|stole my|took my)/i,
    /\bno one (?:called|responded|answered)/i,
    // Cleaner behavior complaints — allow words between (e.g. "was extremely rude")
    /\b(?:cleaner|she|he).{0,15}\b(?:rude|disrespectful|mean|nasty|aggressive|unprofessional)\b/i,
    /\b(?:extremely|very|so|really) rude\b/i,
    /\brude to me\b/i,
    /\bhad (?:an )?attitude/i,
    /\b(?:smoked|cigarette|weed|marijuana|drunk)\b/i,
    /\bsmelled like (?:smoke|cigarettes?|weed|alcohol)\b/i,
    /\b(?:on (?:her|his|their) phone|phone the whole|texting the whole)/i,
    /\bbrought (?:her|his|their) (?:kid|child|children|daughter|son|baby|friend|boyfriend|husband)/i,
    /\bwrong cleaner\b/i,
    /\bnever again\b/i,
    /\bunsubscribe me\b/i,
    // Quality/completeness
    /\bbathroom (?:is |was |still )?dirty\b/i,
    /\bkitchen (?:wasn'?t |not |still )?(?:clean|cleaned|dirty)/i,
    /\bstill dirty\b/i,
    /\b(?:only did|did only|did just) half\b/i,
    /\bwasn'?t (?:even )?clean\b/i,
    /\bnot (?:even )?clean\b/i,
    /\bplace (?:wasn'?t|was not|ain'?t) clean\b/i,
    /\bdidn'?t (?:clean|do|finish|touch|wipe|vacuum|mop|dust) (?:the |my )?\w+/i,
    // Theft / missing
    /\btook (?:my )?(?:money|cash|wallet|watch|ring|jewelry|stuff|things)\b/i,
    /\btook .+ from (?:my|the) (?:wallet|purse|apartment|house|room|bedroom)/i,
    /\bshe stole/i,
    // Ignored / no response
    /\b(?:nobody|no one) (?:has )?(?:called|responded|answered|got back|reached)/i,
    /\bno response\b/i,
    /\b(?:ignoring|ignored) me\b/i,
    /\btexting for \d+ (?:days?|weeks?) (?:and |with )?no (?:response|reply)/i,
  ]},
  // Referral
  { intent: 'referral', patterns: [
    /\b(?:my friend|refer|recommend(?:ed)? (?:you|to)|someone (?:I know|who))/i,
  ]},
  // Question
  { intent: 'question', patterns: [
    /\b(?:how much|hw much|wat is yer|whats yer|how mutch)\b/i,
    /\b(?:what (?:are|is) (?:your|the|yr) (?:rate|price|cost))/i,
    /\bhow much (?:for|would|does|do|is|u|you)/i,
    /\b(?:u|you) charge\b/i,
    /\b(?:what area|where do you|do you (?:cover|service|serve))/i,
    /\b(?:insured|licensed)/i,
    /\b(?:do you|yall|y'?all)\s+(?:bring|provide|have)\s+(?:supplies|products|equipment)/i,
    /\b(?:supplies|products|equipment)\s+(?:included|come with|provided)/i,
    /\b(?:price|rate|cost|estimate|quote)\b/i,
    /\bwhat (?:if|happens if) I (?:need to )?cancel/i,
    /\b(?:cancellation|cancel) (?:policy|fee|rules)/i,
    /\b(?:are you|is this|am i (?:talking to|chatting with))\s+(?:an?\s+)?(?:robot|ai|automated|real person|bot|human|person|real)\b/i,
    /\b(?:do you|can you|do u) (?:also )?(?:do|offer|clean) (?:office|commercial|laundry|plumb|electric|paint|repair|handyman|window)/i,
    /\b(?:tip|tipping|gratuity)\b/i,
    /\b(?:how long|how short|minimum|do you bring|how (?:do i|to) (?:tip|pay))/i,
    /\b(?:do you|you) (?:do|offer|work|clean) (?:on )?(?:weekends?|saturdays?|sundays?)/i,
    /\b(?:what.{0,15}deep clean (?:include|cover))/i,
    /\b(?:do i need to be home|same cleaner|whats? included)/i,
    // Accommodation / accessibility / special-case questions
    /\b(?:do you (?:work with|accommodate|handle)|can you (?:work with|accommodate|handle))\b/i,
    /\b(?:senior|elderly|accessibility|wheelchair|disabled|mobility)\b/i,
    // Recurring service questions
    /\b(?:do you|offer|have|is there) .{0,10}(?:recurring|weekly|bi.?weekly|monthly)/i,
    /\b(?:recurring|weekly|bi.?weekly|monthly) (?:service|cleaning|discount|option|rate)/i,
    /\boffer recurring\b/i,
    // Airbnb / short-term turnover — only when phrased as question, not as service selection
    /\b(?:do you|can you|yall|y'?all) (?:clean|do|handle|service) (?:airbnbs?|air ?bnbs?|short.?term|turnovers?|rentals?)/i,
    /\bdo you (?:offer|have) (?:airbnb|turnover|short.?term)/i,
    /\bwhats?.*(?:airbnb|turnover) (?:rate|price|cost)/i,
  ]},
  // Greeting / casual
  { intent: 'casual', patterns: [
    /^[^a-zA-Z]*(?:thanks?|thank\s*you|thx|ty|trank\s*u?|tanks?|tnx|ok|okay|got it|sounds good|perfect|great|cool|awesome|sure|yes|no|yep|nope|good (?:morning|afternoon|evening|night)|have a (?:good|great|nice)|bye|see you|take care)[^a-zA-Z]*$/i,
    /^[^a-zA-Z0-9]+$/,  // pure emojis/punctuation/symbols — no letters or numbers
    /^(?:hi|hey|hello|yo|sup|hola|what's up|buenos\s+(?:dias|días|tardes|noches)|buenas\s+(?:tardes|noches))[^a-zA-Z]*$/i,
  ]},
]

export function detectIntent(message: string, checklist: BookingChecklist, isReturning: boolean): Intent {
  const text = message.trim()
  const inFlow = ['collecting', 'recap'].includes(checklist.status)

  // Check patterns in priority order
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      // In active booking flow, short answers like "nope", "ok", "no" are
      // answers to whatever Yinez just asked — NOT signals to exit the flow.
      if (inFlow && (intent === 'casual' || intent === 'not_interested')) {
        if (/\b(?:bye|good (?:night|bye)|see you|take care)\b/i.test(text)) return 'casual'
        return 'booking'
      }
      return intent
    }
  }

  // If already in booking flow, stay in it
  if (['collecting', 'recap', 'confirmed'].includes(checklist.status)) return 'booking'

  // Simple greeting at start
  if (checklist.status === 'greeting') return 'greeting'

  // Default: new lead wanting to book
  return 'booking'
}

// ─── State Machine (REVERSED ORDER — need first, identity last) ─────────

export function getNextStep(cl: BookingChecklist, isReturning: boolean): NextStep {
  if (cl.status === 'recap') return { field: null, instruction: 'Do the recap. If client already confirmed (yes/correct/looks good), call create_booking immediately — do NOT recap again. Weekday: 30 min arrival buffer. Weekend: 60 min.' }
  if (cl.status === 'confirmed') return { field: null, instruction: 'Booking confirmed. Thank them warmly. Say goodbye.' }
  if (cl.status === 'closed') return { field: null, instruction: 'Conversation is complete.' }

  // For returning clients, skip fields we already have
  if (!cl.service_type) return { field: 'service_type', instruction: 'Ask what type of cleaning they need. Use numbered options on SMS.' }
  if (cl.bedrooms === null || cl.bathrooms === null) return { field: 'bedrooms', instruction: 'Ask how many bedrooms and bathrooms.' }
  if (!cl.rate) return { field: 'rate', instruction: 'Give time estimate RANGE for their size, then pricing: $69/hr (we supply everything) or $59/hr (client provides supplies). $89/hr for same-day. Do NOT mention recurring discount — that only applies after their first visit. Use numbered options on SMS.' }
  if (!cl.day) return { field: 'day', instruction: 'Ask what day works best. Our default slots are 8am, 12pm, and 4pm but we adjust as needed.' }
  if (!cl.time) return { field: 'time', instruction: 'Ask what time works. Our default slots are 8am, 12pm, and 4pm but we can adjust.' }

  // Identity fields come AFTER service details
  if (!cl.name) return { field: 'name', instruction: 'Ask for their first and last name.' }
  if (!cl.phone && !isReturning) return { field: 'phone', instruction: 'Ask for their phone number so the cleaner can reach them day of service.' }
  if (!cl.address) return { field: 'address', instruction: 'Ask for full address — street, apt/unit, city, zip.' }
  if (!cl.email) return { field: 'email', instruction: 'Ask for their email address for booking confirmation.' }

  if (!cl.notes) return { field: 'notes', instruction: 'All info collected. Ask: "Any special notes for the cleaner? You can also add notes anytime through your client portal at thenycmaid.com/portal 😊" If they say no/none, move to recap.' }

  // Everything including notes is filled — recap time
  return { field: null, instruction: 'All fields collected. Do the recap now.' }
}

// ─── Checklist Prompt Builder ───────────────────────────────────────────────

export function buildChecklistPrompt(cl: BookingChecklist, next: NextStep): string {
  // Only show what we HAVE — don't show missing fields (Claude tries to ask for them out of order)
  const collected: string[] = []
  if (cl.service_type) collected.push(`service_type: ${cl.service_type}`)
  if (cl.bedrooms !== null) collected.push(`bedrooms: ${cl.bedrooms}`)
  if (cl.bathrooms !== null) collected.push(`bathrooms: ${cl.bathrooms}`)
  if (cl.rate) collected.push(`rate: $${cl.rate}/hr`)
  if (cl.day) collected.push(`day: ${cl.day}`)
  if (cl.date) collected.push(`date: ${cl.date}`)
  if (cl.time) collected.push(`time: ${cl.time}`)
  if (cl.name) collected.push(`name: ${cl.name}`)
  if (cl.phone) collected.push(`phone: ${cl.phone}`)
  if (cl.address) collected.push(`address: ${cl.address}`)
  if (cl.email) collected.push(`email: ${cl.email}`)
  if (cl.notes) collected.push(`notes: ${cl.notes}`)

  const header = next.field === null && cl.status === 'recap'
    ? 'ALL INFO COLLECTED — recap now.'
    : next.field === null
    ? 'BOOKING COMPLETE.'
    : `COLLECTED SO FAR:\n${collected.length > 0 ? collected.join('\n') : '(nothing yet)'}`

  return `\n\n${header}\nstatus: ${cl.status}\n\n>>> YOUR ONLY JOB RIGHT NOW: ${next.instruction} <<<\nDo NOT ask about anything else. Do NOT ask for address, email, name, or any other field. ONLY ask what is specified above.`
}

// ─── Quick Replies ──────────────────────────────────────────────────────────

export function getQuickReplies(cl: BookingChecklist, next: NextStep): string[] {
  if (cl.status === 'greeting') return ['I need a cleaning', 'Get a quote', 'Check my account']
  if (cl.status === 'recap') return ['Yes, all correct!', 'I need to change something']
  if (cl.status === 'confirmed' || cl.status === 'closed') return []

  switch (next.field) {
    case 'service_type': return ['Regular cleaning', 'Deep cleaning', 'Move-in/move-out', 'Airbnb turnover']
    case 'bedrooms': return ['1 bed 1 bath', '2 bed 1 bath', '2 bed 2 bath', '3 bed 2 bath']
    case 'rate': return ['$69 — you bring everything', '$59 — I have supplies']
    case 'day': return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    case 'time': return ['8am', '10am', '12pm', '2pm', '4pm']
    default: return []
  }
}

// ─── Checklist DB Operations ────────────────────────────────────────────────

export async function loadChecklist(conversationId: string): Promise<BookingChecklist> {
  const { data } = await supabaseAdmin
    .from('sms_conversations')
    .select('booking_checklist, phone')
    .eq('id', conversationId)
    .single()
  // SMS conversations always have the phone (it's the FROM). Prefill the
  // checklist so Yinez never asks for it again on SMS — fixes the "phone
  // memory loss" loop where she re-asked even after the customer provided one.
  const cl = { ...EMPTY_CHECKLIST, ...(data?.booking_checklist || {}) }
  if (!cl.phone && data?.phone) cl.phone = data.phone
  return cl
}

export async function updateChecklist(conversationId: string, updates: Partial<BookingChecklist>): Promise<BookingChecklist> {
  const current = await loadChecklist(conversationId)
  const updated = { ...current, ...updates }

  if (updated.status === 'collecting') {
    const step = getNextStep(updated, false)
    // Only auto-transition to recap when ALL fields are done (field is null), not when notes is next
    if (step.field === null) {
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
// ════════════════════════════════════════════════════════════════════════════

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

    const { data: client } = await supabaseAdmin
      .from('clients').insert({ tenant_id: tid, name, phone, status: 'potential', pin: Math.floor(100000 + Math.random() * 900000).toString() }).select('id').single()

    if (client) {
      const { createPrimaryContact } = await import('@/lib/nycmaid/client-contacts')
      await createPrimaryContact(client.id, { name, phone }).catch(() => {})
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
const YINEZ_PERSONALITY = `You are Yinez from The NYC Maid. You ARE the business — say "we" and "our."
Short messages (under 300 chars, max 480). One question per message. 😊 only emoji, once max.
BANNED PHRASES — never say these: "certainly" "absolutely" "of course" "great question" "happy to help" "I'd love to help" "I'd be happy"
Say "she" for the cleaner. Plain text, no markdown. Spanish detected = respond in Spanish. Spanglish = respond in whatever they use.
NEVER invent prices or totals. Only quote hourly rates: $69/hr (WE bring supplies) or $59/hr (CLIENT provides their own supplies). $89/hr same-day. NEVER confuse which is which.
All bookings are ONE-TIME. Never ask about recurring frequency. Never mention discounts.
When ALL booking fields are collected, you MUST do the recap and then call create_booking tool after client confirms. The booking is NOT created until you call the tool.`

// Step-specific instructions — changes per turn based on intent + checklist state
function buildStepPrompt(intent: Intent, cl: BookingChecklist, next: NextStep, isReturning: boolean): string {
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
      return `${summary}${est ? ` That typically runs ${est}.` : ''} Present TWO options clearly: 1) $69/hr — WE bring all cleaning supplies and equipment 2) $59/hr — THEY provide their own cleaning supplies and equipment. Also $89/hr for same-day emergency. NEVER mix up which is which. $69 = we supply, $59 = they supply. No discounts on first booking.`
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

// ─── Tool Definitions (grouped by mode) ─────────────────────────────────────

export const ALL_TOOLS: Anthropic.Tool[] = [
  // BOOKING
  { name: 'create_booking', description: 'Create a PENDING booking. ONLY after client confirms recap. For brand-new clients with no profile on file, also pass client_name (REQUIRED) plus client_email and client_address if known — the booking handler will auto-create the client record.', input_schema: { type: 'object' as const, properties: { date: { type: 'string' }, time: { type: 'string' }, service_type: { type: 'string' }, hourly_rate: { type: 'number' }, estimated_hours: { type: 'number' }, recurring_type: { type: 'string' }, client_name: { type: 'string' }, client_email: { type: 'string' }, client_address: { type: 'string' } }, required: ['date', 'time', 'service_type', 'hourly_rate'] } },
  { name: 'add_to_waitlist', description: 'Add to waiting list when no availability.', input_schema: { type: 'object' as const, properties: { preferred_date: { type: 'string' }, preferred_time: { type: 'string' } }, required: ['preferred_date'] } },
  { name: 'get_quote', description: 'Give price estimate without starting a booking.', input_schema: { type: 'object' as const, properties: { service_type: { type: 'string' }, bedrooms: { type: 'number' }, bathrooms: { type: 'number' } }, required: ['service_type'] } },
  // ACCOUNT
  { name: 'get_account', description: 'Full account summary — bookings, payments, preferences.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'update_account', description: 'Update client address, email, phone, or name.', input_schema: { type: 'object' as const, properties: { field: { type: 'string', description: 'address, email, phone, or name' }, value: { type: 'string' } }, required: ['field', 'value'] } },
  { name: 'send_pin', description: 'Look up and send client their portal PIN.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'resend_confirmation', description: 'Resend booking confirmation email.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string', description: 'Optional — defaults to next upcoming' } }, required: [] } },
  // PAYMENT
  { name: 'check_payment', description: 'Balance, what\'s owed, payment history.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'confirm_payment', description: 'Client says they paid. Triggers verification. Include sender_name if payment is coming from someone other than the client (spouse, partner, etc).', input_schema: { type: 'object' as const, properties: { method: { type: 'string', description: 'zelle, venmo, or card' }, sender_name: { type: 'string', description: 'Full name of the actual payer if different from client (e.g. spouse). Omit if client is paying from their own account.' } }, required: ['method'] } },
  { name: 'get_invoice', description: 'Send receipt/invoice to client email.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string', description: 'Optional — defaults to last payment' } }, required: [] } },
  // SCHEDULE
  { name: 'lookup_bookings', description: 'Client\'s upcoming or past bookings.', input_schema: { type: 'object' as const, properties: { status_filter: { type: 'string', description: 'upcoming, completed, all' } }, required: [] } },
  { name: 'reschedule_booking', description: 'Move booking to new date/time. Recurring only, 7 days notice.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, new_date: { type: 'string' }, new_time: { type: 'string' } }, required: ['booking_id', 'new_date', 'new_time'] } },
  { name: 'cancel_booking', description: 'Cancel a booking. First-time = refuse. Recurring = 7 days notice.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, reason: { type: 'string' } }, required: ['booking_id'] } },
  { name: 'manage_recurring', description: 'Pause, resume, or change recurring schedule.', input_schema: { type: 'object' as const, properties: { action: { type: 'string', description: 'pause, resume, change_day, cancel' }, schedule_id: { type: 'string' }, new_day: { type: 'string' }, pause_until: { type: 'string', description: 'YYYY-MM-DD for pause' } }, required: ['action'] } },
  // DISPUTE / DETAILS
  { name: 'booking_details', description: 'Get full booking details including check-in/out times, GPS locations, actual hours, and payment math. Use when client disputes time, price, or arrival.', input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string', description: 'Optional — defaults to most recent completed booking' } }, required: [] } },
  // ISSUE
  { name: 'report_issue', description: 'Log a complaint or issue. Notifies admin.', input_schema: { type: 'object' as const, properties: { description: { type: 'string' }, severity: { type: 'string', description: 'low, medium, high' } }, required: ['description'] } },
  { name: 'request_callback', description: 'Client wants to talk to a human. Notifies admin with context.', input_schema: { type: 'object' as const, properties: { reason: { type: 'string' } }, required: [] } },
  // MEMORY
  { name: 'remember', description: 'Save a fact about this client for future conversations.', input_schema: { type: 'object' as const, properties: { content: { type: 'string' }, type: { type: 'string', description: 'preference, instruction, issue, payment, observation' } }, required: ['content', 'type'] } },
]

// Mode-specific tool selection
export function getToolsForIntent(intent: Intent): Anthropic.Tool[] {
  const toolNames: Record<string, string[]> = {
    greeting: ['remember'],
    booking: ['create_booking', 'remember'],
    rebook: ['lookup_bookings', 'score_cleaners', 'create_booking', 'remember'],
    emergency: ['score_cleaners', 'create_booking', 'remember'],
    payment_confirm: ['confirm_payment', 'check_payment', 'remember'],
    payment_question: ['check_payment', 'get_invoice', 'booking_details', 'remember'],
    account_help: ['get_account', 'update_account', 'send_pin', 'resend_confirmation', 'remember'],
    schedule_change: ['lookup_bookings', 'reschedule_booking', 'cancel_booking', 'manage_recurring', 'remember'],
    cleaner_request: ['lookup_bookings', 'score_cleaners', 'remember'],
    feedback_positive: ['remember'],
    dispute: ['booking_details', 'check_payment', 'remember'],
    feedback_negative: ['report_issue', 'booking_details', 'remember'],
    referral: ['remember'],
    casual: ['remember'],
    not_interested: ['remember'],
    human_request: ['request_callback'],
    question: ['get_quote', 'score_cleaners', 'remember'],
  }

  const names = toolNames[intent] || ['remember']
  return ALL_TOOLS.filter(t => names.includes(t.name))
}

// ─── Phone/Time Helpers ─────────────────────────────────────────────────────

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

export async function handleCreateBooking(input: Record<string, unknown>, conversationId: string, result: YinezResult): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, bedrooms, bathrooms, phone, tenant_id').eq('id', conversationId).single()
    if (!convo) return JSON.stringify({ error: 'Conversation not found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    // Auto-link by phone if no client_id on the conversation row.
    if (!convo.client_id && convo.phone) {
      const last10 = String(convo.phone).replace(/\D/g, '').slice(-10)
      if (last10.length === 10) {
        const { data: existingClient } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('tenant_id', tid)
          .ilike('phone', `%${last10}%`)
          .limit(1)
          .maybeSingle()
        if (existingClient?.id) {
          convo.client_id = existingClient.id
          await supabaseAdmin.from('sms_conversations').update({ client_id: existingClient.id }).eq('id', conversationId).eq('tenant_id', tid)
        }
      }
    }

    // Brand-new client (no match by phone) — auto-create from booking input so
    // create_booking never silently bails on first-time SMS leads. Yinez has
    // the name from the recap; without this branch she'd fall back to
    // request_callback and the customer thinks they're booked while no record
    // exists in the DB.
    if (!convo.client_id && convo.phone) {
      const inputName = typeof input.client_name === 'string' ? input.client_name.trim() : ''
      if (!inputName) {
        return JSON.stringify({ error: 'No client linked yet — pass client_name (and client_email / client_address if known) for new clients' })
      }
      const digits = String(convo.phone).replace(/\D/g, '')
      const last10 = digits.slice(-10)
      if (last10.length !== 10) {
        return JSON.stringify({ error: 'Cannot create client — invalid phone on conversation' })
      }
      const inputEmail = typeof input.client_email === 'string' ? input.client_email.trim() || null : null
      const inputAddress = typeof input.client_address === 'string' ? input.client_address.trim() || null : null
      const pin = Math.floor(100000 + Math.random() * 900000).toString()
      const { data: newClient, error: clientErr } = await supabaseAdmin
        .from('clients')
        .insert({ tenant_id: tid, name: inputName, phone: digits, email: inputEmail, address: inputAddress, status: 'potential', pin })
        .select('id')
        .single()
      if (clientErr || !newClient) {
        return JSON.stringify({ error: `Auto-create client failed: ${clientErr?.message || 'insert returned no row'}` })
      }
      convo.client_id = newClient.id
      await supabaseAdmin
        .from('sms_conversations')
        .update({ client_id: newClient.id, name: inputName })
        .eq('id', conversationId)
        .eq('tenant_id', tid)
      result.clientCreated = true
    }

    if (!convo.client_id) return JSON.stringify({ error: 'No client linked yet' })

    const date = input.date as string, time = input.time as string
    const serviceType = input.service_type as string, hourlyRate = input.hourly_rate as number
    const estimatedHours = (input.estimated_hours as number) || 2
    const recurringType = (input.recurring_type as string) || 'one_time'

    const parsed = parseTime(time)
    if (!parsed) return JSON.stringify({ error: 'Invalid time format' })

    const startTimeStr = `${date}T${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    const startMinTotal = parsed.hours * 60 + parsed.minutes
    const endMinTotal = startMinTotal + Math.round(estimatedHours * 60)
    const endHoursInt = Math.min(23, Math.floor(endMinTotal / 60))
    const endMinutesInt = endMinTotal % 60
    const endTimeStr = `${date}T${String(endHoursInt).padStart(2, '0')}:${String(endMinutesInt).padStart(2, '0')}:00`

    const { data: existing } = await supabaseAdmin.from('bookings').select('id')
      .eq('tenant_id', tid)
      .eq('client_id', convo.client_id).eq('start_time', startTimeStr)
      .in('status', ['pending', 'scheduled', 'in_progress']).limit(1)
    if (existing && existing.length > 0) {
      result.bookingCreated = true
      return JSON.stringify({ success: true, bookingId: existing[0].id, message: 'Booking already exists' })
    }

    const checklist = await loadChecklist(conversationId)
    let suggestedCleanerId: string | null = null
    let suggestedReason = ''
    try {
      const scores = await scoreCleanersForBooking({
        tenantId: tid,
        date, startTime: `${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}`,
        durationHours: estimatedHours, clientAddress: checklist.address || '',
        clientId: convo.client_id, hourlyRate,
      })
      const top = scores.find(s => s.available && s.score > 0)
      if (top) { suggestedCleanerId = top.id; suggestedReason = top.reason }
    } catch {}

    // $20 self-booking discount applies to Yinez chat bookings too (self-service channel),
    // but applies at BILLING (not at quote). booking.price stays at the un-discounted
    // estimate; /api/team/15min-alert subtracts $20 from clientOwes when the booking's
    // notes include the self-booking promo flag.
    const basePriceCents = hourlyRate * estimatedHours * 100
    const finalPriceCents = basePriceCents

    const { data: booking, error } = await supabaseAdmin.from('bookings').insert({
      tenant_id: tid,
      client_id: convo.client_id,
      start_time: startTimeStr, end_time: endTimeStr,
      status: 'pending', service_type: serviceType,
      hourly_rate: hourlyRate, price: finalPriceCents,
      recurring_type: recurringType, suggested_cleaner_id: suggestedCleanerId,
      notes: `SMS booking | ${convo.bedrooms || 0}BR/${convo.bathrooms || 0}BA${suggestedReason ? ` | Suggested: ${suggestedReason}` : ''} | [Promo: $20 self-booking discount applies at billing]`,
    }).select('id').single()

    if (error) throw error

    await supabaseAdmin.from('sms_conversations').update({
      booking_id: booking.id, completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), outcome: 'booked',
      summary: `Booked ${serviceType} ${date} ${time} $${hourlyRate}/hr`,
    }).eq('id', conversationId).eq('tenant_id', tid)

    await updateChecklist(conversationId, { status: 'confirmed' })
    result.bookingCreated = true

    await notify({ type: 'new_booking', title: 'New Pending Booking', message: `${checklist.name} booked ${serviceType} on ${date} at ${time}.${suggestedReason ? ` Suggested: ${suggestedReason}` : ' Manual assignment needed.'}`, booking_id: booking.id }).catch(() => {})

    return JSON.stringify({ success: true, bookingId: booking.id, suggested_cleaner: suggestedReason || 'none' })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err)
    await yinezError('create_booking', err, conversationId)
    result.debug = `create_booking failed: ${errMsg}`
    await smsAdmins(`YINEZ BOOKING FAILED — ${errMsg}. Convo ${conversationId}.`).catch(() => {})
    return JSON.stringify({ error: 'booking_failed', success: false, message: errMsg })
  }
}

async function handleAddToWaitlist(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, phone, name, booking_checklist, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID
    await supabaseAdmin.from('sms_conversations').update({
      outcome: 'waitlisted', updated_at: new Date().toISOString(),
      summary: `Waitlisted for ${input.preferred_date}${input.preferred_time ? ' ' + input.preferred_time : ''}`,
    }).eq('id', conversationId).eq('tenant_id', tid)
    await notify({ type: 'waitlist', title: 'New Waitlist', message: `${convo?.name || convo?.phone || 'Client'} waitlisted for ${input.preferred_date}` }).catch(() => {})
    return JSON.stringify({ success: true })
  } catch (err) {
    await yinezError('add_to_waitlist', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

async function handleGetQuote(input: Record<string, unknown>): Promise<string> {
  const serviceType = (input.service_type as string) || 'regular'
  const bedrooms = (input.bedrooms as number) ?? 1
  const bathrooms = (input.bathrooms as number) ?? 1

  // Single-number quote — matches the duration we'd actually book. No ranges to clients.
  const regularHrs: Record<string, number> = {
    '0-1': 2.5, '1-1': 2.5, '2-1': 3, '2-2': 3.5, '3-2': 4, '3-3': 5,
  }
  const key = `${bedrooms}-${bathrooms}`
  let hours = regularHrs[key] ?? 3
  if (serviceType === 'deep' || serviceType === 'move_in_out') {
    hours = hours + 1.5
  }

  return JSON.stringify({
    service_type: serviceType, bedrooms, bathrooms,
    estimated_hours: hours,
    rates: { client_supplies: '$59/hr', full_service: '$69/hr', emergency: '$89/hr', recurring_full_service: '$69/hr → 20% off weekly, 10% off biweekly/monthly (after first visit)', recurring_client_supplies: '$59/hr → 10% off weekly, 5% off biweekly/monthly (after first visit)' },
    message: `${bedrooms}BR/${bathrooms}BA ${serviceType} typically runs ${hours} hours.`,
  })
}

async function handleGetAccount(conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    const { data: client } = await supabaseAdmin.from('clients').select('name, email, phone, address, pin, created_at').eq('id', convo.client_id).eq('tenant_id', tid).single()
    const { data: upcoming } = await supabaseAdmin.from('bookings')
      .select('id, start_time, status, service_type, hourly_rate, payment_status, cleaners(name)')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).in('status', ['pending', 'scheduled', 'confirmed', 'in_progress'])
      .gte('start_time', new Date().toISOString()).order('start_time').limit(5)
    const { data: payments } = await supabaseAdmin.from('payments')
      .select('amount, tip, method, created_at').eq('tenant_id', tid).eq('client_id', convo.client_id)
      .order('created_at', { ascending: false }).limit(5)
    const { data: memories } = await supabaseAdmin.from('yinez_memory')
      .select('type, content').eq('tenant_id', tid).eq('client_id', convo.client_id).limit(10)
    const { data: recurring } = await supabaseAdmin.from('recurring_schedules')
      .select('id, recurring_type, day_of_week, preferred_time, status, cleaners(name)')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).eq('status', 'active')

    return JSON.stringify({
      client: { name: client?.name, email: client?.email, phone: client?.phone, address: client?.address, member_since: client?.created_at?.split('T')[0] },
      upcoming: (upcoming || []).map(b => ({
        id: b.id, date: b.start_time?.split('T')[0],
        time: b.start_time ? new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null,
        status: b.status, service: b.service_type, rate: b.hourly_rate,
        payment: b.payment_status, cleaner: (b.cleaners as unknown as { name: string })?.name || 'TBD',
      })),
      recent_payments: (payments || []).map(p => ({ amount: `$${(p.amount / 100).toFixed(0)}`, tip: p.tip ? `$${(p.tip / 100).toFixed(0)}` : null, method: p.method, date: p.created_at?.split('T')[0] })),
      recurring: (recurring || []).map(r => ({ id: r.id, type: r.recurring_type, day: r.day_of_week, time: r.preferred_time, cleaner: (r.cleaners as unknown as { name: string })?.name || 'TBD' })),
      preferences: (memories || []).map(m => m.content),
    })
  } catch (err) {
    await yinezError('get_account', err, conversationId)
    return JSON.stringify({ error: 'Failed to load account' })
  }
}

async function handleUpdateAccount(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const field = input.field as string
    const value = input.value as string
    const allowed = ['address', 'email', 'phone', 'name']
    if (!allowed.includes(field)) return JSON.stringify({ error: `Cannot update ${field}` })
    // Address changes ADD a property (set primary) — never overwrite the old one,
    // so history is preserved and other properties aren't clobbered.
    if (field === 'address') {
      const { addProperty } = await import('@/lib/client-properties')
      const prop = await addProperty(convo.client_id, value, { makePrimary: true, actor: { changedBy: 'agent', actorId: 'yinez', source: 'api' } })
      if (!prop) return JSON.stringify({ error: 'Failed to add address' })
      return JSON.stringify({ success: true, message: `Address added and set as primary: ${value}` })
    }
    await supabaseAdmin.from('clients').update({ [field]: value }).eq('id', convo.client_id).eq('tenant_id', tid)
    return JSON.stringify({ success: true, message: `${field} updated to ${value}` })
  } catch (err) {
    await yinezError('update_account', err, conversationId)
    return JSON.stringify({ error: 'Failed to update' })
  }
}

async function handleSendPin(conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, phone, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const { data: client } = await supabaseAdmin.from('clients').select('id, pin, name, phone').eq('id', convo.client_id).eq('tenant_id', tid).single()
    if (!client) return JSON.stringify({ error: 'Client not found' })

    // Validate PIN is 6 digits — regenerate if not
    let pin = client.pin
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      pin = Math.floor(100000 + Math.random() * 900000).toString()
      await supabaseAdmin.from('clients').update({ pin }).eq('id', client.id).eq('tenant_id', tid)
    }

    const phone = client.phone || convo.phone
    if (phone) {
      await sendSMS(phone, `Hi ${client.name || 'there'}! Your portal PIN is: ${pin}\n\nLog in at thenycmaid.com/portal 😊`, { skipConsent: true, smsType: 'pin_reminder' })
    }
    return JSON.stringify({ success: true, message: `PIN sent to ${phone}` })
  } catch (err) {
    await yinezError('send_pin', err, conversationId)
    return JSON.stringify({ error: 'Failed to send PIN' })
  }
}

async function handleResendConfirmation(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    let bookingId = input.booking_id as string | undefined
    if (!bookingId) {
      const { data: next } = await supabaseAdmin.from('bookings')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id)
        .in('status', ['pending', 'scheduled']).gte('start_time', new Date().toISOString())
        .order('start_time').limit(1).single()
      bookingId = next?.id
    }
    if (!bookingId) return JSON.stringify({ error: 'No upcoming booking found' })

    const { data: booking } = await supabaseAdmin.from('bookings')
      .select('client_id, start_time, service_type, hourly_rate, clients(name, email, pin), cleaners(name)')
      .eq('id', bookingId).eq('tenant_id', tid).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: booking_id is caller-supplied. A same-tenant fetch alone lets a
    // client read/resend another client's confirmation; require the booking to be the caller's.
    if (booking.client_id !== convo.client_id) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })

    const client = booking.clients as unknown as { name: string; email: string; pin: string }
    if (!client?.email) return JSON.stringify({ error: 'No email on file' })

    const cleaner = booking.cleaners as unknown as { name: string }
    const date = new Date(booking.start_time).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' })
    const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })

    const html = emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1a1a1a">Booking Confirmation</h2>
      <p style="margin:0 0 16px;font-size:15px;color:#333">Hi ${client.name}! Your cleaning is confirmed:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#f9fafb;border-radius:8px">
        <tr><td style="padding:16px">
          <p style="margin:0 0 8px;font-size:14px;color:#666">Date: <strong>${date}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#666">Time: <strong>${time}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#666">Service: <strong>${booking.service_type}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#666">Rate: <strong>$${booking.hourly_rate}/hr</strong></p>
          ${cleaner ? `<p style="margin:0 0 8px;font-size:14px;color:#666">Cleaner: <strong>${cleaner.name}</strong></p>` : ''}
          ${client.pin ? `<p style="margin:0;font-size:14px;color:#666">Portal PIN: <strong>${client.pin}</strong></p>` : ''}
        </td></tr>
      </table>
    `)

    await sendEmail(client.email, `Booking Confirmed — ${date} — The NYC Maid`, html)
    return JSON.stringify({ success: true, message: `Confirmation resent to ${client.email}` })
  } catch (err) {
    await yinezError('resend_confirmation', err, conversationId)
    return JSON.stringify({ error: 'Failed to resend' })
  }
}

async function handleCheckPayment(conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const { data: unpaid } = await supabaseAdmin.from('bookings')
      .select('id, start_time, price, hourly_rate, actual_hours, payment_status, service_type')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).in('status', ['completed', 'checked_in', 'in_progress', 'scheduled'])
      .neq('payment_status', 'paid').order('start_time', { ascending: false }).limit(5)
    const { data: payments } = await supabaseAdmin.from('payments')
      .select('amount, tip, method, created_at').eq('tenant_id', tid).eq('client_id', convo.client_id)
      .order('created_at', { ascending: false }).limit(5)
    return JSON.stringify({
      outstanding: (unpaid || []).map(b => ({ date: b.start_time?.split('T')[0], amount: b.price ? `$${(b.price / 100).toFixed(0)}` : 'TBD', status: b.payment_status })),
      recent_payments: (payments || []).map(p => ({ amount: `$${(p.amount / 100).toFixed(0)}`, tip: p.tip ? `$${(p.tip / 100).toFixed(0)}` : null, method: p.method, date: p.created_at?.split('T')[0] })),
    })
  } catch (err) {
    await yinezError('check_payment', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleConfirmPayment(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const method = (input.method as string) || 'zelle'
    const senderName = (input.sender_name as string)?.trim() || null
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    const { data: booking } = await supabaseAdmin.from('bookings')
      .select('id, cleaner_id, start_time, clients(name), cleaners(name, phone, sms_consent)')
      .eq('tenant_id', tid).eq('client_id', convo.client_id)
      .neq('payment_status', 'paid').not('fifteen_min_alert_time', 'is', null)
      .order('start_time', { ascending: false }).limit(1).single()

    // Mark the booking as "client-claimed". payment_method here is provisional —
    // processPayment overwrites it with the verified method on email/Stripe match.
    // Crons check payment_method to know whether the client has already claimed
    // (so we don't nudge them after they've replied "paid").
    if (booking) {
      const updates: Record<string, unknown> = { payment_method: method }
      if (senderName) updates.payment_sender_name = senderName
      await supabaseAdmin.from('bookings').update(updates).eq('id', booking.id).eq('tenant_id', tid)
    }

    // Trigger immediate email monitor (Zelle/Venmo verification path).
    // Public domain only — Vercel deployment URLs are 401'd by deployment protection.
    const monitorKey = process.env.ELCHAPO_MONITOR_KEY?.replace(/\\n/g, '')
    if (monitorKey) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://www.thenycmaid.com'
      fetch(`${baseUrl}/api/email/monitor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: monitorKey }) }).catch(() => {})
    }

    if (booking) {
      const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
      const senderLine = senderName ? ` Payer: ${senderName}.` : ''

      // Do NOT fire cleaner SMS here — that fires only after the actual money is
      // verified (email match in payment-processor.ts, or Stripe webhook).
      // We only acknowledge the client claim + tell admin we're verifying.
      const verifyVia = method === 'card' || method === 'stripe' ? 'Stripe webhook' : 'email monitor'
      await notify({ type: 'payment_claimed', title: `${clientName} says paid (${method})`, message: `${clientName} claims ${method} payment.${senderLine} Verifying via ${verifyVia} — cleaner NOT released yet.`, booking_id: booking.id }).catch(() => {})
    }
    return JSON.stringify({ success: true, method, sender_name: senderName })
  } catch (err) {
    await yinezError('confirm_payment', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

async function handleGetInvoice(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    const { data: client } = await supabaseAdmin.from('clients').select('name, email').eq('id', convo.client_id).eq('tenant_id', tid).single()
    if (!client?.email) return JSON.stringify({ error: 'No email on file — ask client for email first' })

    const { data: payment } = await supabaseAdmin.from('payments')
      .select('amount, tip, method, created_at, booking_id').eq('tenant_id', tid).eq('client_id', convo.client_id)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!payment) return JSON.stringify({ error: 'No payments found' })

    const total = (payment.amount / 100).toFixed(2)
    const tip = payment.tip ? (payment.tip / 100).toFixed(2) : '0.00'
    const service = ((payment.amount - (payment.tip || 0)) / 100).toFixed(2)

    const html = emailWrapper(`
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1a1a1a">Payment Receipt</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#f9fafb;border-radius:8px">
        <tr><td style="padding:16px">
          <p style="margin:0 0 8px;font-size:14px;color:#666">Date: <strong>${payment.created_at?.split('T')[0]}</strong></p>
          <p style="margin:0 0 8px;font-size:14px;color:#666">Service: <strong>$${service}</strong></p>
          ${Number(tip) > 0 ? `<p style="margin:0 0 8px;font-size:14px;color:#666">Tip: <strong>$${tip}</strong></p>` : ''}
          <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a">Total: $${total}</p>
          <p style="margin:0;font-size:14px;color:#666">Method: <strong>${payment.method}</strong></p>
        </td></tr>
      </table>
      <p style="margin:0;font-size:13px;color:#999">The NYC Maid — thenycmaid.com</p>
    `)

    await sendEmail(client.email, `Payment Receipt — $${total} — The NYC Maid`, html)
    return JSON.stringify({ success: true, message: `Receipt sent to ${client.email}` })
  } catch (err) {
    await yinezError('get_invoice', err, conversationId)
    return JSON.stringify({ error: 'Failed to send receipt' })
  }
}

async function handleLookupBookings(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID
    const filter = (input.status_filter as string) || 'upcoming'
    const now = new Date().toISOString()
    let query = supabaseAdmin.from('bookings')
      .select('id, start_time, end_time, status, service_type, hourly_rate, price, payment_status, cleaners(name), actual_hours, recurring_type')
      .eq('tenant_id', tid).eq('client_id', convo.client_id).order('start_time', { ascending: filter === 'upcoming' }).limit(5)
    if (filter === 'upcoming') query = query.gte('start_time', now).in('status', ['pending', 'scheduled', 'confirmed', 'in_progress', 'checked_in'])
    else if (filter === 'completed') query = query.eq('status', 'completed').order('start_time', { ascending: false })
    const { data: bookings } = await query
    if (!bookings?.length) return JSON.stringify({ bookings: [], message: 'No bookings found.' })
    return JSON.stringify({ bookings: bookings.map(b => ({
      id: b.id, date: b.start_time?.split('T')[0],
      time: b.start_time ? new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null,
      status: b.status, service: b.service_type, rate: b.hourly_rate,
      price: b.price ? `$${(b.price / 100).toFixed(0)}` : null,
      payment: b.payment_status, cleaner: (b.cleaners as unknown as { name: string })?.name || 'TBD',
      recurring: b.recurring_type !== 'one_time' ? b.recurring_type : null,
    }))})
  } catch (err) {
    await yinezError('lookup_bookings', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleRescheduleBooking(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const bookingId = input.booking_id as string
    // Cross-tenant trust boundary: resolve tenant + client from the CONVERSATION,
    // never from the fetched booking row. Deriving tid from the row let a caller
    // in tenant A reschedule tenant B's booking by supplying B's booking_id.
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID
    const callerClientId = (convo as { client_id?: string } | null)?.client_id
    if (!callerClientId) return JSON.stringify({ error: 'no_account', message: 'No client account on this conversation.' })
    // Scope the fetch to the caller's tenant so a foreign booking_id resolves to nothing.
    const { data: booking } = await supabaseAdmin.from('bookings').select('id, start_time, recurring_type, client_id, tenant_id').eq('id', bookingId).eq('tenant_id', tid).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: the booking must belong to the caller, not merely to their tenant.
    if (booking.client_id !== callerClientId) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })
    if (booking.recurring_type === 'one_time' || !booking.recurring_type) return JSON.stringify({ error: 'policy_violation', message: 'First-time and one-time bookings cannot be rescheduled.' })
    const daysUntil = Math.ceil((new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 7) return JSON.stringify({ error: 'policy_violation', message: `Booking is in ${daysUntil} days. Need 7 days notice.` })
    const parsed = parseTime(input.new_time as string)
    if (!parsed) return JSON.stringify({ error: 'Invalid time' })
    const newStart = `${input.new_date}T${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    const newEnd = `${input.new_date}T${(parsed.hours + 2).toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    await supabaseAdmin.from('bookings').update({ start_time: newStart, end_time: newEnd, notes: `Rescheduled via Yinez from ${booking.start_time.split('T')[0]}` }).eq('id', bookingId).eq('tenant_id', tid)
    return JSON.stringify({ success: true, message: `Rescheduled to ${input.new_date} at ${input.new_time}.` })
  } catch (err) {
    await yinezError('reschedule_booking', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleCancelBooking(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const bookingId = input.booking_id as string
    const reason = (input.reason as string) || 'Client requested'
    // Cross-tenant trust boundary: resolve tenant + client from the CONVERSATION,
    // never from the fetched booking row (see handleRescheduleBooking).
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID
    const callerClientId = (convo as { client_id?: string } | null)?.client_id
    if (!callerClientId) return JSON.stringify({ error: 'no_account', message: 'No client account on this conversation.' })
    // Scope the fetch to the caller's tenant so a foreign booking_id resolves to nothing.
    const { data: booking } = await supabaseAdmin.from('bookings').select('id, start_time, recurring_type, client_id, clients(name), tenant_id').eq('id', bookingId).eq('tenant_id', tid).single()
    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: the booking must belong to the caller, not merely to their tenant.
    if (booking.client_id !== callerClientId) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })
    if (booking.recurring_type === 'one_time' || !booking.recurring_type) return JSON.stringify({ error: 'policy_violation', message: 'First-time bookings cannot be cancelled.' })
    const daysUntil = Math.ceil((new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 7) return JSON.stringify({ error: 'policy_violation', message: `Booking is in ${daysUntil} days. Need 7 days notice.` })
    await supabaseAdmin.from('bookings').update({ status: 'cancelled', notes: `Cancelled via Yinez: ${reason}` }).eq('id', bookingId).eq('tenant_id', tid)
    const clientName = (booking.clients as unknown as { name: string })?.name || 'Client'
    await notify({ type: 'booking_cancelled', title: `Cancelled — ${clientName}`, message: `${clientName} cancelled ${booking.start_time.split('T')[0]} via SMS. Reason: ${reason}`, booking_id: bookingId }).catch(() => {})
    return JSON.stringify({ success: true })
  } catch (err) {
    await yinezError('cancel_booking', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleManageRecurring(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const action = input.action as string
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    // Find their active recurring schedule
    let scheduleId = input.schedule_id as string | undefined
    if (!scheduleId) {
      const { data: schedule } = await supabaseAdmin.from('recurring_schedules')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id).eq('status', 'active').limit(1).single()
      scheduleId = schedule?.id
    }
    if (!scheduleId) return JSON.stringify({ error: 'No active recurring schedule found' })

    if (action === 'pause') {
      const pauseUntil = input.pause_until as string
      await supabaseAdmin.from('recurring_schedules').update({ status: 'paused', paused_until: pauseUntil || null }).eq('id', scheduleId).eq('tenant_id', tid)
      return JSON.stringify({ success: true, message: `Recurring paused${pauseUntil ? ` until ${pauseUntil}` : ''}` })
    }
    if (action === 'resume') {
      await supabaseAdmin.from('recurring_schedules').update({ status: 'active', paused_until: null }).eq('id', scheduleId).eq('tenant_id', tid)
      return JSON.stringify({ success: true, message: 'Recurring resumed' })
    }
    if (action === 'cancel') {
      await supabaseAdmin.from('recurring_schedules').update({ status: 'cancelled' }).eq('id', scheduleId).eq('tenant_id', tid)
      await notify({ type: 'recurring_cancelled', title: 'Recurring Cancelled', message: `Client cancelled recurring schedule via SMS` }).catch(() => {})
      return JSON.stringify({ success: true, message: 'Recurring schedule cancelled' })
    }
    return JSON.stringify({ error: `Unknown action: ${action}` })
  } catch (err) {
    await yinezError('manage_recurring', err, conversationId)
    return JSON.stringify({ error: 'Failed' })
  }
}

async function handleReportIssue(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const description = input.description as string
    const severity = (input.severity as string) || 'medium'
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, name, phone, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID

    await supabaseAdmin.from('yinez_memory').insert({
      tenant_id: tid, client_id: convo?.client_id || null, type: 'issue', content: description, source: 'yinez',
    })

    await notify({
      type: 'client_issue', title: `Issue — ${convo?.name || convo?.phone || 'Client'} (${severity})`,
      message: `${convo?.name || 'Client'} reported: ${description}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Issue logged and team notified' })
  } catch (err) {
    await yinezError('report_issue', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

async function handleRequestCallback(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const reason = (input.reason as string) || 'Client requested callback'
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, name, phone, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID

    // Get last few messages for context
    const { data: msgs } = await supabaseAdmin.from('sms_conversation_messages')
      .select('direction, message').eq('tenant_id', tid).eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }).limit(10)
    const context = (msgs || []).reverse().map(m => `${m.direction === 'inbound' ? 'Client' : 'Yinez'}: ${m.message}`).join('\n')

    // Lock the conversation for 24h. While locked, the Telnyx webhook
    // short-circuits every inbound with a canned "owner is on this" ack and
    // routes the message to Telegram instead of any flow or Yinez. Released
    // when an admin clears it in the UI (or after expiry).
    const lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await supabaseAdmin
      .from('sms_conversations')
      .update({ escalation_locked_until: lockUntil })
      .eq('id', conversationId)
      .eq('tenant_id', tid)
      .then(() => {}, () => {})

    await notify({
      type: 'callback_requested',
      title: `Callback — ${convo?.name || convo?.phone || 'Client'}`,
      message: `${convo?.name || 'Client'} wants a callback. Phone: ${convo?.phone}\nReason: ${reason}\n\nContext:\n${context}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Team notified — they will call within 15 minutes' })
  } catch (err) {
    await yinezError('request_callback', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

export async function handleBookingDetails(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No account found' })
    const tid = (convo as { tenant_id?: string }).tenant_id || NYCMAID_TENANT_ID

    let bookingId = input.booking_id as string | undefined
    if (!bookingId) {
      // Get most recent completed or in-progress booking
      const { data: recent } = await supabaseAdmin.from('bookings')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id)
        .in('status', ['completed', 'in_progress', 'checked_in'])
        .order('start_time', { ascending: false }).limit(1).single()
      bookingId = recent?.id
    }
    if (!bookingId) {
      // Try any booking
      const { data: any } = await supabaseAdmin.from('bookings')
        .select('id').eq('tenant_id', tid).eq('client_id', convo.client_id)
        .order('start_time', { ascending: false }).limit(1).single()
      bookingId = any?.id
    }
    if (!bookingId) return JSON.stringify({ error: 'No bookings found for this client' })

    const { data: booking } = await supabaseAdmin.from('bookings')
      .select('id, client_id, start_time, end_time, check_in_time, check_out_time, check_in_location, check_out_location, actual_hours, hourly_rate, price, cleaner_pay, payment_status, payment_method, status, service_type, cleaners(name), clients(name, address), client_properties(address)')
      .eq('id', bookingId).eq('tenant_id', tid).single()

    if (!booking) return JSON.stringify({ error: 'Booking not found' })
    // Client-ownership: booking_id is caller-supplied. A same-tenant fetch alone lets a
    // client read another client's booking details; require the booking to be the caller's.
    if (booking.client_id !== convo.client_id) return JSON.stringify({ error: 'not_your_booking', message: 'That booking is not on your account.' })

    // Show the booking's property address (multi-address parity) — overlays the
    // per-booking property onto the client display before we read it.
    const { applyPropertyToBookingClient } = await import('@/lib/client-properties')
    applyPropertyToBookingClient(booking as Parameters<typeof applyPropertyToBookingClient>[0])

    const client = booking.clients as unknown as { name: string; address: string } | null
    const cleaner = booking.cleaners as unknown as { name: string } | null

    // Calculate times
    const formatTime = (t: string | null) => {
      if (!t) return null
      return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
    }

    const checkInTime = formatTime(booking.check_in_time)
    const checkOutTime = formatTime(booking.check_out_time)

    // Calculate actual duration from check-in/out
    // Rule: after 10 minutes past a 30-min mark, rounds up to next 30 minutes
    let calculatedHours: number | null = null
    let rawMinutes: number | null = null
    if (booking.check_in_time && booking.check_out_time) {
      const diffMs = new Date(booking.check_out_time).getTime() - new Date(booking.check_in_time).getTime()
      rawMinutes = Math.round(diffMs / (1000 * 60))
      const fullHalfHours = Math.floor(rawMinutes / 30)
      const remainder = rawMinutes % 30
      // If past 10 min into the next 30-min block, round up
      calculatedHours = remainder > 10 ? (fullHalfHours + 1) * 0.5 : fullHalfHours * 0.5
    }

    const hours = booking.actual_hours || calculatedHours || null
    const rate = booking.hourly_rate || 69
    const total = hours ? Math.round(hours * rate) : null

    // Parse check-in location
    let checkInLocation = ''
    if (booking.check_in_location) {
      try {
        const loc = typeof booking.check_in_location === 'string' ? JSON.parse(booking.check_in_location) : booking.check_in_location
        if (loc.latitude && loc.longitude) {
          checkInLocation = `GPS: ${Number(loc.latitude).toFixed(6)}, ${Number(loc.longitude).toFixed(6)}`
          if (loc.address) checkInLocation = loc.address
        }
      } catch {}
    }

    let checkOutLocation = ''
    if (booking.check_out_location) {
      try {
        const loc = typeof booking.check_out_location === 'string' ? JSON.parse(booking.check_out_location) : booking.check_out_location
        if (loc.latitude && loc.longitude) {
          checkOutLocation = `GPS: ${Number(loc.latitude).toFixed(6)}, ${Number(loc.longitude).toFixed(6)}`
          if (loc.address) checkOutLocation = loc.address
        }
      } catch {}
    }

    // Get payment records
    const { data: payments } = await supabaseAdmin.from('payments')
      .select('amount, tip, method, created_at')
      .eq('tenant_id', tid)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(3)

    return JSON.stringify({
      booking_id: bookingId,
      date: booking.start_time?.split('T')[0],
      scheduled_time: formatTime(booking.start_time),
      service_type: booking.service_type,
      status: booking.status,
      cleaner: cleaner?.name || 'unassigned',
      client_address: client?.address || 'not on file',
      check_in: {
        time: checkInTime,
        location: checkInLocation || 'not recorded',
        raw: booking.check_in_time,
      },
      check_out: {
        time: checkOutTime,
        location: checkOutLocation || 'not recorded',
        raw: booking.check_out_time,
      },
      hours: {
        raw_minutes: rawMinutes,
        billed_hours: hours,
        calculated_hours: calculatedHours,
        rounding_rule: 'After 10 minutes past a 30-min mark, rounds up to the next 30 minutes',
        explanation: rawMinutes ? `${rawMinutes} minutes total. ${rawMinutes % 30 > 10 ? `${rawMinutes % 30} min past the half hour → rounded up to ${hours} hours` : `${rawMinutes % 30} min into the half hour → stays at ${hours} hours`}` : null,
      },
      rate_per_hour: rate,
      total: total ? `$${total}` : 'not calculated',
      math: hours ? `${hours} hours × $${rate}/hr = $${total}` : 'check-in/out times needed for calculation',
      payment: {
        status: booking.payment_status,
        method: booking.payment_method,
        records: (payments || []).map(p => ({
          amount: `$${(p.amount / 100).toFixed(2)}`,
          tip: p.tip ? `$${(p.tip / 100).toFixed(2)}` : null,
          method: p.method,
          date: p.created_at?.split('T')[0],
        })),
      },
    })
  } catch (err) {
    await yinezError('booking_details', err, conversationId)
    return JSON.stringify({ error: 'Failed to load booking details' })
  }
}

async function handleRemember(input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    // Whitelist memory types so Yinez can't invent types that won't surface in any context
    // query (loadContext only pulls type IN ('lesson','rule','instruction') for globals,
    // so a typo'd "fact" would silently never appear). Map unknown types to 'observation'.
    const PER_CLIENT = ['preference', 'observation', 'issue', 'payment', 'instruction']
    const GLOBAL = ['lesson', 'rule', 'instruction']
    const ALL = new Set([...PER_CLIENT, ...GLOBAL])
    let type = (input.type as string) || 'observation'
    if (!ALL.has(type)) {
      // Coerce instead of rejecting — Yinez occasionally invents a synonym; prefer to
      // accept the data and normalize than to throw and lose the lesson.
      type = 'observation'
    }
    const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
    const tid = (convo as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID
    await supabaseAdmin.from('yinez_memory').insert({
      tenant_id: tid,
      client_id: convo?.client_id || null,
      type,
      content: input.content as string,
      source: 'yinez',
    })
    return JSON.stringify({ success: true, type })
  } catch (err) {
    await yinezError('remember', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

// Route tool call to handler. tenantId optional during the Phase 3.2 sweep —
// every handler signature gets it next, but for now we accept and ignore so
// the dispatcher signature lines up with the runTool caller.
export async function handleTool(name: string, input: Record<string, unknown>, conversationId: string, result: YinezResult, _tenantId?: string): Promise<string> {
  switch (name) {
    case 'create_booking': return handleCreateBooking(input, conversationId, result)
    case 'add_to_waitlist': return handleAddToWaitlist(input, conversationId)
    case 'get_quote': return handleGetQuote(input)
    case 'get_account': return handleGetAccount(conversationId)
    case 'update_account': return handleUpdateAccount(input, conversationId)
    case 'send_pin': return handleSendPin(conversationId)
    case 'resend_confirmation': return handleResendConfirmation(input, conversationId)
    case 'check_payment': return handleCheckPayment(conversationId)
    case 'confirm_payment': return handleConfirmPayment(input, conversationId)
    case 'get_invoice': return handleGetInvoice(input, conversationId)
    case 'lookup_bookings': return handleLookupBookings(input, conversationId)
    case 'reschedule_booking': return handleRescheduleBooking(input, conversationId)
    case 'cancel_booking': return handleCancelBooking(input, conversationId)
    case 'manage_recurring': return handleManageRecurring(input, conversationId)
    case 'booking_details': return handleBookingDetails(input, conversationId)
    case 'report_issue': return handleReportIssue(input, conversationId)
    case 'request_callback': return handleRequestCallback(input, conversationId)
    case 'remember': return handleRemember(input, conversationId)
    default: return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ─── Client Profile ─────────────────────────────────────────────────────────

export async function getClientProfile(phone: string, tenantId?: string): Promise<string> {
  try {
    const tid = tenantId || NYCMAID_TENANT_ID
    const lookupPhone = phone.replace(/\D/g, '').slice(-10)
    const { data: client } = await supabaseAdmin.from('clients')
      .select('id, name, email, phone, address, notes, active, do_not_service, created_at')
      .eq('tenant_id', tid)
      .ilike('phone', `%${lookupPhone}%`).limit(1).single()
    if (!client) return JSON.stringify({ error: 'Client not found' })

    const { data: recentBookings } = await supabaseAdmin.from('bookings')
      .select('id, start_time, service_type, price, hourly_rate, status, payment_status, cleaners(name)')
      .eq('tenant_id', tid).eq('client_id', client.id).in('status', ['completed', 'scheduled', 'in_progress', 'pending'])
      .order('start_time', { ascending: false }).limit(5)

    const { count: totalBookings } = await supabaseAdmin.from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid).eq('client_id', client.id).in('status', ['completed', 'scheduled', 'in_progress'])

    let preferredCleaner: string | null = null
    const { data: completedBookings } = await supabaseAdmin.from('bookings')
      .select('cleaners(name)').eq('tenant_id', tid).eq('client_id', client.id).eq('status', 'completed')
    if (completedBookings && completedBookings.length > 0) {
      const counts: Record<string, number> = {}
      for (const b of completedBookings) {
        const n = (b.cleaners as unknown as { name: string })?.name
        if (n) counts[n] = (counts[n] || 0) + 1
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) preferredCleaner = sorted[0][0]
    }

    const { data: memories } = await supabaseAdmin.from('yinez_memory')
      .select('type, content, created_at').eq('tenant_id', tid).eq('client_id', client.id)
      .order('created_at', { ascending: false }).limit(20)

    const upcoming = (recentBookings || [])
      .filter(b => ['scheduled', 'pending', 'in_progress'].includes(b.status))
      .map(b => ({
        booking_id: b.id, date: b.start_time?.split('T')[0],
        time: b.start_time ? new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null,
        service_type: b.service_type, cleaner: (b.cleaners as unknown as { name: string })?.name || 'unassigned',
        hourly_rate: b.hourly_rate, status: b.status, payment_status: b.payment_status,
      }))

    return JSON.stringify({
      name: client.name, address: client.address, email: client.email,
      notes: client.notes, active: client.active, do_not_service: client.do_not_service,
      total_bookings: totalBookings || 0, preferred_cleaner: preferredCleaner,
      last_rate: recentBookings?.[0]?.hourly_rate || null,
      upcoming,
      recent_bookings: (recentBookings || []).map(b => ({
        date: b.start_time?.split('T')[0], service_type: b.service_type,
        cleaner: (b.cleaners as unknown as { name: string })?.name || 'unassigned',
        hourly_rate: b.hourly_rate, status: b.status, payment_status: b.payment_status,
      })),
      memories: (memories || []).map(m => ({ type: m.type, content: m.content })),
    })
  } catch (err) {
    await yinezError('getClientProfile', err)
    return JSON.stringify({ error: 'Failed to fetch profile' })
  }
}

// ─── Context Builders ───────────────────────────────────────────────────────

export function buildCalendarContext(): string {
  const now = new Date()
  const fullDate = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
  const currentHour = parseInt(now.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }))
  const afterHours = currentHour >= 21 || currentHour < 7
  const timeNote = afterHours ? '\nAfter hours. Be brief.' : ''

  const days: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    days.push(`${d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'short', day: 'numeric' })} = ${d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })}`)
  }

  return `\n\nToday: ${fullDate}. Time: ${currentTime} ET.${timeNote}\nCALENDAR:\n${days.join('\n')}`
}

// ─── Deterministic Non-Booking Responses ─────────────────────────────────
// Hardcoded answers for casuals/questions/etc — Yinez keeps working without Claude credits

export function generateNonBookingResponse(intent: Intent, message: string, cl: BookingChecklist): string | null {
  // Only intercept when not in active booking flow
  if (cl.status === 'recap' || cl.status === 'confirmed') return null

  const text = message.trim()
  const lower = text.toLowerCase().replace(/[.!,?]+$/g, '').trim()

  // CASUAL — short greetings, thanks, emojis
  if (intent === 'casual') {
    if (/^(?:ok\s+|okay\s+|got\s+it\s+|cool\s+|great\s+)?(thanks?|thank you|thx|ty|tnx|tanks?|trank|appreciate it|appreciate you)/i.test(lower)) {
      return 'You are welcome 😊'
    }
    if (/^(bye|goodbye|see you|see ya|take care|talk soon|peace|later|catch you later)/i.test(lower)) {
      return 'Take care! 😊'
    }
    if (/^(good night|gn|night|nighty)/i.test(lower)) {
      return 'Good night! 😊'
    }
    if (/^good morning/i.test(lower)) {
      return 'Good morning! How can we help today?'
    }
    if (/^good (afternoon|evening)/i.test(lower)) {
      return `Good ${RegExp.$1}! How can we help today?`
    }
    if (/^(hola|buenos dias|buenas tardes|buenas noches)/i.test(lower)) {
      return '¡Hola! ¿En qué le podemos ayudar? 😊'
    }
    if (/^(hi|hey|hello|yo|sup|what'?s up|wassup|hi there|hey there)/i.test(lower)) {
      return 'Hi there! How can we help today? 😊'
    }
    if (/^[^a-z0-9]+$/i.test(text) || /^(👍|🙏|❤️|❤|🙂|😊)+$/.test(text)) {
      return '😊'
    }
    if (/^(ok|okay|sounds good|perfect|great|cool|awesome|sure|got it|yep|nope|word|bet|facts|aight|k|ya)/i.test(lower)) {
      return 'Sounds good! 😊'
    }
    if (/^(merry christmas|happy new year|happy easter|happy thanksgiving|happy holidays)/i.test(lower)) {
      return `${text}! 🎉`
    }
    return 'Got it! Let us know if you need anything 😊'
  }

  // NOT_INTERESTED
  if (intent === 'not_interested') {
    if (/\b(?:hire|hiring|work|job|cleaner|i (?:offer|provide|do|am a) clean)/i.test(lower)) {
      return "Thanks for reaching out! We're not hiring right now but we'll keep you in mind."
    }
    return "No worries at all! We're here whenever you need us 😊"
  }

  // HUMAN REQUEST
  if (intent === 'human_request') {
    return 'Let me have someone call you — give us just a few minutes 😊 You can also text or call us at (212) 202-8400.'
  }

  // SCHEDULE_CHANGE / CLEANER_REQUEST / DISPUTE / FEEDBACK_NEGATIVE / ACCOUNT_HELP / REFERRAL
  // — these need data lookups (Claude or DB queries). Light deterministic fallback so users don't see the error message.
  if (intent === 'schedule_change') {
    return "I'll need to look that up. We hold first-time bookings firm — recurring clients can reschedule with 7 days notice. Text or call (212) 202-8400 and we'll handle it 😊"
  }
  if (intent === 'cleaner_request') {
    // Extract cleaner name if mentioned
    const cleanerMatch = text.match(/\b(Maria|Gloria|Karina|Martha|Eunice|Katrina)\b/i)
    if (cleanerMatch) {
      const name = cleanerMatch[1].charAt(0).toUpperCase() + cleanerMatch[1].slice(1).toLowerCase()
      return `We'll check ${name}'s availability for your requested day. Call (212) 202-8400 to confirm, or we'll text you back 😊`
    }
    return "Got it — we'll check to request the same cleaner. Call (212) 202-8400 to confirm availability 😊"
  }
  if (intent === 'dispute') {
    // Refund demand — never invent a refund
    if (/\b(?:refund(?:ed)?|money back|give me (?:my )?money)\b/i.test(lower)) {
      return "I hear you. I can't process a refund without our manager reviewing the records, GPS check-in/check-out times, and invoice. She'll reach out today — or call (212) 202-8400 to speak with her directly."
    }
    // Chargeback threat
    if (/\b(?:chargeback|charge ?back|dispute (?:this )?(?:with|to) (?:my )?(?:bank|card|cc))\b/i.test(lower)) {
      return "I understand you're frustrated. Before you go that route — let our manager review the GPS check-in/check-out records and invoice with you. Call (212) 202-8400. We document every visit and share all records if it's disputed, but we'd much rather work it out directly."
    }
    // Discount / partial-pay / counter-offer demands
    if (/\b(?:discount|take \$?\d+ off|\$?\d+ off|half off|knock.*off|mark (?:it )?down|i(?:'ll| will)? (?:only )?pay \$?\d+|pay \$?\d+ total)\b/i.test(lower)) {
      return "I can't adjust pricing on my own — our manager handles any billing review. Call (212) 202-8400 and she'll pull the records with you today."
    }
    // Cancel payment / need more time / split
    if (/\b(?:cancel (?:my |the )?payment|need more time to pay|want more time to pay|split (?:the |my )?bill)\b/i.test(lower)) {
      return "I understand — our manager handles payment arrangements. Call (212) 202-8400 today and she'll work something out with you."
    }
    // Not authorized
    if (/\b(?:never authorized|didn'?t authorize|unauthorized)\b/i.test(lower)) {
      return "I hear you. Our manager will pull the booking, invoice, and GPS records and call you back today. Or call (212) 202-8400 now to reach her directly."
    }
    // Rate confusion — "I thought it was $X/hr" — this is a pricing mixup, not a time dispute
    if (/\bthought (?:it|the rate|the price|it was|the charge) (?:was|is) \$?\d+/i.test(lower)) {
      return "Our rates are $69/hr (we bring supplies), $59/hr (you provide supplies), or $89/hr same-day. Our manager can pull your invoice and clarify — call (212) 202-8400."
    }
    // Hour/time gaslight — emphasize GPS records
    if (/\b(?:only (?:here|there) (?:for )?\d+ (?:hours?|hrs?)|(?:\d+|one|two|three|four) (?:hours?|hrs?) (?:late|early)|clock (?:started|was) early|started (?:the )?clock early|only did half|half the job|didn'?t finish|left early)\b/i.test(lower)) {
      return "I hear you. Let me pull the GPS check-in and check-out times from the cleaner's phone — those are the timestamps we bill from. Our manager can review with you at (212) 202-8400."
    }
    // Property damage — flexible match
    if (/\b(?:damage|scratched?|scratch|broken|cracked|ruined|chipped|dented|dent).{0,40}(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|lamp|door|cabinet)\b|\b(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|lamp|door|cabinet).{0,15}(?:damage|scratched?|broken|cracked|ruined|chipped|dented)\b|damage to (?:my )?(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|apartment|home|property)/i.test(lower)) {
      return "I'm so sorry — property damage goes straight to our manager. Send a photo if you can, and call (212) 202-8400 today. We're insured up to $1 million and she'll walk you through the claim."
    }
    // "You canceled on me"
    if (/\byou (?:guys |people )?canceled?\b/i.test(lower)) {
      return "I'm sorry about that. Our manager needs to look at what happened and get you rescheduled — call (212) 202-8400 and she'll take care of it today."
    }
    // Default dispute — hours, arrival, general
    return "I'm sorry to hear that. Our manager will pull the records, GPS check-in/check-out times, and invoice and review with you — call (212) 202-8400. I won't make billing changes without her sign-off."
  }
  if (intent === 'feedback_negative') {
    // Theft
    if (/\b(?:stole|stolen|took my|missing|went missing)\b/i.test(lower)) {
      return "I'm so sorry to hear that. Missing items go directly to our manager — please call (212) 202-8400 today so she can investigate and document everything. Don't touch the area if you haven't already."
    }
    // Damage
    if (/\b(?:broke|broken|damage|damaged|scratched?|cracked|ruined)\b/i.test(lower)) {
      return "I'm so sorry — please call (212) 202-8400 and send our manager a photo. We're insured up to $1 million and she'll handle the claim."
    }
    // Cleaner behavior (rude, phone, smoke, brought kid)
    if (/\b(?:rude|disrespectful|attitude|smoke|smoked|cigarette|weed|phone|kid|child|children|drunk|unprofessional)\b/i.test(lower)) {
      return "That's not how we operate and I'm sorry. Our manager is going to want to hear exactly what happened — call (212) 202-8400 today or she'll reach out to you this afternoon."
    }
    // Skipped areas
    if (/\b(?:didn'?t (?:clean|do)|skipped|missed|forgot|still dirty|half the job|only did half)\b/i.test(lower)) {
      return "I'm sorry — that's not acceptable. Our manager will review and get it made right. Call (212) 202-8400 today."
    }
    // No response
    if (/\b(?:no one (?:called|responded|answered)|haven'?t heard|never (?:called|responded|heard|got back))\b/i.test(lower)) {
      return "I'm sorry you've been waiting. Our manager will call you back today — or reach her at (212) 202-8400 right now."
    }
    // Wrong cleaner
    if (/\bwrong cleaner\b/i.test(lower)) {
      return "I'm sorry about the mix-up. Our manager needs to review the assignment — call (212) 202-8400 and she'll sort it out today."
    }
    // Never again / unsubscribe
    if (/\b(?:never again|unsubscribe)\b/i.test(lower)) {
      return "I hear you and I'm sorry we let you down. Our manager wants a chance to make this right — call (212) 202-8400. If you'd rather not, reply STOP and we'll remove you."
    }
    // Default
    return "I'm so sorry to hear that. Our manager takes this seriously — call (212) 202-8400 and she'll reach out today."
  }
  if (intent === 'account_help') {
    if (/\b(?:pin|portal|log.?in|access|password)/i.test(lower)) {
      return 'Your PIN was texted when you booked. Log in at thenycmaid.com/portal. Can\'t find it? Call (212) 202-8400 and we\'ll resend 😊'
    }
    if (/\b(?:when is|what time is) (?:my|the) (?:next |upcoming )?(?:appointment|booking|cleaning|service)|my (?:next |upcoming )(?:appointment|booking)/i.test(lower)) {
      return "I'll pull up your next appointment — you can also check it anytime at thenycmaid.com/portal. Call (212) 202-8400 if you need it right now."
    }
    if (/\b(?:eta|on (?:her|his|the) way|when (?:is|will) (?:she|the cleaner) (?:arrive|come|get)|text me when)/i.test(lower)) {
      return "Yes — your cleaner will text you when she's on her way. If you don't hear by the arrival buffer (30 min weekday / 60 min weekend), call (212) 202-8400."
    }
    if (/\b(?:change|update) (?:my )?(?:address|email|phone|number)|\bi moved\b|\bnew address:/i.test(lower)) {
      return "Got it — update anytime at thenycmaid.com/portal, or text the new info to (212) 202-8400 and we'll update it for you 😊"
    }
    if (/\bswitch (?:from |to )?\$?\d+/i.test(lower)) {
      return "No problem — we can switch your rate ($69 we bring everything / $59 you provide supplies). Call (212) 202-8400 and we'll update your account."
    }
    return 'Happy to help — text or call (212) 202-8400 and we\'ll sort it out 😊'
  }
  if (intent === 'referral') {
    return "Thank you so much for the referral! Send us their name and number when you can and we'll take great care of them 😊"
  }
  if (intent === 'emergency') {
    return 'Same-day cleaning is $89/hr. Text or call (212) 202-8400 right now and we can check today\'s availability 😊'
  }

  // PAYMENT_QUESTION — invoice, receipt, tip, balance
  if (intent === 'payment_question') {
    if (/\b(?:send|resend) (?:me )?(?:my |the )?(?:invoice|receipt|bill|confirmation)|didn'?t get (?:my |the )?receipt|never got (?:my |a |the )?receipt/i.test(lower)) {
      return "I can resend that — call (212) 202-8400 or check thenycmaid.com/portal. Want it sent to your email on file?"
    }
    if (/\b(?:add|leave|include) (?:a )?tip/i.test(lower)) {
      return 'You can add a tip to any payment method — 100% goes to your cleaner. Call (212) 202-8400 if you want us to add it to a specific invoice 😊'
    }
    if (/\b(?:balance|what do I owe|what'?s owed|how much (?:do I owe|is it))/i.test(lower)) {
      return "I'll check your balance — you can also see it anytime at thenycmaid.com/portal. Call (212) 202-8400 for instant lookup."
    }
    if (/\b(?:pay (?:with|via|by)|accept|payment method|how do i pay)\b/i.test(lower)) {
      return 'We accept Zelle (hi@thenycmaid.com), Venmo (@thenycmaid), CashApp, and credit/debit card. Payment is collected 30 minutes before the cleaner finishes.'
    }
    return "Happy to help with billing — call (212) 202-8400 and we'll pull it up 😊"
  }

  // QUESTION — common FAQs
  if (intent === 'question') {
    if (/\b(how much|price|rate|cost|charge|hourly|per hour|quote|estimate)/i.test(lower)) {
      return 'Our rates:\n\n$69/hr — we bring all supplies & equipment (recurring: 20% off weekly, 10% off biweekly/monthly)\n$59/hr — you provide your own supplies (recurring: 10% off weekly, 5% off biweekly/monthly)\n$89/hr — same-day emergency\n\nRecurring discounts kick in after first visit. We bill in 30-min increments. What works for you?'
    }
    if (/\b(insur|million|liability|bonded)/i.test(lower)) {
      return 'Yes, we are fully insured up to $1 million 😊'
    }
    // Deep clean coverage MUST run BEFORE the area regex below (which matches "cover" alone).
    if (/\b(deep clean|what.*deep)\b/i.test(lower) && /\b(includ|cover|come with|what.*do)\b/i.test(lower)) {
      return 'Deep cleans include everything in a regular cleaning PLUS inside the fridge, inside the oven, inside cabinets, baseboards, and detail work on appliances. Typically 4-6 hours for a 2BR.'
    }
    if (/\b(area|borough|nyc|manhattan|brooklyn|queens|bronx|jersey|where do you (?:cover|service|serve|work)|what areas?)/i.test(lower)) {
      return 'We cover Manhattan, Brooklyn, Queens, the Bronx, Staten Island, Long Island (Nassau and western Suffolk), Westchester County, and Northern New Jersey (Hudson plus close-in Bergen).'
    }
    if (/\b(supplies|product|equipment|vacuum|bring)/i.test(lower)) {
      return 'On the $69/hr plan we bring everything — supplies, equipment, vacuum, mop, all of it 😊'
    }
    if (/\b(cancel|cancellation|reschedule)/i.test(lower)) {
      return 'First-time bookings cannot be cancelled or rescheduled — we hold your spot and turn away other clients. For recurring clients we ask for 7 days notice.'
    }
    if (/\b(deep clean.*(includ|cover)|what.*deep clean)/i.test(lower)) {
      return 'Deep cleans include everything in a regular cleaning PLUS inside the fridge, inside the oven, inside cabinets, baseboards, and detail work on appliances. Typically 4-6 hours for a 2BR.'
    }
    if (/\b(tip|tipping|gratuity)/i.test(lower)) {
      return 'You can tip via the same payment method — 100% goes to your cleaner 😊'
    }
    if (/\b(pay|payment|method|venmo|zelle|cashapp|cash app|credit card|stripe)/i.test(lower)) {
      return 'We accept Zelle (hi@thenycmaid.com), Venmo (@thenycmaid), CashApp, and credit/debit card. Payment is collected 30 minutes before the cleaner finishes.'
    }
    if (/\b(today|same day|asap|now|emergency|urgent)/i.test(lower)) {
      return 'Same-day cleaning is $89/hr. Want me to check today\'s availability?'
    }
    if (/\b(?:automated|ai\b|robot|real person|human|bot)\b/i.test(lower) && !/\bairbnb/i.test(lower)) {
      return "I'm Yinez, your booking assistant — text or call (212) 202-8400 anytime to reach a person 😊"
    }
    if (/\b(office|commercial|business)/i.test(lower)) {
      return 'Yes — we clean offices and commercial spaces. Same hourly rates apply. What size space?'
    }
    if (/\b(weekend|saturday|sunday)/i.test(lower)) {
      return 'Yes, we work weekends! Saturday and Sunday have a 60-min arrival window due to traffic.'
    }
    if (/\b(min|minimum|how long|how short)/i.test(lower)) {
      return 'Our minimum is 2 hours. After that we bill in 30-minute increments.'
    }
    if (/\b(do i need to be home|need to be there|have to be home|be there when)/i.test(lower)) {
      return 'You do NOT need to be home — most of our clients are not. Just leave access instructions (doorman, keypad, hide-a-key, etc) and the cleaner will text when she arrives 😊'
    }
    if (/\b(same cleaner|same person|consistent cleaner)/i.test(lower)) {
      return 'Yes — after your first booking we match you with the same cleaner for future visits whenever possible 😊'
    }
    if (/\b(whats? included|what do you clean|what comes with)/i.test(lower)) {
      return 'A regular clean covers: all rooms dusted & vacuumed, kitchen counters/appliances exterior, bathrooms scrubbed, floors mopped, trash out. Deep cleans add inside fridge/oven/cabinets + detail work.'
    }
    if (/\b(do you (?:also )?(?:do|offer)|can you do)\b.*\b(plumb|electric|paint|repair|handyman|laundr)/i.test(lower)) {
      return "We're cleaning only — but happy to refer you to trusted partners if you need other services."
    }
    // Airbnb / short-term turnover
    if (/\b(airbnb|air bnb|short.?term|turnover|rental)/i.test(lower)) {
      return 'Yes — we do airbnb turnovers regularly. Same hourly rates ($69/hr with supplies, $59/hr without). Want to book?'
    }
    // Recurring questions (NOT pricing for first-time booking)
    if (/\b(recurring|weekly|bi.?weekly|monthly|every (?:week|two weeks|month))\b/i.test(lower)) {
      if (/\b(discount|first (?:time|clean|visit|booking)|first)\b/i.test(lower)) {
        return 'Recurring discounts kick in after your first visit and depend on your rate tier. $69/hr (we supply): 20% off weekly, 10% off biweekly/monthly. $59/hr (you supply): 10% off weekly, 5% off biweekly/monthly. First booking is at standard rates.'
      }
      return 'Yes — we offer weekly, biweekly, and monthly recurring service. After your first visit, $69 tier saves 20% weekly or 10% biweekly/monthly; $59 tier saves 10% weekly or 5% biweekly/monthly. Want to start with your first booking?'
    }
    return null  // Let Claude handle if available; falls through to error if not
  }

  // REBOOK — "book me again", "same as last time"
  if (intent === 'rebook') {
    return "Happy to set you up again! I'll pull your profile — call (212) 202-8400 or text us what day/time works and we'll get you on the schedule."
  }

  // SCHEDULE_CHANGE — reschedule / cancel / skip
  // (already has a default response earlier; this block left intact)

  // PAYMENT_CONFIRM
  if (intent === 'payment_confirm') {
    return 'Got it, thank you! We are verifying now and will confirm shortly 😊'
  }

  // FEEDBACK_POSITIVE
  if (intent === 'feedback_positive') {
    return 'Thank you so much! That means a lot 😊 If you have a minute, we\'d love a review at thenycmaid.com/reviews/submit'
  }

  // GREETING when nothing else matched
  if (intent === 'greeting' && !text) {
    return 'Hi! How can we help today? 😊'
  }

  return null
}

// ─── Deterministic Booking Responses ─────────────────────────────────────
// Simple steps get instant code-generated responses — no Claude, no address questions

function generateRecap(cl: BookingChecklist): string {
  // Single-number estimates that match what the booking will actually be created with
  // (see sizeEstimates around create_booking). Clients see the exact hours, no ranges.
  const sizeEstimates: Record<string, number> = {
    'regular-0-1': 2.5, 'regular-1-1': 2.5, 'regular-2-1': 3, 'regular-2-2': 3.5, 'regular-3-2': 4,
    'deep-0-1': 4, 'deep-1-1': 4, 'deep-2-1': 4, 'deep-2-2': 5, 'deep-3-2': 5.5,
    'move_in_out-0-1': 4, 'move_in_out-1-1': 4, 'move_in_out-2-1': 4, 'move_in_out-2-2': 5, 'move_in_out-3-2': 6,
  }
  const est = cl.service_type && cl.bedrooms !== null && cl.bathrooms !== null
    ? sizeEstimates[`${cl.service_type}-${cl.bedrooms}-${cl.bathrooms}`] ?? 3
    : 3
  const isWeekend = cl.day ? ['Saturday', 'Sunday'].includes(cl.day) : false
  const buffer = isWeekend ? '60 min arrival buffer due to traffic' : '30 min arrival buffer'
  const dateStr = cl.date ? `${cl.day} ${cl.date}` : (cl.day || '')
  return `To recap: We are scheduling you for ${dateStr} @ ${cl.time} (${buffer}) at the rate of $${cl.rate}/hr for an estimated ${est} hours to be paid via Zelle, credit card, CashApp, or Venmo 30 minutes before completion. You will receive a text with total time, balance and payment links. Payment needs to be made before the cleaner is complete please. We have a no cancellation policy for first-time services so I want to make sure all is correct 😊 Upon confirmation you will receive an email confirmation with all related info.`
}

export function generateBookingResponse(cl: BookingChecklist, next: NextStep, extracted: Partial<BookingChecklist>): string | null {
  // Single-number estimates — client never sees a range, only the hours we will book.
  const sizeEstimates: Record<string, number> = {
    'regular-0-1': 2.5, 'regular-1-1': 2.5, 'regular-2-1': 3, 'regular-2-2': 3.5, 'regular-3-2': 4,
    'deep-0-1': 4, 'deep-1-1': 4, 'deep-2-1': 4, 'deep-2-2': 5, 'deep-3-2': 5.5,
    'move_in_out-0-1': 4, 'move_in_out-1-1': 4, 'move_in_out-2-1': 4, 'move_in_out-2-2': 5, 'move_in_out-3-2': 6,
  }

  // Recap step — render the full recap deterministically
  if (cl.status === 'recap' && next.field === null) {
    return generateRecap(cl)
  }

  switch (next.field) {
    case 'service_type':
      // Dead-end menu deleted — every inbound now goes through askSelena (agent.ts).
      // Returning null here lets the caller fall through to the Yinez path.
      return null

    case 'bedrooms':
      // Need bedrooms and/or bathrooms
      if (cl.bedrooms !== null && cl.bathrooms === null) {
        return `${cl.bedrooms} bedrooms — how many bathrooms?`
      }
      if (cl.bedrooms === null && cl.bathrooms !== null) {
        return `${cl.bathrooms} bathrooms — how many bedrooms?`
      }
      return `Got it, ${cl.service_type === 'move_in_out' ? 'move-in/out' : cl.service_type} cleaning! How many bedrooms and bathrooms?`

    case 'rate': {
      // Just extracted bedrooms/bathrooms → give estimate + pricing
      const est = sizeEstimates[`${cl.service_type}-${cl.bedrooms}-${cl.bathrooms}`] ?? 3
      return `${cl.bedrooms}BR/${cl.bathrooms}BA — that typically runs ${est} hours.\n\n$69/hr — we bring all supplies\n$59/hr — you provide your own supplies\n\nWhich works for you?`
    }

    case 'day':
      // Just extracted rate → ask day
      return `$${cl.rate}/hr${(cl.rate === 69 || cl.rate === 79 || cl.rate === 75) ? ', we bring everything' : ', you provide supplies'}. What day works best?`

    case 'time':
      // Just extracted day → ask time
      return `${cl.day} works! What time? We do 8am, 12pm, and 4pm but can adjust 😊`

    case 'name':
      // Just extracted time → ask name
      return `${cl.day} at ${cl.time} — perfect! What's your first and last name?`

    case 'phone':
      // Just extracted name → ask phone
      return `Thanks ${cl.name}! What's your phone number so the cleaner can reach you day of?`

    case 'address':
      // Just extracted phone → ask address
      return `Got it! What's your full address — street, apt/unit, city, zip?`

    case 'email':
      // Just extracted address → ask email
      return `What's your email for the booking confirmation?`

    case 'notes':
      // Just extracted email → ask notes
      return `Almost done! Any special notes for the cleaner? You can also add notes anytime through your portal at thenycmaid.com/portal 😊`

    default:
      // Complex step or recap — let Claude handle it
      return null
  }
}

export function buildMessages(transcript: Array<{ role: 'user' | 'assistant'; content: string }>, newMessage: string) {
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
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

export async function askSelena(
  channel: 'sms' | 'web' | 'email',
  message: string,
  conversationId: string,
  phone?: string,
): Promise<YinezResult> {
  const result: YinezResult = { text: '', checklist: EMPTY_CHECKLIST }

  try {
    // ── STEP 0: Load state + detect returning client ──
    let checklist = await loadChecklist(conversationId)

    // Resolve tenant for this conversation (needed for all downstream queries).
    const { data: convoTenantRow } = await supabaseAdmin.from('sms_conversations').select('tenant_id').eq('id', conversationId).single()
    const tid = (convoTenantRow as { tenant_id?: string } | null)?.tenant_id || NYCMAID_TENANT_ID

    // Per-tenant Anthropic client (tenant key if set, platform key otherwise).
    const anthropic = await resolveAnthropic(tid)

    // Determine if returning client.
    // - SMS: convo.phone is a real phone → use it directly.
    // - Email: convo.phone is 'email-{uuid}', not a real phone. Look up the
    //   client's real phone via client_id and use THAT. If they have no real
    //   phone (new email lead), skip profile lookup.
    // - Web: phone is passed in as arg (may be null for anonymous sessions).
    let lookupPhone: string | null = null
    if (channel === 'sms') {
      const { data } = await supabaseAdmin.from('sms_conversations').select('phone').eq('id', conversationId).single()
      lookupPhone = data?.phone || null
    } else if (channel === 'email') {
      const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id').eq('id', conversationId).single()
      if (convo?.client_id) {
        const { data: c } = await supabaseAdmin.from('clients').select('phone').eq('id', convo.client_id).eq('tenant_id', tid).single()
        if (c?.phone && !c.phone.startsWith('email-') && !c.phone.startsWith('web-') && /\d{7,}/.test(c.phone)) {
          lookupPhone = c.phone
        }
      }
    } else {
      lookupPhone = phone || null
    }

    let clientContext = ''
    let isReturning = false
    if (lookupPhone && !lookupPhone.startsWith('web-') && !lookupPhone.startsWith('email-')) {
      const profile = await getClientProfile(lookupPhone, tid)
      if (!profile.includes('"error"')) {
        clientContext = `\n\nCLIENT PROFILE:\n${profile}`
        isReturning = true
      }
    }

    // ── STEP 1: Detect intent ──
    const intent = detectIntent(message, checklist, isReturning)
    result.intent = intent

    // ── STEP 2: Transition from greeting if needed ──
    if (checklist.status === 'greeting' && (intent === 'booking' || intent === 'rebook' || intent === 'emergency')) {
      checklist = await updateChecklist(conversationId, { status: 'collecting' })
    }

    // For returning clients starting a booking, pre-fill from profile
    if (isReturning && checklist.status === 'collecting' && intent === 'booking') {
      try {
        const profile = JSON.parse(clientContext.replace('\n\nCLIENT PROFILE:\n', ''))
        const prefill: Partial<BookingChecklist> = {}
        if (profile.name && !checklist.name) prefill.name = profile.name
        if (profile.address && !checklist.address) prefill.address = profile.address
        if (profile.email && !checklist.email) prefill.email = profile.email
        if (profile.last_rate && !checklist.rate) prefill.rate = profile.last_rate
        if (lookupPhone && !checklist.phone) prefill.phone = lookupPhone.replace(/\D/g, '').slice(-10)
        if (Object.keys(prefill).length > 0) {
          checklist = await updateChecklist(conversationId, prefill)
        }
      } catch {}
    }

    // ── DETERMINISTIC NON-BOOKING RESPONSES (zero Claude needed) ──
    const deterministic = generateNonBookingResponse(intent, message, checklist)
    if (deterministic) {
      result.text = deterministic
      result.checklist = checklist
      return result
    }

    // Post-confirmation — booking already created. Short acknowledgments or
    // rebook-intent replies should not loop back through Claude and hit the
    // error fallback.
    if (checklist.status === 'confirmed' && intent === 'booking') {
      result.text = `You're all set${checklist.name ? ', ' + checklist.name.split(' ')[0] : ''}! Our team will confirm shortly. Text or call (212) 202-8400 if you need anything 😊`
      result.checklist = checklist
      return result
    }

    const preStep = getNextStep(checklist, isReturning)

    // ── LAYER 1: Deterministic extraction (booking intents only) ──
    let extraction: ExtractionResult = { extracted: {}, clientCreated: false }
    if (['booking', 'rebook', 'emergency', 'greeting'].includes(intent)) {
      extraction = await extractAndSave(message, checklist, conversationId, preStep.field)
      if (extraction.clientCreated) result.clientCreated = true
    }

    // Reload checklist
    checklist = await loadChecklist(conversationId)
    const nextStep = getNextStep(checklist, isReturning)

    // ── FAST PATH: Deterministic response for simple booking steps ──
    const extractedKeys = Object.keys(extraction.extracted)
    const isBookingIntent = ['booking', 'greeting', 'emergency'].includes(intent)
    const inFlow = ['collecting', 'greeting', 'recap'].includes(checklist.status)

    // Confirmation at recap → fire create_booking deterministically.
    // Tight: only exact affirmatives. No 30-char trailing slop — that matched
    // "yes wait actually change the time" and created the wrong booking.
    const lowerMsg = message.trim().toLowerCase().replace(/[.!,?]+$/g, '').trim()
    const hasChangeWord = /\b(wait|actually|but|change|different|instead|no,|nope|hold|cancel|switch|move|earlier|later|not sure|except|hmm|hmmm|oh wait)\b/i.test(message)
    const hasQuestion = /\?/.test(message)
    const hasAffirmative = /\b(?:yes|yeah|yep|yup|yessir|ya|yea|correct|confirmed?|confirm|book it|booking it|looks good|looks great|sounds good|sounds great|good|great|perfect|locked in|let'?s do it|lets do it|do it|ok|okay|all good|thats? right|that'?s right|go ahead|go for it|lgtm|approved|si|sí|book her|lock it in|we'?re good|all set)\b/i.test(lowerMsg)
    const isShortAffirmative = /^[y]+$|^(k|kk|ok|okay|yes|yeah|yep|yup|correct|great|perfect|good|done|locked|confirm|confirmed|approved|ya|ye|ok 👍|👍|🙏|✅|si|sí)$/i.test(lowerMsg)
    const wordCount = lowerMsg.split(/\s+/).filter(Boolean).length
    const isConfirmation = !hasChangeWord && !hasQuestion && (isShortAffirmative || (hasAffirmative && wordCount <= 6))

    if (isBookingIntent && checklist.status === 'recap' && isConfirmation && checklist.service_type && checklist.day && checklist.time && checklist.rate) {
      // Fire create_booking directly
      const sizeEstimates: Record<string, number> = {
        'regular-0-1': 2.5, 'regular-1-1': 2.5, 'regular-2-1': 3, 'regular-2-2': 3.5, 'regular-3-2': 4,
        'deep-0-1': 4, 'deep-1-1': 4, 'deep-2-1': 4, 'deep-2-2': 5, 'deep-3-2': 5.5,
        'move_in_out-0-1': 4, 'move_in_out-1-1': 4, 'move_in_out-2-1': 4, 'move_in_out-2-2': 5, 'move_in_out-3-2': 6,
      }
      const est = sizeEstimates[`${checklist.service_type}-${checklist.bedrooms}-${checklist.bathrooms}`] || 3
      try {
        await handleCreateBooking({
          date: checklist.date || '',
          time: checklist.time,
          service_type: checklist.service_type,
          hourly_rate: checklist.rate,
          estimated_hours: est,
          recurring_type: 'one_time',
        }, conversationId, result)

        // Only confirm to client if booking actually hit the DB.
        if (!result.bookingCreated) {
          result.text = `We hit a snag confirming your booking — one of our team will reach out within a few minutes to lock it in. Sorry for the hiccup! 😊`
          result.checklist = await loadChecklist(conversationId)
          return result
        }

        // Get PIN if available
        let pinLine = ''
        try {
          const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id, tenant_id').eq('id', conversationId).single()
          if (convo?.client_id) {
            let pinQuery = supabaseAdmin.from('clients').select('pin').eq('id', convo.client_id)
            const convoTid = (convo as { tenant_id?: string }).tenant_id
            if (convoTid) pinQuery = pinQuery.eq('tenant_id', convoTid)
            const { data: c } = await pinQuery.single()
            if (c?.pin) pinLine = ` Your portal PIN is ${c.pin} — log in at thenycmaid.com/portal to view your booking and add notes.`
          }
        } catch {}
        result.text = `Thank you so much${checklist.name ? ' ' + checklist.name.split(' ')[0] : ''}! We really appreciate you and look forward to working with you 😊 Your booking is pending and will be confirmed by our team shortly.${pinLine} If you need anything, text or call us at (212) 202-8400.`
        result.checklist = await loadChecklist(conversationId)
        return result
      } catch (err) {
        await yinezError('fast_path_create_booking', err, conversationId)
        // Fall through to Claude
      }
    }

    // Fast path: ALWAYS fire when in booking flow with a known step.
    // This means even if the user sends garbage that doesn't extract,
    // we re-ask the current question deterministically (no Claude needed).
    const fastPathEligible = isBookingIntent
      && (nextStep.field !== null || checklist.status === 'recap')
      && inFlow

    if (fastPathEligible) {
      const fastResponse = generateBookingResponse(checklist, nextStep, extraction.extracted)
      if (fastResponse) {
        if (checklist.status === 'greeting') {
          checklist = await updateChecklist(conversationId, { status: 'collecting' })
        }
        result.text = fastResponse
        result.checklist = checklist
        return result
      }
    }

    // ── Build context ──
    const calendar = buildCalendarContext()

    let extractionContext = ''
    if (extractedKeys.length > 0) {
      const items = extractedKeys.map(k => `${k}: ${extraction.extracted[k as keyof BookingChecklist]}`).join(', ')
      extractionContext = `\nJust captured from their message: ${items}. Acknowledge naturally.`
    }

    // For disputes, pre-fetch booking data so Claude doesn't have to call the tool
    let disputeData = ''
    if (intent === 'dispute') {
      const details = await handleBookingDetails({}, conversationId)
      if (!details.includes('"error"')) {
        disputeData = '\n\nBOOKING DATA (already retrieved — use this to respond):\n' + details
      }
    }

    // Step instruction FIRST — most important, must not be overridden
    const stepPrompt = buildStepPrompt(intent, checklist, nextStep, isReturning)
    const systemPrompt = 'YOUR TASK: ' + stepPrompt + '\n\n' + YINEZ_PERSONALITY + calendar + clientContext + extractionContext + disputeData

    // ── Select tools for this intent ──
    const activeTools = getToolsForIntent(intent)

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

    // ── LAYER 2: Claude ──
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
      let currentMessages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }> = [...messages]

      for (let i = 0; i < 4; i++) {
        const response = await anthropic.messages.create(
          { model: 'claude-sonnet-4-6', max_tokens: 700, system: systemPrompt, messages: currentMessages, tools: activeTools.length > 0 ? activeTools : undefined },
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
          let toolResult: string
          try {
            toolResult = await handleTool(tool.name, tool.input as Record<string, unknown>, conversationId, result)
          } catch (toolErr) {
            await yinezError(`tool:${tool.name}`, toolErr, conversationId)
            toolResult = JSON.stringify({ success: true })
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: toolResult, ...(toolResult.includes('"error"') ? { is_error: true } : {}) })
        }

        currentMessages.push({ role: 'user', content: toolResults })
      }

      // Retry once on empty response
      if (!result.text) {
        const fallback = await anthropic.messages.create(
          { model: 'claude-sonnet-4-6', max_tokens: 700, system: systemPrompt, messages: currentMessages },
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
      await yinezError('empty_response', new Error('No text'), conversationId)
      result.text = "Sorry about that! Could you resend? 😊"
    }
    if (result.text.length > 600) result.text = result.text.slice(0, 597) + '...'

    result.checklist = await loadChecklist(conversationId)
    return result
  } catch (err) {
    await yinezError('askSelena_main', err, conversationId)
    // No canned fallback — surface the error to admin and return empty so the
    // caller can route to Yinez/retry instead of dead-ending the conversation.
    result.text = ''
    return result
  }
}
