import { supabaseAdmin } from '@/lib/supabase'
import { EMPTY_CHECKLIST, type BookingChecklist, type Intent, type NextStep } from './core-types'

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
  if (!cl.rate) return { field: 'rate', instruction: 'Give time estimate RANGE for their size, then pricing: $69/hr (we supply everything) or $59/hr (client provides supplies). $89/hr for same-day. Their first visit is always at full price — no discount applies yet. But if they mention wanting recurring/weekly/biweekly/monthly service (in any form, not just asking about it), proactively mention the recurring discount as an incentive: $69/hr tier saves 20% weekly or 10% biweekly/monthly after the first visit; $59/hr tier saves 10% weekly or 5% biweekly/monthly. Use numbered options on SMS.' }
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

