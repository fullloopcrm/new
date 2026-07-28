import type { BookingChecklist, Intent, NextStep } from './core-types'

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

