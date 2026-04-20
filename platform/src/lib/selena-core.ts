/**
 * Selena Core — ported from nycmaid/src/lib/selena.ts (2026-04-19)
 *
 * Pieces that fullloop's generic Selena was missing:
 *   - Intent router (17 intents) — classifies EVERY message before flow
 *   - Team-member detection — gates staff out of the booking flow
 *   - Strict name validator — blocks "Just paid via Zelle" etc
 *   - Extraction layer — pre-parses fields before Claude sees them
 *   - Tool-set selector per intent — smaller tool sets = fewer hallucinations
 *
 * Why separate file: fullloop's selena.ts is tenant-config-driven. Keeping the
 * battle-tested nycmaid logic in its own file makes the port reviewable and
 * lets the two evolve independently where they must.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

// ════════════════════════════════════════════════════════════════════════════
// INTENTS
// ════════════════════════════════════════════════════════════════════════════

export type Intent =
  | 'booking' | 'rebook' | 'emergency'
  | 'payment_confirm' | 'payment_question' | 'dispute'
  | 'account_help' | 'schedule_change' | 'team_member_request'
  | 'feedback_positive' | 'feedback_negative'
  | 'casual' | 'question' | 'referral'
  | 'human_request' | 'not_interested'
  | 'greeting'

type IntentRule = { intent: Intent; patterns: RegExp[] }

const INTENT_PATTERNS: IntentRule[] = [
  { intent: 'human_request', patterns: [
    /\b(?:talk to|speak to|transfer|connect me|call me|human|real person|manager|supervisor)\b/i,
    /\bcan(?:'t| not) (?:do all this )?text/i,
  ]},
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
  { intent: 'not_interested', patterns: [
    /\b(?:not (?:looking|interested|need)|don'?t need|no(?:t)? (?:right now|at (?:the|this) moment)|no services?|no clean)/i,
    /\bI (?:offer|provide|do|am a) (?:clean|service)/i,
    /\b(?:looking for (?:work|job|employment)|hiring|do you hire|are you hiring)/i,
    /^(?:maybe (?:later|next time|another time|tomorrow))[\s.!]*$/i,
    /^(?:no thanks?|no thank you|nah|nope)[\s.!]*$/i,
    /^(?:wrong number|wrong #|not me)[\s.!]*$/i,
  ]},
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
  { intent: 'dispute', patterns: [
    /\b(?:charged|overcharged|too (?:much|many|long|expensive)|wasn'?t (?:here|there) (?:that|for)|only (?:here|there) for)/i,
    /\b(?:dispute|wrong (?:amount|charge|price|time|hours)|not right|incorrect|doesn'?t? (?:add up|look right|seem right))/i,
    /\b(?:she (?:was|wasn'?t) (?:late|here|only)|arrived (?:late|at)|didn'?t (?:arrive|come|show))/i,
    /\b(?:cleaner|tech|worker|pro) (?:didn'?t|never|wasn'?t) (?:show|come|arrive|clean|work)/i,
    /\b(?:shouldn'?t (?:have to )?pay|not paying|refuse to pay|that'?s (?:too much|wrong))/i,
    /\b(?:4 hours|3 hours|2 hours).*\b(?:but|only|wasn'?t|not)\b/i,
    /\b(?:but|only|wasn'?t|not)\b.*\b(?:4 hours|3 hours|2 hours)/i,
    /\b(?:how (?:long|many hours)|actual (?:time|hours)|check.in|check.out)\b/i,
    /\b(?:refund(?:ed)?|money back|give me (?:my )?money|want my money)\b/i,
    /\b(?:chargeback|charge ?back|dispute (?:this )?(?:with|to) (?:my )?(?:bank|card|cc))\b/i,
    /\bcancel (?:my |the )?payment\b/i,
    /\b(?:give me|want|need|deserve|any|ill take|can i get|i'?d like|gimme) (?:a |the |any )?(?!recurring |loyalty |first.?time )discount\b/i,
    /\b(?:take \$?\d+ off|\$?\d+ off (?:the |my )?(?:bill|payment|total)|half off|take half off|mark (?:it )?down|knock (?:\$?\d+ )?off|deserve \$?\d+ off)\b/i,
    /\b(?:never authorized|didn'?t authorize|unauthorized|did not authorize)\b/i,
    /\b(?:only did half|did half the job|half the job|didn'?t finish|half (?:finished|done)|partial (?:job|work|clean))\b/i,
    /\b(?:she|he|they|worker|cleaner|tech)\b.{0,20}\b(\d+|one|two|three|four|five)\s*(?:hours?|hrs?|minutes?|mins?)\s*(?:late|early)\b/i,
    /\bleft (?:\d+ )?(?:hours?|hrs?|minutes?|mins?) early\b/i,
    /\bleft early\b/i,
    /\bleft (?:after )?\d+ (?:hours?|hrs?|minutes?|mins?)\b/i,
    /\b(?:she|he|they|worker|cleaner|tech) (?:only )?(?:stayed|was here|here) (?:for )?\d+ (?:hours?|hrs?|minutes?|mins?)/i,
    /\bclock (?:started|was) (?:\d+ )?(?:min(?:ute)?s? |hrs? |hours? )?early\b/i,
    /\bstarted (?:the )?(?:clock|time) early\b/i,
    /\bthought (?:it|the rate|the price) (?:was|is) \$?\d+/i,
    /\bi(?:'ll| will)? (?:only )?pay \$?\d+/i,
    /\bpay \$?\d+ total\b/i,
    /\byou (?:guys |people )?canceled?\b/i,
    /\b(?:need|want) more time to pay\b/i,
    /\bsplit (?:the |my )?bill\b/i,
    /\b(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|lamp|door|cabinet) (?:damage|scratched?|broken|cracked|ruined|chipped|dented)\b/i,
    /\bdamage to (?:my )?(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|apartment|home|property|lamp|door)\b/i,
    /\b(?:deep |bad |big )?scratch(?:ed)?.{0,40}(?:floor|table|wall|counter|sofa|couch|tv|mirror|furniture|lamp|door|cabinet)\b/i,
    /\bthere(?:'s| is) (?:a |some )?(?:deep |bad |big )?(?:scratch|dent|crack|chip|hole)\b/i,
  ]},
  { intent: 'schedule_change', patterns: [
    /\b(?:reschedul|cancel (?:my|the|next))/i,
    /\bchange (?:my|the)\b.*?\b(?:appointment|booking|cleaning|service|time|date|day|upcoming)/i,
    /\b(?:change|move) (?:my|the) (?:upcoming |next )?(?:appointment|booking|cleaning|service)/i,
    /\b(?:move (?:my|the) [\w\s]*(?:appointment|booking|cleaning|service))/i,
    /\b(?:cancel (?:next |this )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
    /\b(?:pause|skip|hold) (?:my )?(?:recurring|weekly|biweekly|service|this week|next week)/i,
    /\bskip (?:this |next |a )?week\b/i,
  ]},
  { intent: 'account_help', patterns: [
    /\b(?:pin|portal|log.?in|access|can'?t (?:get in|access|log)|account|password|confirmation email)/i,
    /\b(?:change|update) (?:my )?(?:address|email|phone|number)/i,
    /\b(?:didn'?t (?:get|receive) (?:the |my )?(?:email|confirmation))/i,
    /\b(?:when is|what time is|whats? the time of) (?:my|the) (?:next |upcoming )?(?:appointment|booking|cleaning|service)/i,
    /\bmy (?:next |upcoming )(?:appointment|booking|cleaning|service)/i,
    /\b(?:eta|on (?:her|his|the) way|when (?:is|will) (?:she|he|they|the cleaner|the tech) (?:arrive|come|get here|show))/i,
    /\btext me when (?:she|he|they|the cleaner|the tech|someone)/i,
    /\bswitch (?:from |to )?\$?\d+ ?(?:plan|rate|hour)?/i,
    /\bi moved\b/i,
    /\bnew address:/i,
  ]},
  { intent: 'team_member_request', patterns: [
    /\b(?:can I |I )?(?:want|request|prefer|have|get) (?:the same )?(?:cleaner|tech|worker|pro)/i,
    /\bsame (?:cleaner|tech|worker|pro)\b/i,
    /\bprefer \w+\b/i,
  ]},
  { intent: 'rebook', patterns: [
    /\b(?:same (?:as last|thing|again)|book (?:again|another)|need another (?:clean|service))/i,
    /\b(?:schedule (?:another|again|next))/i,
  ]},
  { intent: 'emergency', patterns: [
    /\b(?:today|asap|emergency|urgent|right now|immediately|same.?day|tonight|this (?:evening|morning|afternoon))\b/i,
    /\b(?:need (?:someone|a cleaner|a tech|a pro) (?:today|now|tonight|asap|soon))\b/i,
    /\b(?:can you (?:clean|come|help) (?:tonight|today|now|soon))\b/i,
  ]},
  { intent: 'feedback_positive', patterns: [
    /\b(?:she was|he was|they were|it was|cleaning was|service was|worker was|tech was)\s+(?:great|amazing|awesome|perfect|wonderful|fantastic|excellent|incredible)\b/i,
    /\blove (?:my|the|our) (?:cleaner|tech|worker|pro)/i,
    /\bamazing job\b/i, /\bgreat job\b/i,
    /\bthank(?:s| you)\b.*\b(?:clean|service|job)/i,
  ]},
  { intent: 'feedback_negative', patterns: [
    /\b(?:not happy|not satisfied|complaint|terrible|awful|horrible|worst|damage|broke|missing|stole|damaged|stolen)/i,
    /\b(?:didn'?t (?:clean|fix|finish)|missed|forgot|skipped)/i,
    /\b(?:haven'?t|have not|never) (?:called|responded|heard|got back|reached out)/i,
    /\b(?:why haven'?t|why havent|why hasnt|why has not)/i,
    /\b(?:broke my|broken my|damaged my|scratched my|stole my|took my)/i,
    /\bno one (?:called|responded|answered)/i,
    /\b(?:cleaner|tech|worker|she|he).{0,15}\b(?:rude|disrespectful|mean|nasty|aggressive|unprofessional)\b/i,
    /\b(?:extremely|very|so|really) rude\b/i,
    /\brude to me\b/i,
    /\bhad (?:an )?attitude/i,
    /\b(?:smoked|cigarette|weed|marijuana|drunk)\b/i,
    /\bsmelled like (?:smoke|cigarettes?|weed|alcohol)\b/i,
    /\b(?:on (?:her|his|their) phone|phone the whole|texting the whole)/i,
    /\bbrought (?:her|his|their) (?:kid|child|children|daughter|son|baby|friend|boyfriend|husband)/i,
    /\bwrong (?:cleaner|tech|worker|person)\b/i,
    /\bnever again\b/i,
    /\bunsubscribe me\b/i,
    /\b(?:still |ain'?t |wasn'?t |was not )(?:dirty|clean|fixed|broken)\b/i,
    /\b(?:only did|did only|did just) half\b/i,
    /\btook (?:my )?(?:money|cash|wallet|watch|ring|jewelry|stuff|things)\b/i,
    /\btook .+ from (?:my|the) (?:wallet|purse|apartment|house|room|bedroom)/i,
    /\b(?:nobody|no one) (?:has )?(?:called|responded|answered|got back|reached)/i,
    /\bno response\b/i,
    /\b(?:ignoring|ignored) me\b/i,
    /\btexting for \d+ (?:days?|weeks?) (?:and |with )?no (?:response|reply)/i,
  ]},
  { intent: 'referral', patterns: [
    /\b(?:my friend|refer|recommend(?:ed)? (?:you|to)|someone (?:I know|who))/i,
  ]},
  { intent: 'question', patterns: [
    /\b(?:how much|hw much|wat is yer|whats yer|how mutch)\b/i,
    /\b(?:what (?:are|is) (?:your|the|yr) (?:rate|price|cost))/i,
    /\bhow much (?:for|would|does|do|is|u|you)/i,
    /\b(?:u|you) charge\b/i,
    /\b(?:what area|where do you|do you (?:cover|service|serve))/i,
    /\b(?:insured|licensed|supplies|products|equipment)/i,
    /\b(?:price|rate|cost|estimate|quote)\b/i,
    /\bwhat (?:if|happens if) I (?:need to )?cancel/i,
    /\b(?:cancellation|cancel) (?:policy|fee|rules)/i,
    /\b(?:are you|is this|am i (?:talking to|chatting with))\s+(?:an?\s+)?(?:robot|ai|automated|real person|bot|human|person|real)\b/i,
    /\b(?:how long|how short|minimum|do you bring|how (?:do i|to) (?:tip|pay))/i,
    /\b(?:do you|you) (?:do|offer|work|clean) (?:on )?(?:weekends?|saturdays?|sundays?)/i,
    /\bdo you (?:offer|have) (?:airbnb|turnover|short.?term)/i,
  ]},
  { intent: 'casual', patterns: [
    /^[^a-zA-Z]*(?:thanks?|thank\s*you|thx|ty|trank\s*u?|tanks?|tnx|ok|okay|got it|sounds good|perfect|great|cool|awesome|sure|yes|no|yep|nope|good (?:morning|afternoon|evening|night)|have a (?:good|great|nice)|bye|see you|take care)[^a-zA-Z]*$/i,
    /^[^a-zA-Z0-9]+$/,
    /^(?:hi|hey|hello|yo|sup|hola|what's up)[^a-zA-Z]*$/i,
  ]},
]

export function detectIntent(
  message: string,
  status: 'greeting' | 'collecting' | 'recap' | 'confirmed' | 'rating' | 'closed'
): Intent {
  const text = message.trim()
  const inFlow = status === 'collecting' || status === 'recap'

  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      // Short affirmatives while collecting = answer to the current question, not exit signal.
      if (inFlow && (intent === 'casual' || intent === 'not_interested')) {
        if (/\b(?:bye|good (?:night|bye)|see you|take care)\b/i.test(text)) return 'casual'
        return 'booking'
      }
      return intent
    }
  }

  if (status === 'collecting' || status === 'recap' || status === 'confirmed') return 'booking'
  if (status === 'greeting') return 'greeting'
  return 'booking'
}

// ════════════════════════════════════════════════════════════════════════════
// TEAM MEMBER DETECTION — staff must not be routed through the booking flow
// ════════════════════════════════════════════════════════════════════════════

export async function isTeamMemberPhone(
  tenantId: string,
  phone: string
): Promise<{ isTeamMember: boolean; name?: string; id?: string }> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)
  if (!cleanPhone || cleanPhone.length < 7) return { isTeamMember: false }

  const { data } = await supabaseAdmin
    .from('team_members')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .ilike('phone', `%${cleanPhone}%`)
    .limit(1)

  if (data && data.length > 0) {
    return { isTeamMember: true, name: data[0].name, id: data[0].id }
  }
  return { isTeamMember: false }
}

// ════════════════════════════════════════════════════════════════════════════
// STRICT NAME VALIDATOR
// ════════════════════════════════════════════════════════════════════════════

const PROFANITY = ['fuck', 'fuk', 'fck', 'shit', 'bitch', 'dick', 'cunt', 'asshole', 'ass', 'cock', 'pussy', 'slut', 'whore', 'bastard', 'fag', 'retard', 'nigger', 'nigga']

const JUNK_WORDS = new Set([
  'ok', 'okay', 'sure', 'yes', 'yeah', 'yep', 'yup', 'no', 'nope', 'nah',
  'hi', 'hey', 'hello', 'yo', 'sup', 'hola',
  'thanks', 'thank', 'you', 'thx', 'ty', 'appreciate',
  'good', 'great', 'fine', 'cool', 'awesome', 'perfect', 'nice',
  'paid', 'pay', 'paying', 'just', 'sent', 'sending', 'send', 'zelle', 'venmo', 'cashapp', 'stripe', 'card', 'via', 'through',
  'stop', 'start', 'help', 'please', 'cancel', 'book', 'booking',
  'clean', 'cleaning', 'cleaner', 'service', 'tech', 'worker', 'pro',
  'morning', 'afternoon', 'evening', 'night', 'today', 'tomorrow', 'yesterday',
  'bye', 'see', 'ya', 'take', 'care', 'talk', 'soon',
  'all', 'got', 'it', 'sounds', 'looks', 'lol', 'idk',
  'my', 'name', 'is', 'im', 'am', 'are', 'the', 'a', 'an', 'and', 'or', 'but',
])

export function isValidName(text: string): boolean {
  const clean = text.replace(/[.!,]+$/g, '').trim()
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'-]+(?: [A-Za-zÀ-ÖØ-öø-ÿ'-]+){0,3}$/.test(clean)) return false
  if (clean.includes('@') || /\d/.test(clean)) return false
  const words = clean.split(/\s+/)
  if (words[0].length < 2) return false
  const lowerWords = words.map(w => w.toLowerCase())
  if (lowerWords.some(w => JUNK_WORDS.has(w))) return false
  if (lowerWords.some(w => PROFANITY.includes(w))) return false
  return true
}

// ════════════════════════════════════════════════════════════════════════════
// DNS FILTER — NEVER contact do_not_service clients
// ════════════════════════════════════════════════════════════════════════════

export async function isDoNotService(tenantId: string, clientId: string | null): Promise<boolean> {
  if (!clientId) return false
  const { data } = await supabaseAdmin
    .from('clients')
    .select('do_not_service')
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .single()
  return data?.do_not_service === true
}

export async function isDoNotServiceByPhone(tenantId: string, phone: string): Promise<boolean> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10)
  if (!cleanPhone || cleanPhone.length < 7) return false
  const { data } = await supabaseAdmin
    .from('clients')
    .select('do_not_service')
    .eq('tenant_id', tenantId)
    .ilike('phone', `%${cleanPhone}%`)
    .eq('do_not_service', true)
    .limit(1)
  return !!(data && data.length > 0)
}

// ════════════════════════════════════════════════════════════════════════════
// TOOL SET SELECTOR — smaller tool sets per intent = fewer Claude hallucinations
// ════════════════════════════════════════════════════════════════════════════

export function getToolNamesForIntent(intent: Intent): string[] {
  const map: Record<Intent, string[]> = {
    greeting: ['remember'],
    booking: ['create_client', 'save_info', 'check_availability', 'create_booking', 'add_to_waitlist', 'remember'],
    rebook: ['lookup_bookings', 'check_availability', 'create_booking', 'remember'],
    emergency: ['check_availability', 'create_booking', 'remember'],
    payment_confirm: ['confirm_payment', 'check_payment', 'remember'],
    payment_question: ['check_payment', 'get_invoice', 'booking_details', 'remember'],
    account_help: ['get_account', 'update_account', 'send_pin', 'resend_confirmation', 'remember'],
    schedule_change: ['lookup_bookings', 'reschedule_booking', 'cancel_booking', 'manage_recurring', 'remember'],
    team_member_request: ['lookup_bookings', 'check_availability', 'remember'],
    feedback_positive: ['remember'],
    dispute: ['booking_details', 'check_payment', 'remember'],
    feedback_negative: ['report_issue', 'booking_details', 'remember'],
    referral: ['remember'],
    casual: ['remember'],
    not_interested: ['remember'],
    human_request: ['request_callback'],
    question: ['check_availability', 'remember'],
  }
  return map[intent] || ['remember']
}

export function filterToolsByIntent<T extends { name: string }>(tools: T[], intent: Intent): T[] {
  const allowed = new Set(getToolNamesForIntent(intent))
  return tools.filter(t => allowed.has(t.name))
}

// ════════════════════════════════════════════════════════════════════════════
// EXTRACTION HELPERS — deterministic pre-Claude parsing
// ════════════════════════════════════════════════════════════════════════════

const DAY_MAP: Record<string, string> = {
  '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '7': 'Sunday',
  'mon': 'Monday', 'tue': 'Tuesday', 'tues': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday',
  'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday', 'weds': 'Wednesday',
  'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday',
  'lunes': 'Monday', 'martes': 'Tuesday', 'miercoles': 'Wednesday', 'miércoles': 'Wednesday',
  'jueves': 'Thursday', 'viernes': 'Friday', 'sabado': 'Saturday', 'sábado': 'Saturday', 'domingo': 'Sunday',
}

const TIME_MAP: Record<string, string> = {
  'morning': '10am', 'afternoon': '2pm', 'evening': '4pm',
  'noon': '12pm', 'midday': '12pm', 'midnight': '12am',
  'early': '8am', 'late morning': '11am', 'late afternoon': '4pm',
  'mañana': '10am', 'tarde': '2pm', 'noche': '6pm', 'mediodía': '12pm',
}

export function resolveDate(dayName: string, timezone = 'America/New_York', forceNextWeek = false): string | null {
  const now = new Date()
  const idx = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName.toLowerCase())
  if (idx === -1) return null
  const currentDay = now.getDay()
  let daysAhead = idx - currentDay
  if (daysAhead <= 0) daysAhead += 7
  if (forceNextWeek && daysAhead < 7) daysAhead += 7
  const target = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  return target.toLocaleDateString('en-CA', { timeZone: timezone })
}

export function resolveRelativeDay(text: string, timezone = 'America/New_York'): { day: string; date: string } | null {
  const lower = text.toLowerCase().trim()
  const now = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const offsetDays = (n: number) => {
    const target = new Date(now.getTime() + n * 86400000)
    return { day: dayNames[target.getDay()], date: target.toLocaleDateString('en-CA', { timeZone: timezone }) }
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

export interface ExtractedFields {
  bedrooms?: number
  bathrooms?: number
  day?: string
  date?: string
  time?: string
  address?: string
  email?: string
  phone?: string
  name?: string
}

/** Deterministic extraction. Does NOT touch the DB — pure parse. */
export function extractFields(text: string, nextField: string | null, timezone = 'America/New_York'): ExtractedFields {
  const out: ExtractedFields = {}
  const lower = text.toLowerCase().replace(/[.,!?]+$/g, '').trim()

  // Bedrooms & bathrooms
  const brBa = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br|bd|hab(?:itacion(?:es)?)?|recamara|recámara|cuarto)s?\s*[,/&and]*\s*(\d+)\s*(?:bath(?:room)?s?|ba|bt|baño|bano|baños|banos)/i)
  if (brBa) {
    out.bedrooms = parseInt(brBa[1])
    out.bathrooms = parseInt(brBa[2])
  } else {
    const bedOnly = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br|bd|hab(?:itacion(?:es)?)?|recamara|recámara|cuarto)/i)
    if (bedOnly) out.bedrooms = parseInt(bedOnly[1])
    const bathOnly = lower.match(/(\d+)\s*(?:bath(?:room)?s?|ba|bt|baño|bano|baños|banos)/i)
    if (bathOnly) out.bathrooms = parseInt(bathOnly[1])
  }
  if (nextField === 'bedrooms' && /^\d$/.test(lower)) out.bedrooms = parseInt(lower)
  if (/\bstudio\b/i.test(lower)) {
    out.bedrooms = 0
    if (out.bathrooms === undefined) out.bathrooms = 1
  }

  // Day
  const hasNext = /\bnext\b/i.test(lower)
  const relative = resolveRelativeDay(lower, timezone)
  if (relative) {
    out.day = relative.day
    out.date = relative.date
  } else {
    const dayMatch = DAY_MAP[lower]
    if (dayMatch) {
      out.day = dayMatch
      out.date = resolveDate(dayMatch, timezone, hasNext) || undefined
    } else {
      for (const [key, val] of Object.entries(DAY_MAP)) {
        if (key.length > 2 && lower.includes(key)) {
          out.day = val
          out.date = resolveDate(val, timezone, hasNext) || undefined
          break
        }
      }
    }
  }

  // Time
  const timeFromMap = TIME_MAP[lower]
  if (timeFromMap) out.time = timeFromMap
  if (!out.time) {
    const t = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m?)$/i)
    if (t) out.time = `${t[1]}${t[2] ? ':' + t[2] : ''}${t[3].length === 1 ? t[3] + 'm' : t[3]}`
  }
  if (!out.time) {
    const t = lower.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i)
    if (t) out.time = `${t[1]}${t[2] ? ':' + t[2] : ''}${t[3].toLowerCase()}`
  }
  if (!out.time) {
    for (const [key, val] of Object.entries(TIME_MAP)) {
      if (key.length >= 4 && new RegExp(`\\b${key}\\b`, 'i').test(lower)) {
        out.time = val
        break
      }
    }
  }

  // Address
  if (nextField === 'address' && /\d+\s+[\w\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|pl|place|way|ct|court|pkwy|parkway)\b/i.test(text)) {
    out.address = text.trim()
  } else {
    const addr = text.match(/\d+\s+(?:[NSEW]\.?\s+)?[\w']+(?:\s+\w+)*\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|pl|place|way|ct|court|pkwy|parkway)\b(?:\s+(?:apt|unit|suite|ste|#)\s*[\w\d-]+)?(?:\s*,?\s*[A-Za-z ]+)?(?:\s*,?\s*\d{5})?/i)
    if (addr) out.address = addr[0].trim()
  }

  // Email
  const em = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  if (em) out.email = em[0].toLowerCase()

  // Phone
  if (nextField === 'phone') {
    const digits = text.replace(/\D/g, '')
    if (digits.length === 10 || (digits.length === 11 && digits[0] === '1')) out.phone = digits.slice(-10)
  } else {
    const p = text.match(/(?:number|phone|cell|mobile|reach me at|call me at)\s*(?:is\s*)?[:\s]*\+?1?[\s.-]?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/i)
    if (p) out.phone = p[1] + p[2] + p[3]
  }

  // Name — only when asked for one, and only if it passes strict validation
  if (nextField === 'name') {
    const namePhrase = text.match(/(?:\bmy name is|\bi am\b|\bi'?m\b|\bthis is|\bname'?s|\bsoy\b|\bme llamo)\s+([A-Za-zÀ-ÖØ-öø-ÿ'-]+(?:\s+(?!and\b|at\b|is\b|my\b|phone\b|number\b|email\b|address\b|from\b|but\b|by\b|with\b|for\b|the\b|to\b)[A-Za-zÀ-ÖØ-öø-ÿ'-]+)?)/i)
    if (namePhrase && isValidName(namePhrase[1])) {
      out.name = namePhrase[1].trim()
    } else if (isValidName(text)) {
      out.name = text.replace(/[.!,]+$/g, '').trim()
    }
  }

  return out
}

