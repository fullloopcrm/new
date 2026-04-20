import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAvailability } from '@/lib/availability'
import { getSettings } from '@/lib/settings'
import { notify } from '@/lib/notify'
import {
  detectIntent,
  isTeamMemberPhone,
  isDoNotServiceByPhone,
  filterToolsByIntent,
  EXTENDED_TOOLS,
  type Intent,
} from '@/lib/selena-core'
import { routeExtendedTool } from '@/lib/selena-handlers'

// ─── Selena Config Type ─────────────────────────────────────────────────────

export interface SelenaConfig {
  enabled?: boolean
  ai_name?: string
  tone?: string            // "warm" | "professional" | "casual"
  emoji?: string           // "one_per_message" | "minimal" | "none"
  language?: string        // "en" | "bilingual" | "es"

  pricing_tiers?: Array<{ label: string; price: number }>
  time_estimates?: Array<{ size: string; estimate: string }>
  emergency_rate?: number
  emergency_available?: boolean

  service_areas?: string[]
  areas_not_served?: string[]
  out_of_area_response?: string

  arrival_buffer_weekday?: number    // minutes
  arrival_buffer_weekend?: number    // minutes
  min_booking_notice?: number        // hours
  cancellation_policy?: string
  reschedule_policy?: string

  payment_methods?: string[]
  payment_timing?: string
  payment_instructions?: string

  common_qa?: Array<{ question: string; answer: string }>

  escalation_phone?: string
  escalation_email?: string
  escalation_triggers?: string[]
  escalation_message?: string

  confirmation_message?: string
  followup_enabled?: boolean
  followup_hours?: number
  review_link?: string
  rating_enabled?: boolean
  retention_enabled?: boolean
  retention_message?: string

  checklist_fields?: Array<{
    key: string
    enabled: boolean
    required: boolean
    question: string
    sms_options: string
  }>

  // ── Persona fields (onboarding-driven) — makes Selena sound like THIS business ──

  // Identity & voice
  business_description?: string
  business_story?: string
  opening_lines?: string[]
  sign_off?: string[]
  banned_phrases?: string[]

  // Sales & persuasion
  value_props?: string[]
  usps?: string[]
  social_proof?: string
  guarantees?: string[]
  sales_approach?: string
  objection_handlers?: Array<{ trigger: string; response: string }>

  // Policies
  refund_policy?: string
  first_time_restrictions?: string
  liability_statement?: string

  // Operational rules
  never_do?: string[]
  always_ask?: string[]
  team_intro?: string

  // Lead qualification
  qualifying_questions?: string[]
  disqualifiers?: string[]

  // Upsell / cross-sell
  addons?: Array<{ label: string; price: string }>
  upsell_triggers?: string[]
  recurring_incentive?: string
  referral_program_pitch?: string

  // User-added custom fields per category
  custom_fields?: Array<{ category: string; label: string; value: string }>
}

// ─── Selena Config Cache ────────────────────────────────────────────────────

const configCache = new Map<string, { data: SelenaConfig; time: number }>()
const CONFIG_CACHE_TTL = 60_000

export function clearSelenaConfigCache(tenantId?: string) {
  if (tenantId) configCache.delete(tenantId)
  else configCache.clear()
}

