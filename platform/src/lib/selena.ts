import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAvailability } from '@/lib/availability'
import { getSettings } from '@/lib/settings'
import { notify } from '@/lib/notify'

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
  channel: 'sms' | 'web' | null
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

// ─── State Machine ──────────────────────────────────────────────────────────

export function getNextStep(cl: BookingChecklist): NextStep {
  if (cl.status === 'recap') return { field: null, instruction: 'Do the recap now using ALL collected info.' }
  if (cl.status === 'confirmed') return { field: null, instruction: 'Booking confirmed. Thank them warmly, tell them booking is pending and will be confirmed by the team. Then ask: "How would you rate this chat? 1-5"' }
  if (cl.status === 'rating') return { field: 'rating', instruction: 'They gave a rating. Thank them. If 5: "That means a lot!" If below: "We appreciate the feedback." Then close.' }
  if (cl.status === 'closed') return { field: null, instruction: 'Conversation complete.' }

  if (!cl.service_type) return { field: 'service_type', instruction: 'Ask what type of service they need.' }
  if (cl.bedrooms === null || cl.bathrooms === null) return { field: 'bedrooms', instruction: 'Ask how many bedrooms and bathrooms (or relevant size details).' }
  if (!cl.rate) return { field: 'rate', instruction: 'Give pricing and ask which rate.' }
  if (!cl.day) return { field: 'day', instruction: 'Ask what day works best.' }
  if (!cl.time) return { field: 'time', instruction: 'Ask what time works best.' }
  if (!cl.name) return { field: 'name', instruction: 'Ask for their full name (first and last).' }
  if (!cl.phone) return { field: 'phone', instruction: 'Ask for their best phone number.' }
  if (!cl.address) return { field: 'address', instruction: 'Ask for their full address — street, apt/unit, city, and zip. Confirm it back.' }
  if (!cl.email) return { field: 'email', instruction: 'Ask for their email address.' }

  return { field: 'notes', instruction: 'Ask if they have any special notes or requests. Then do the recap.' }
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

export function getQuickReplies(cl: BookingChecklist, next: NextStep, serviceTypes?: string[]): string[] {
  if (cl.status === 'greeting') return serviceTypes?.slice(0, 3) || ['I need a service', 'Get a quote', 'Check availability']
  if (cl.status === 'recap') return ['Yes, all correct!', 'I need to change something']
  if (cl.status === 'confirmed') return ['1', '2', '3', '4', '5']
  if (cl.status === 'rating' || cl.status === 'closed') return []

  switch (next.field) {
    case 'service_type': return serviceTypes?.slice(0, 4) || ['Cleaning', 'Deep clean', 'Move-in/out']
    case 'bedrooms': return ['1 bed 1 bath', '2 bed 1 bath', '3 bed 2 bath']
    case 'rate': return [] // rates vary per tenant, let Selena present them
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
      if (updated.notes !== null || step.field === null) {
        updated.status = 'recap'
      }
    }
  }

  await supabaseAdmin
    .from('sms_conversations')
    .update({ booking_checklist: updated, updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return updated
}

// ─── Dynamic System Prompt ──────────────────────────────────────────────────

async function buildSystemPrompt(tenantId: string): Promise<string> {
  const s = await getSettings(tenantId)
  const bizName = s.business_name || 'the business'
  const services = s.service_types.filter(st => st.active).map(st => st.name).join(', ')
  const rate = s.standard_rate || 0
  const startH = s.business_hours_start || 9
  const endH = s.business_hours_end || 17
  const payment = s.payment_methods?.join(', ') || 'payment at time of service'

  return `You are Selena, the booking concierge for ${bizName}.

PERSONALITY: Warm, real, direct. Not a bot. Never sound like one.

STYLE:
- SHORT. One question per message. Never combine two asks.
- Match their energy. One line = one line.
- 😊 only emoji. Once per message max.
- NEVER say: "certainly" "absolutely" "of course" "great question" "happy to help"
- Under 300 chars. Max 480. Recap exception.
- Plain text only. No markdown.
- If they text in Spanish, respond in Spanish.
- On SMS: give numbered options (1. Option A  2. Option B) so they can reply with a number.

BUSINESS INFO (share when asked):
- Business: ${bizName}
- Services: ${services || 'various services'}
- Rate: ${rate > 0 ? `$${rate}/hr` : 'varies by service'}
- Hours: ${startH > 12 ? startH - 12 : startH}${startH >= 12 ? 'PM' : 'AM'} to ${endH > 12 ? endH - 12 : endH}${endH >= 12 ? 'PM' : 'AM'}
- Payment: ${payment}
${s.business_phone ? `- Phone: ${s.business_phone}` : ''}
${s.business_website ? `- Website: ${s.business_website}` : ''}

RECAP: After all info collected, read it all back and ask to confirm.

POST-CONFIRMATION: "Thank you [Name]! We appreciate you. Your booking is pending and will be confirmed by our team shortly — you'll be notified once it's all set!"

ESCALATION: Say "Let me have someone look at this — one sec 😊" then [ESCALATE: reason]

RETURNING CLIENTS: If CLIENT PROFILE is below, use it. Don't re-ask for info you have.

The BOOKING CHECKLIST below shows what you have and what's missing. Ask for the NEXT MISSING item. When complete, do the recap. NEVER re-ask for something already collected.`
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
  channel: 'sms' | 'web',
  message: string,
  conversationId: string,
): Promise<SelenaResult> {
  const result: SelenaResult = { text: '', checklist: EMPTY_CHECKLIST }

  try {
    // 1. Load checklist
    let checklist = await loadChecklist(conversationId)
    if (checklist.status === 'greeting') {
      checklist = await updateChecklist(conversationId, { status: 'collecting' })
    }

    // 2. State machine
    const nextStep = getNextStep(checklist)

    // 3. Build system prompt
    const systemPromptBase = await buildSystemPrompt(tenantId)
    const calendar = buildCalendarContext()
    const checklistPrompt = buildChecklistPrompt(checklist, nextStep)

    let clientContext = ''
    if (channel === 'sms') {
      const { data: convo } = await supabaseAdmin
        .from('sms_conversations').select('phone').eq('id', conversationId).single()
      if (convo?.phone && !convo.phone.startsWith('web-')) {
        const profile = await getClientProfile(tenantId, convo.phone)
        if (!profile.includes('"error"')) clientContext = `\n\nCLIENT PROFILE:\n${profile}`
      }
    }

    const systemPrompt = systemPromptBase + calendar + '\n' + checklistPrompt + clientContext

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

      for (let i = 0; i < 5; i++) {
        const response = await getClient().messages.create(
          { model: 'claude-haiku-4-5-20251001', max_tokens: 700, system: systemPrompt, messages: currentMessages, tools: TOOLS },
          { signal: controller.signal }
        )

        const toolBlocks = response.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
        const textBlocks = response.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')

        if (toolBlocks.length === 0) {
          if (textBlocks.length > 0) result.text = textBlocks.map(b => b.text).join(' ').trim()
          break
        }

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
              default: toolResult = JSON.stringify({ error: `Unknown tool: ${tool.name}` })
            }
          } catch (toolErr) {
            await selenaError(tenantId, `tool_loop:${tool.name}`, toolErr, conversationId)
            toolResult = JSON.stringify({ success: true })
          }
          toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: toolResult, ...(toolResult.includes('"error"') ? { is_error: true } : {}) })
        }

        currentMessages.push({ role: 'user', content: toolResults })
        if (response.stop_reason === 'end_turn' && textBlocks.length > 0) {
          result.text = textBlocks.map(b => b.text).join(' ').trim()
          break
        }
      }
    } finally {
      clearTimeout(timeout)
    }

    if (!result.text) {
      await selenaError(tenantId, 'empty_response', new Error('Selena returned no text'), conversationId)
      result.text = ''
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