// ════════════════════════════════════════════════════════════════════════════
// EXTENDED TOOL SHAPES — for the full nycmaid tool set (wire handlers later)
// ════════════════════════════════════════════════════════════════════════════

export const EXTENDED_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'get_account',
    description: 'Full account summary — bookings, payments, preferences.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'update_account',
    description: 'Update client address, email, phone, or name.',
    input_schema: { type: 'object' as const, properties: { field: { type: 'string' }, value: { type: 'string' } }, required: ['field', 'value'] },
  },
  {
    name: 'send_pin',
    description: 'Look up and send client their portal PIN.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'resend_confirmation',
    description: 'Resend booking confirmation email.',
    input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' } }, required: [] },
  },
  {
    name: 'check_payment',
    description: 'Balance, what\'s owed, payment history.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'confirm_payment',
    description: 'Client says they paid. Triggers verification. Include sender_name if coming from someone other than the client.',
    input_schema: { type: 'object' as const, properties: { method: { type: 'string' }, sender_name: { type: 'string' } }, required: ['method'] },
  },
  {
    name: 'get_invoice',
    description: 'Send receipt/invoice to client email.',
    input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' } }, required: [] },
  },
  {
    name: 'lookup_bookings',
    description: 'Client\'s upcoming or past bookings.',
    input_schema: { type: 'object' as const, properties: { status_filter: { type: 'string' } }, required: [] },
  },
  {
    name: 'reschedule_booking',
    description: 'Move booking to new date/time. Recurring only, per-tenant notice policy.',
    input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, new_date: { type: 'string' }, new_time: { type: 'string' } }, required: ['booking_id', 'new_date', 'new_time'] },
  },
  {
    name: 'cancel_booking',
    description: 'Cancel a booking. First-time = refuse. Recurring = per-tenant notice policy.',
    input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' }, reason: { type: 'string' } }, required: ['booking_id'] },
  },
  {
    name: 'manage_recurring',
    description: 'Pause, resume, or change recurring schedule.',
    input_schema: { type: 'object' as const, properties: { action: { type: 'string' }, schedule_id: { type: 'string' }, new_day: { type: 'string' }, pause_until: { type: 'string' } }, required: ['action'] },
  },
  {
    name: 'booking_details',
    description: 'Get full booking details including check-in/out times, GPS, actual hours, payment math. Use when client disputes.',
    input_schema: { type: 'object' as const, properties: { booking_id: { type: 'string' } }, required: [] },
  },
  {
    name: 'report_issue',
    description: 'Log a complaint or issue. Notifies admin.',
    input_schema: { type: 'object' as const, properties: { description: { type: 'string' }, severity: { type: 'string' } }, required: ['description'] },
  },
  {
    name: 'request_callback',
    description: 'Client wants to talk to a human. Notifies admin with context.',
    input_schema: { type: 'object' as const, properties: { reason: { type: 'string' } }, required: [] },
  },
  {
    name: 'remember',
    description: 'Save a fact about this client for future conversations.',
    input_schema: { type: 'object' as const, properties: { content: { type: 'string' }, type: { type: 'string' } }, required: ['content', 'type'] },
  },
]