async function getSelenaConfig(tenantId: string): Promise<SelenaConfig> {
  const now = Date.now()
  const cached = configCache.get(tenantId)
  if (cached && now - cached.time < CONFIG_CACHE_TTL) return cached.data

  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('selena_config')
      .eq('id', tenantId)
      .single()
    const config: SelenaConfig = tenant?.selena_config || {}
    configCache.set(tenantId, { data: config, time: now })
    return config
  } catch {
    return {}
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BookingChecklist {
  service_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  rate: number | null
  day: string | null
  date: string | null
  time: string | null
  name: string | null
  phone: string | null
  address: string | null
  email: string | null
  notes: string | null
  rating: number | null
  channel: 'sms' | 'web' | 'email' | null
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
  address: null, email: null, notes: null, rating: null, channel: null,
  status: 'greeting',
}

// ─── Error Monitoring ───────────────────────────────────────────────────────

async function selenaError(tenantId: string, context: string, err: unknown, conversationId?: string) {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : ''
  console.error(`[Selena:${tenantId}] ${context}:`, err)
  await notify({
    tenantId,
    type: 'selena_error' as never,
    title: `Selena Error — ${context}`,
    message: `${msg}${conversationId ? `\nConversation: ${conversationId}` : ''}${stack ? `\n${stack}` : ''}`,
  }).catch(() => {})
}

// ─── Anthropic Client ───────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// ─── Default checklist field order ──────────────────────────────────────────

const DEFAULT_CHECKLIST_FIELDS: Array<{ key: string; enabled: boolean; required: boolean; question: string; sms_options: string }> = [
  { key: 'service_type', enabled: true, required: true, question: 'Ask what type of service they need.', sms_options: '' },
  { key: 'bedrooms', enabled: true, required: true, question: 'Ask how many bedrooms and bathrooms (or relevant size details).', sms_options: '1 bed 1 bath,2 bed 1 bath,3 bed 2 bath' },
  { key: 'rate', enabled: true, required: true, question: 'Give pricing and ask which rate.', sms_options: '' },
  { key: 'day', enabled: true, required: true, question: 'Ask what day works best.', sms_options: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' },
  { key: 'time', enabled: true, required: true, question: 'Ask what time works best.', sms_options: '8am,10am,12pm,2pm,4pm' },
  { key: 'name', enabled: true, required: true, question: 'Ask for their full name (first and last).', sms_options: '' },
  { key: 'phone', enabled: true, required: true, question: 'Ask for their best phone number.', sms_options: '' },
  { key: 'address', enabled: true, required: true, question: 'Ask for their full address — street, apt/unit, city, and zip. Confirm it back.', sms_options: '' },
  { key: 'email', enabled: true, required: true, question: 'Ask for their email address.', sms_options: '' },
  { key: 'notes', enabled: true, required: false, question: 'Ask if they have any special notes or requests. Then do the recap.', sms_options: '' },
]

// ─── State Machine ──────────────────────────────────────────────────────────

export function getNextStep(cl: BookingChecklist, config?: SelenaConfig): NextStep {
  if (cl.status === 'recap') return { field: null, instruction: 'The client has seen the recap OR you need to do the recap now. If the client just said "yes" or confirmed, call create_booking immediately to lock in the booking — do NOT recap again or ask for more info. If notes haven\'t been asked yet, ask "Any notes or special requests?" and wait for their answer before doing the recap. If they say no/none, proceed. If the recap hasn\'t been shown yet, do it now using ALL collected info.' }
  if (cl.status === 'confirmed') return { field: null, instruction: 'Booking confirmed. Thank them warmly, tell them booking is pending and will be confirmed by the team. Then ask: "How would you rate this chat? 1-5"' }
  if (cl.status === 'rating') return { field: 'rating', instruction: 'They gave a rating. Thank them. If 5: "That means a lot!" If below: "We appreciate the feedback." Then close.' }
  if (cl.status === 'closed') return { field: null, instruction: 'Conversation complete.' }

  const fields = config?.checklist_fields?.length ? config.checklist_fields : DEFAULT_CHECKLIST_FIELDS

  for (const f of fields) {
    if (!f.enabled) continue
    const key = f.key as keyof BookingChecklist

    // Check if field is filled
    if (key === 'bedrooms') {
      if (cl.bedrooms === null || cl.bathrooms === null) return { field: f.key, instruction: f.question }
    } else if (key === 'notes') {
      // notes is always last — if we reach it, everything else is filled
      return { field: 'notes', instruction: f.question }
    } else {
      const val = cl[key]
      if (val === null || val === undefined || val === '') {
        if (f.required) return { field: f.key, instruction: f.question }
      }
    }
  }

  return { field: 'notes', instruction: 'All required info is collected. Ask if they have any special notes or requests — wait for their answer. If they provide notes, call save_info with those notes. If they say no/none/nothing, call save_info with notes set to "none". Either way you MUST call save_info before proceeding.' }
}

// ─── Checklist Prompt Builder ───────────────────────────────────────────────

export function buildChecklistPrompt(cl: BookingChecklist, next: NextStep): string {
  const fields = [
    `service_type: ${cl.service_type || '-- MISSING'}`,
    `bedrooms: ${cl.bedrooms !== null ? cl.bedrooms : '-- MISSING'}`,
    `bathrooms: ${cl.bathrooms !== null ? cl.bathrooms : '-- MISSING'}`,
    `rate: ${cl.rate ? '$' + cl.rate + '/hr' : '-- MISSING'}`,
    `day: ${cl.day || '-- MISSING'}`,
    `time: ${cl.time || '-- MISSING'}`,
    `name: ${cl.name || '-- MISSING'}`,
    `phone: ${cl.phone || '-- MISSING'}`,
    `address: ${cl.address || '-- MISSING'}`,
    `email: ${cl.email || '-- MISSING'}`,
    `notes: ${cl.notes || '(none yet)'}`,
  ]
  const missing = fields.filter(f => f.includes('MISSING')).length
  const header = missing === 0
    ? 'BOOKING CHECKLIST — ALL COLLECTED. Ask about notes if not done, then recap.'
    : `BOOKING CHECKLIST — ${missing} items still needed`

  return `\n\n${header}\nstatus: ${cl.status}\n${fields.join('\n')}\n\nNEXT: ${next.instruction}`
}

// ─── Quick Replies ──────────────────────────────────────────────────────────

export function getQuickReplies(cl: BookingChecklist, next: NextStep, serviceTypes?: string[], config?: SelenaConfig): string[] {
  if (cl.status === 'greeting') return serviceTypes?.slice(0, 3) || ['I need a service', 'Get a quote', 'Check availability']
  if (cl.status === 'recap') return ['Yes, all correct!', 'I need to change something']
  if (cl.status === 'confirmed') return ['1', '2', '3', '4', '5']
  if (cl.status === 'rating' || cl.status === 'closed') return []

  // Check config checklist_fields for sms_options on the current field
  const fields = config?.checklist_fields?.length ? config.checklist_fields : DEFAULT_CHECKLIST_FIELDS
  const fieldConfig = fields.find(f => f.key === next.field && f.enabled)
  if (fieldConfig?.sms_options) {
    const opts = fieldConfig.sms_options.split(',').map(s => s.trim()).filter(Boolean)
    if (opts.length > 0) return opts
  }

  // Fallback defaults
  switch (next.field) {
    case 'service_type': return serviceTypes?.slice(0, 4) || ['Cleaning', 'Deep clean', 'Move-in/out']
    case 'bedrooms': return ['1 bed 1 bath', '2 bed 1 bath', '3 bed 2 bath']
    case 'rate': return []
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

// ─── Dynamic System Prompt ──────────────────────────────────────────────────

export async function buildSystemPromptForPreview(tenantId: string): Promise<string> {
  const config = await getSelenaConfig(tenantId)
  return buildSystemPrompt(tenantId, config)
}

async function buildSystemPrompt(tenantId: string, config: SelenaConfig): Promise<string> {
  const s = await getSettings(tenantId)
  const bizName = s.business_name || 'the business'
  const services = s.service_types.filter(st => st.active).map(st => st.name).join(', ')
  const rate = s.standard_rate || 0
  const startH = s.business_hours_start || 9
  const endH = s.business_hours_end || 17

  // AI name — config overrides default
  const aiName = config.ai_name || 'Selena'

  // Personality tone
  const toneMap: Record<string, string> = {
    warm: 'Warm, welcoming, grateful, real. Say please and thank you naturally. Make the client feel appreciated — like they\'re talking to a real person who genuinely cares. A little funny when it fits. Not a bot. Never sound like one.',
    professional: 'Professional, courteous, and efficient. Clear and respectful. Polished but not stiff. Keep it business-friendly.',
    casual: 'Friendly, laid-back, conversational. Like texting a helpful friend. Keep it real and easy-going.',
  }
  const personality = toneMap[config.tone || ''] || toneMap.warm

  // Emoji style
  const emojiMap: Record<string, string> = {
    one_per_message: '😊 only emoji. Once per message max.',
    minimal: 'Use emoji sparingly — only when it really fits.',
    none: 'No emoji at all. Text only.',
  }
  const emojiStyle = emojiMap[config.emoji || ''] || emojiMap.one_per_message

  // Language
  const langMap: Record<string, string> = {
    en: 'Respond in English.',
    es: 'Respond in Spanish.',
    bilingual: 'If they text in Spanish, respond in Spanish. Otherwise respond in English.',
  }
  const langInstruction = langMap[config.language || ''] || langMap.bilingual

  // Payment
  const paymentMethods = config.payment_methods?.length
    ? config.payment_methods.join(', ')
    : s.payment_methods?.join(', ') || 'payment at time of service'
  const paymentInstructions = config.payment_instructions || ''
  const paymentTiming = config.payment_timing || ''

  // Pricing tiers
  let pricingSection = `- Rate: ${rate > 0 ? `$${rate}/hr` : 'varies by service'}`
  if (config.pricing_tiers?.length) {
    pricingSection = '- Pricing:\n' + config.pricing_tiers.map(t => `  • ${t.label}: $${t.price}/hr`).join('\n')
  }
  if (config.time_estimates?.length) {
    pricingSection += '\n- Time estimates:\n' + config.time_estimates.map(t => `  • ${t.size}: ${t.estimate}`).join('\n')
  }
  if (config.emergency_available && config.emergency_rate) {
    pricingSection += `\n- Emergency/same-day rate: $${config.emergency_rate}/hr`
  }

  // Service areas
  let areaSection = ''
  if (config.service_areas?.length) {
    areaSection += `\n- Service areas: ${config.service_areas.join(', ')}`
  }
  if (config.areas_not_served?.length) {
    areaSection += `\n- NOT served: ${config.areas_not_served.join(', ')}`
  }
  if (config.out_of_area_response) {
    areaSection += `\n- Out of area response: "${config.out_of_area_response}"`
  }

  // Policies
  let policiesSection = ''
  if (config.cancellation_policy) policiesSection += `\n- Cancellation: ${config.cancellation_policy}`
  if (config.reschedule_policy) policiesSection += `\n- Reschedule: ${config.reschedule_policy}`
  if (config.min_booking_notice) policiesSection += `\n- Minimum booking notice: ${config.min_booking_notice} hours`

  // Common Q&A
  let qaSection = ''
  if (config.common_qa?.length) {
    qaSection = '\n\nCOMMON Q&A (use these when relevant):\n' + config.common_qa.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')
  }

  // Persona — makes Selena sound like THIS business
  let personaSection = ''
  if (config.business_description) personaSection += `\n\nABOUT THE BUSINESS: ${config.business_description}`
  if (config.business_story) personaSection += `\nSTORY: ${config.business_story}`
  if (config.value_props?.length) personaSection += `\nVALUE PROPS: ${config.value_props.join(' • ')}`
  if (config.usps?.length) personaSection += `\nUSPs vs COMPETITORS: ${config.usps.join(' • ')}`
  if (config.social_proof) personaSection += `\nSOCIAL PROOF: ${config.social_proof}`
  if (config.guarantees?.length) personaSection += `\nGUARANTEES: ${config.guarantees.join(' • ')}`
  if (config.sales_approach) personaSection += `\nSALES APPROACH: ${config.sales_approach}`
  if (config.objection_handlers?.length) {
    personaSection += `\n\nOBJECTION HANDLERS:\n` + config.objection_handlers.map(o => `- If client says "${o.trigger}": ${o.response}`).join('\n')
  }
  if (config.opening_lines?.length) personaSection += `\n\nOPENING LINES (rotate): ${config.opening_lines.map(l => `"${l}"`).join(' / ')}`
  if (config.sign_off?.length) personaSection += `\nSIGN-OFFS (rotate): ${config.sign_off.map(l => `"${l}"`).join(' / ')}`
  if (config.banned_phrases?.length) personaSection += `\nNEVER USE: ${config.banned_phrases.map(p => `"${p}"`).join(', ')}`
  if (config.refund_policy) personaSection += `\nREFUND POLICY: ${config.refund_policy}`
  if (config.first_time_restrictions) personaSection += `\nFIRST-TIME RESTRICTIONS: ${config.first_time_restrictions}`
  if (config.liability_statement) personaSection += `\nLIABILITY: ${config.liability_statement}`
  if (config.never_do?.length) personaSection += `\nNEVER DO: ${config.never_do.join(' • ')}`
  if (config.always_ask?.length) personaSection += `\nALWAYS ASK: ${config.always_ask.join(' • ')}`
  if (config.team_intro) personaSection += `\nTEAM INTRO: ${config.team_intro}`
  if (config.qualifying_questions?.length) personaSection += `\nQUALIFY WITH: ${config.qualifying_questions.join(' • ')}`
  if (config.disqualifiers?.length) personaSection += `\nDISQUALIFY IF: ${config.disqualifiers.join(' • ')}`
  if (config.addons?.length) personaSection += `\nADDONS: ${config.addons.map(a => `${a.label} (${a.price})`).join(', ')}`
  if (config.upsell_triggers?.length) personaSection += `\nUPSELL WHEN: ${config.upsell_triggers.join(' • ')}`
  if (config.recurring_incentive) personaSection += `\nRECURRING OFFER: ${config.recurring_incentive}`
  if (config.referral_program_pitch) personaSection += `\nREFERRAL PITCH: ${config.referral_program_pitch}`
  if (config.custom_fields?.length) {
    const byCat: Record<string, string[]> = {}
    for (const f of config.custom_fields) {
      if (!byCat[f.category]) byCat[f.category] = []
      byCat[f.category].push(`${f.label}: ${f.value}`)
    }
    for (const [cat, items] of Object.entries(byCat)) {
      personaSection += `\n${cat.toUpperCase()}: ${items.join(' • ')}`
    }
  }
  qaSection += personaSection

  // Escalation
  const escalationMsg = config.escalation_message
    || 'Say "Let me have someone look at this — one sec 😊" then [ESCALATE: reason]'
  let escalationSection = `ESCALATION: ${escalationMsg}`
  if (config.escalation_phone) escalationSection += `\n- Escalation phone: ${config.escalation_phone}`
  if (config.escalation_email) escalationSection += `\n- Escalation email: ${config.escalation_email}`
  if (config.escalation_triggers?.length) {
    escalationSection += `\n- Auto-escalate when: ${config.escalation_triggers.join('; ')}`
  }

  // Post-confirmation
  const confirmationMsg = config.confirmation_message
    || 'Thank you [Name]! We appreciate you. Your booking is pending and will be confirmed by our team shortly — you\'ll be notified once it\'s all set!'

  // Arrival buffer for recap
  let arrivalNote = ''
  if (config.arrival_buffer_weekday || config.arrival_buffer_weekend) {
    const wd = config.arrival_buffer_weekday || 30
    const we = config.arrival_buffer_weekend || 30
    arrivalNote = `\n- Arrival window: weekdays ±${wd} min, weekends ±${we} min. Mention in recap.`
  }

  return `You are ${aiName}, the booking concierge for ${bizName}.

PERSONALITY: ${personality}

STYLE:
- SHORT but warm. "Perfect, thank you!" is a full response.
- ONE question per message. Never combine two asks.
- Match their energy. One line = one line.
- Say "please" when asking for info. Say "thank you" when they give it.
- ${emojiStyle}
- NEVER say: "certainly" "absolutely" "of course" "great question" "happy to help"
- Under 300 chars. Max 480. Recap exception.
- Plain text only. No markdown.
- ${langInstruction}
- On SMS: give numbered options (1. Option A  2. Option B) so they can reply with a number.

BUSINESS INFO (share when asked):
- Business: ${bizName}
- Services: ${services || 'various services'}
${pricingSection}
- Hours: ${startH > 12 ? startH - 12 : startH}${startH >= 12 ? 'PM' : 'AM'} to ${endH > 12 ? endH - 12 : endH}${endH >= 12 ? 'PM' : 'AM'}
- Payment: ${paymentMethods}${paymentTiming ? `\n- Payment timing: ${paymentTiming}` : ''}${paymentInstructions ? `\n- Payment instructions: ${paymentInstructions}` : ''}
${s.business_phone ? `- Phone: ${s.business_phone}` : ''}
${s.business_website ? `- Website: ${s.business_website}` : ''}${areaSection}${policiesSection}${arrivalNote}
${qaSection}

RECAP: After all info collected, read it all back and ask to confirm.

AFTER RECAP — CRITICAL:
When the client confirms the recap (says "yes", "correct", "looks good", "confirmed", etc.), IMMEDIATELY call create_booking. Do NOT ask for more info, do NOT recap again, do NOT ask for email or anything else. Everything is already collected. Just book it.

POST-CONFIRMATION: "${confirmationMsg}"

${escalationSection}

RETURNING CLIENTS: If CLIENT PROFILE is below, use it. Don't re-ask for info you have.

The BOOKING CHECKLIST below shows what you have and what's missing. Ask for the NEXT MISSING item. When complete, do the recap. NEVER re-ask for something already collected — if the checklist shows a value, it IS saved. Do NOT ask for email, name, phone, or address again if the checklist already has them.

CRITICAL: When a client answers a question about your service, answer their question AND continue the booking flow. Do not lose track of where you are. Check the checklist — if a field has a value, move on to the next missing field or to the recap.`
}

// ─── Tool Definitions ───────────────────────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'create_client',
    description: 'Create a new client record. Call when you learn their name.',
    input_schema: {
      type: 'object' as const,
      properties: { name: { type: 'string', description: 'Client full name' } },
      required: ['name'],
    },
  },
  {
    name: 'save_info',
    description: 'Save booking info to checklist. Call every time client gives info.',
    input_schema: {
      type: 'object' as const,
      properties: {
        service_type: { type: 'string' }, bedrooms: { type: 'number' }, bathrooms: { type: 'number' },
        rate: { type: 'number' }, day: { type: 'string' }, date: { type: 'string' },
        time: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' },
        address: { type: 'string' }, email: { type: 'string' }, notes: { type: 'string' },
        rating: { type: 'number', description: 'Chat rating 1-5' },
      },
      required: [],
    },
  },
  {
    name: 'check_availability',
    description: 'Check if a date/time is available. Call when client mentions a day.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'e.g. "10:00 AM"' },
      },
      required: ['date'],
    },
  },
  {
    name: 'create_booking',
    description: 'Create PENDING booking after client confirms recap.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string' }, time: { type: 'string' },
        service_type: { type: 'string' }, hourly_rate: { type: 'number' },
        estimated_hours: { type: 'number' },
      },
      required: ['date', 'time', 'service_type', 'hourly_rate'],
    },
  },
  {
    name: 'add_to_waitlist',
    description: 'Add client to waitlist when no availability. Call when suggesting a different day fails.',
    input_schema: {
      type: 'object' as const,
      properties: {
        preferred_date: { type: 'string' }, preferred_time: { type: 'string' },
      },
      required: [],
    },
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function buildCalendarContext(): string {
  const now = new Date()
  const fullDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const days: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    days.push(`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} = ${d.toLocaleDateString('en-CA')}`)
  }
  return `\n\nToday is ${fullDate}.\nCALENDAR:\n${days.join('\n')}\nUse this to resolve "this Wednesday" etc.`
}

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

// ─── Tool Handlers ──────────────────────────────────────────────────────────

async function handleCreateClient(tenantId: string, input: Record<string, unknown>, conversationId: string, result: SelenaResult): Promise<string> {
  try {
    const name = input.name as string
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('phone, client_id').eq('id', conversationId).single()

    if (convo?.client_id) {
      await supabaseAdmin.from('clients').update({ name }).eq('id', convo.client_id)
      await updateChecklist(conversationId, { name })
      return JSON.stringify({ success: true, existing: true })
    }

    const phone = convo?.phone || `web-${conversationId.slice(0, 8)}`
    const { data: client } = await supabaseAdmin
      .from('clients')
      .insert({ tenant_id: tenantId, name, phone, status: 'potential' })
      .select('id').single()

    if (client) {
      await supabaseAdmin.from('sms_conversations')
        .update({ client_id: client.id, name, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
      await updateChecklist(conversationId, { name })
      result.clientCreated = true
    }
    return JSON.stringify({ success: true })
  } catch (err) {
    await selenaError(tenantId, 'create_client', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

async function handleSaveInfo(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    const clUpdates: Partial<BookingChecklist> = {}
    if (input.service_type) clUpdates.service_type = input.service_type as string
    if (input.bedrooms !== undefined) clUpdates.bedrooms = input.bedrooms as number
    if (input.bathrooms !== undefined) clUpdates.bathrooms = input.bathrooms as number
    if (input.rate) clUpdates.rate = input.rate as number
    if (input.day) clUpdates.day = input.day as string
    if (input.date) clUpdates.date = input.date as string
    if (input.time) clUpdates.time = input.time as string
    if (input.name) clUpdates.name = input.name as string
    if (input.phone) clUpdates.phone = input.phone as string
    if (input.address) clUpdates.address = input.address as string
    if (input.email) clUpdates.email = input.email as string
    if (input.notes) clUpdates.notes = input.notes as string
    if (input.rating) { clUpdates.rating = input.rating as number; clUpdates.status = 'closed' }

    await updateChecklist(conversationId, clUpdates)

    // Mirror to client record
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id').eq('id', conversationId).single()
    if (convo?.client_id) {
      const cu: Record<string, unknown> = {}
      if (input.phone) cu.phone = input.phone
      if (input.address) cu.address = input.address
      if (input.email) cu.email = input.email
      if (input.notes) {
        const { data: c } = await supabaseAdmin.from('clients').select('notes').eq('id', convo.client_id).single()
        cu.notes = c?.notes ? `${c.notes}\n${input.notes}` : input.notes
      }
      if (Object.keys(cu).length > 0) {
        await supabaseAdmin.from('clients').update(cu).eq('id', convo.client_id).eq('tenant_id', tenantId)
      }
    }

    // Mirror to conversation columns
    const cc: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.service_type) cc.service_type = input.service_type
    if (input.rate) cc.hourly_rate = input.rate
    if (input.date) cc.preferred_date = input.date
    if (input.time) cc.preferred_time = input.time
    await supabaseAdmin.from('sms_conversations').update(cc).eq('id', conversationId)

    return JSON.stringify({ success: true })
  } catch (err) {
    await selenaError(tenantId, 'save_info', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

async function handleCheckAvailability(tenantId: string, input: Record<string, unknown>): Promise<string> {
  try {
    const date = input.date as string
    const availability = await checkAvailability(tenantId, date)

    if (availability.sameDay) {
      return JSON.stringify({ sameDay: true, message: 'Same-day booking — confirm with team first.' })
    }

    const open = availability.slots.filter((s: { available: boolean }) => s.available).map((s: { time: string }) => s.time)
    if (open.length === 0) {
      return JSON.stringify({ available: false, waitlist: true, message: `Nothing open on ${date}. Offer to add them to the waiting list.` })
    }

    const requestedTime = input.time as string | undefined
    if (requestedTime) {
      const normalized = requestedTime.replace(/\s+/g, ' ').trim().toUpperCase()
      const isAvailable = open.some((t: string) => t.toUpperCase().replace(/\s+/g, ' ') === normalized)
      if (isAvailable) return JSON.stringify({ available: true, message: `${requestedTime} on ${date} is available.` })
      return JSON.stringify({ available: false, alternative: open[0], message: `${requestedTime} isn't available. Suggest ${open[0]}.` })
    }

    return JSON.stringify({ available: true, suggested_times: open.slice(0, 3), message: `Share 2-3 of these times.` })
  } catch (err) {
    await selenaError(tenantId, 'check_availability', err)
    return JSON.stringify({ available: true, message: 'Unable to check right now. Proceed and team will confirm.' })
  }
}

async function handleCreateBooking(tenantId: string, input: Record<string, unknown>, conversationId: string, result: SelenaResult): Promise<string> {
  try {
    const { data: convo } = await supabaseAdmin
      .from('sms_conversations').select('client_id').eq('id', conversationId).single()
    if (!convo?.client_id) return JSON.stringify({ error: 'No client linked' })

    const date = input.date as string
    const time = input.time as string
    const serviceType = input.service_type as string
    const hourlyRate = input.hourly_rate as number
    const estimatedHours = (input.estimated_hours as number) || 2

    const parsed = parseTime(time)
    if (!parsed) return JSON.stringify({ error: 'Invalid time format' })

    const startTimeStr = `${date}T${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`
    const endHours = parsed.hours + estimatedHours
    const endTimeStr = `${date}T${endHours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}:00`

    // Prevent duplicates
    const { data: existing } = await supabaseAdmin.from('bookings').select('id')
      .eq('tenant_id', tenantId).eq('client_id', convo.client_id).eq('start_time', startTimeStr)
      .in('status', ['pending', 'scheduled', 'in_progress']).limit(1)
    if (existing && existing.length > 0) {
      return JSON.stringify({ success: true, bookingId: existing[0].id, message: 'Booking already exists' })
    }

    const { data: booking, error } = await supabaseAdmin.from('bookings').insert({
      tenant_id: tenantId, client_id: convo.client_id,
      start_time: startTimeStr, end_time: endTimeStr,
      status: 'pending', notes: `SMS booking | ${serviceType}`,
      price: hourlyRate * estimatedHours * 100,
    }).select('id').single()

    if (error) throw error

    await supabaseAdmin.from('sms_conversations').update({
      booking_id: booking.id, completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), outcome: 'booked',
    }).eq('id', conversationId)

    await updateChecklist(conversationId, { status: 'confirmed' })
    result.bookingCreated = true
    return JSON.stringify({ success: true, bookingId: booking.id })
  } catch (err) {
    await selenaError(tenantId, 'create_booking', err, conversationId)
    return JSON.stringify({ success: true, message: 'Booking noted — team will confirm' })
  }
}

async function handleAddToWaitlist(tenantId: string, input: Record<string, unknown>, conversationId: string): Promise<string> {
  try {
    await supabaseAdmin.from('sms_conversations').update({
      outcome: 'waitlisted', updated_at: new Date().toISOString(),
    }).eq('id', conversationId)

    const cl = await loadChecklist(conversationId)
    await notify({
      tenantId,
      type: 'waitlist' as never,
      title: 'New Waitlist Entry',
      message: `${cl.name || 'Client'} added to waitlist. Preferred: ${input.preferred_date || cl.day || 'TBD'} ${input.preferred_time || cl.time || ''}`,
    }).catch(() => {})

    return JSON.stringify({ success: true, message: 'Added to waitlist' })
  } catch (err) {
    await selenaError(tenantId, 'add_to_waitlist', err, conversationId)
    return JSON.stringify({ success: true })
  }
}

// ─── Client Profile ─────────────────────────────────────────────────────────

export async function getClientProfile(tenantId: string, phone: string): Promise<string> {
  try {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, address, notes, active, created_at')
      .eq('tenant_id', tenantId).ilike('phone', `%${cleanPhone}%`).limit(1).single()
    if (!client) return JSON.stringify({ error: 'Client not found' })

    const { data: recentBookings } = await supabaseAdmin.from('bookings')
      .select('id, start_time, service_type, price, status, team_members(name)')
      .eq('tenant_id', tenantId).eq('client_id', client.id)
      .in('status', ['completed', 'scheduled', 'in_progress', 'pending'])
      .order('start_time', { ascending: false }).limit(5)

    const upcoming = (recentBookings || [])
      .filter(b => ['scheduled', 'pending', 'in_progress'].includes(b.status))
      .map(b => ({ booking_id: b.id, date: b.start_time?.split('T')[0], service_type: b.service_type, status: b.status }))

    const { data: prevMessages } = await supabaseAdmin.from('sms_conversation_messages')
      .select('direction, message')
      .in('conversation_id', (await supabaseAdmin.from('sms_conversations').select('id').eq('client_id', client.id).limit(3)).data?.map(c => c.id) || [])
      .order('created_at', { ascending: false }).limit(20)

    return JSON.stringify({
      name: client.name, address: client.address, email: client.email,
      notes: client.notes, active: client.active, upcoming,
      last_rate: recentBookings?.[0]?.price ? Math.round((recentBookings[0].price / 100) / 2) : null,
      previous_messages: (prevMessages || []).reverse().map(m => ({ from: m.direction === 'inbound' ? 'client' : 'selena', message: m.message })),
    })
  } catch (err) {
    await selenaError(tenantId, 'getClientProfile', err)
    return JSON.stringify({ error: 'Failed to fetch profile' })
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function askSelena(
  tenantId: string,
  channel: 'sms' | 'web' | 'email',
  message: string,
  conversationId: string,
  phone?: string,
): Promise<SelenaResult> {
  const result: SelenaResult = { text: '', checklist: EMPTY_CHECKLIST }

  try {
    // 0a. Team-member gate — staff phones must NOT enter the booking flow.
    // Ported from nycmaid: cleaners were being booked as clients.
    if (channel === 'sms' && phone) {
      const tm = await isTeamMemberPhone(tenantId, phone)
      if (tm.isTeamMember) {
        result.text = `Hey ${tm.name?.split(' ')[0] || 'team'}! This number is for clients. Use the team portal or text your manager directly. 😊`
        result.checklist = await loadChecklist(conversationId)
        return result
      }

      // 0b. DNS gate — never contact do_not_service clients.
      if (await isDoNotServiceByPhone(tenantId, phone)) {
        result.text = ''
        result.checklist = await loadChecklist(conversationId)
        return result
      }
    }

    // 0c. Load selena config
    const config = await getSelenaConfig(tenantId)

    // 1. Load checklist
    let checklist = await loadChecklist(conversationId)
    if (checklist.status === 'greeting') {
      checklist = await updateChecklist(conversationId, { status: 'collecting' })
    }

    // 1b. Intent detection — classifies BEFORE the flow runs.
    // Surfaces routing signal even if not yet wired into tool selection.
    const intent: Intent = detectIntent(message, checklist.status)

    // 2. State machine
    const nextStep = getNextStep(checklist, config)

    // 3. Build system prompt
    const systemPromptBase = await buildSystemPrompt(tenantId, config)
    const calendar = buildCalendarContext()
    const checklistPrompt = buildChecklistPrompt(checklist, nextStep)

    let clientContext = ''
    // SMS: look up by conversation phone. Web: use provided phone if returning client.
    const lookupPhone = channel === 'sms'
      ? await supabaseAdmin.from('sms_conversations').select('phone').eq('id', conversationId).single().then(r => r.data?.phone)
      : phone || null
    if (lookupPhone && !lookupPhone.startsWith('web-')) {
      const profile = await getClientProfile(tenantId, lookupPhone)
      if (!profile.includes('"error"')) clientContext = `\n\nCLIENT PROFILE:\n${profile}`
    }

    const intentHint = intent !== 'booking' && intent !== 'greeting'
      ? `\n\nDETECTED INTENT: ${intent} — handle this BEFORE continuing booking flow if it's not a booking signal.`
      : ''

    const systemPrompt = systemPromptBase + calendar + '\n' + checklistPrompt + clientContext + intentHint

    // 4. Load transcript from DB
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

    // 5. Claude tool loop
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    try {
      let currentMessages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }> = [...messages]

      // Combine baseline tools + extended (account, payment, dispute, etc.), then filter by intent
      const allTools: Anthropic.Messages.Tool[] = [...TOOLS, ...EXTENDED_TOOLS]
      const intentTools = filterToolsByIntent(allTools, intent)
      const activeTools = intentTools.length > 0 ? intentTools : TOOLS

      for (let i = 0; i < 5; i++) {
        const response = await getClient().messages.create(
          { model: 'claude-haiku-4-5-20251001', max_tokens: 700, system: systemPrompt, messages: currentMessages, tools: activeTools },
          { signal: controller.signal }
        )

        const toolBlocks = response.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
        const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')

        // Always capture text — Claude often returns text + tool_use together
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
              case 'create_client': toolResult = await handleCreateClient(tenantId, inp, conversationId, result); break
              case 'save_info': toolResult = await handleSaveInfo(tenantId, inp, conversationId); break
              case 'check_availability': toolResult = await handleCheckAvailability(tenantId, inp); break
              case 'create_booking': toolResult = await handleCreateBooking(tenantId, inp, conversationId, result); break
              case 'add_to_waitlist': toolResult = await handleAddToWaitlist(tenantId, inp, conversationId); break
              default: {
                const extended = await routeExtendedTool(tool.name, tenantId, inp, conversationId)
                toolResult = extended ?? JSON.stringify({ error: `Unknown tool: ${tool.name}` })
              }
            }
          } catch (toolErr) {
            await selenaError(tenantId, `tool_loop:${tool.name}`, toolErr, conversationId)
            toolResult = JSON.stringify({ success: true })
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: toolResult, ...(toolResult.includes('"error"') ? { is_error: true } : {}) })
        }

        currentMessages.push({ role: 'user', content: toolResults })
      }
      // If tool loop finished without capturing text, force a text-only response
      if (!result.text) {
        const fallback = await getClient().messages.create(
          { model: 'claude-haiku-4-5-20251001', max_tokens: 700, system: systemPrompt, messages: currentMessages },
          { signal: controller.signal }
        )
        const fallbackText = fallback.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        if (fallbackText.length > 0) result.text = fallbackText.map(b => b.text).join(' ').trim()
      }
    } finally {
      clearTimeout(timeout)
    }

    if (!result.text) {
      await selenaError(tenantId, 'empty_response', new Error('Selena returned no text'), conversationId)
      result.text = "Sorry, nothing came through on my end! Could you resend that? 😊"
    }
    if (result.text.length > 600) result.text = result.text.slice(0, 597) + '...'

    result.checklist = await loadChecklist(conversationId)
    return result
  } catch (err) {
    await selenaError(tenantId, 'askSelena_main', err, conversationId)
    result.text = 'Sorry, something went wrong. Please try again or call us directly.'
    return result
  }
}
