import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAvailability } from '@/lib/availability'
import { getSettings } from '@/lib/settings'

// --- Types ---

export interface SelenaResult {
  text: string
  clientCreated?: boolean
  bookingCreated?: boolean
}

// --- Client (lazy init) ---

let _anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic()
  return _anthropic
}

// --- Build system prompt from tenant settings ---

async function buildSystemPrompt(tenantId: string): Promise<string> {
  const settings = await getSettings(tenantId)
  const bizName = settings.business_name || 'the business'
  const phone = settings.business_phone || ''
  const email = settings.business_email || ''
  const website = settings.business_website || ''
  const services = settings.service_types.filter(s => s.active).map(s => s.name).join(', ')
  const rate = settings.standard_rate || 0
  const startHour = settings.business_hours_start || 9
  const endHour = settings.business_hours_end || 17
  const paymentMethods = settings.payment_methods?.join(', ') || 'payment at time of service'

  return `You are Selena, the AI assistant for ${bizName}. You help manage customer conversations via text message.

WHO YOU ARE:
You're a friendly, professional assistant who texts like a real person — warm, casual, and efficient. You don't sound like a corporate bot.

You respond to what they say. You guide the conversation naturally toward booking.

NEVER DO THESE:
- NEVER introduce yourself unless it's the first message. No "This is Selena" mid-conversation.
- NEVER ask open-ended questions like "What can I help you with?" or "How can I help?"
- NEVER say "No problem!" or "I'd be happy to help!" or "Is there anything else?"
- NEVER send a form or link. Collect everything through the conversation.

THE PROCESS (follow naturally, one step at a time):
1. Get their name → call create_client
2. Get their address
3. Ask what type of service they need
4. Ask relevant details (size, scope, etc.)
5. Ask what day works → call check_availability → share available times
6. Confirm date/time → call save_info
7. Share pricing when asked: ${rate > 0 ? `$${rate}/hr` : 'varies by service'}
8. Get their email → save_info
9. Recap the booking details
10. They confirm → call create_booking

WHAT YOU KNOW (share ONLY when asked):
- Business: ${bizName}
- Services: ${services || 'various services'}
- Hours: ${startHour > 12 ? startHour - 12 : startHour}${startHour >= 12 ? 'PM' : 'AM'} to ${endHour > 12 ? endHour - 12 : endHour}${endHour >= 12 ? 'PM' : 'AM'}
- Payment: ${paymentMethods}
${phone ? `- Phone: ${phone}` : ''}
${email ? `- Email: ${email}` : ''}
${website ? `- Website: ${website}` : ''}

RULES:
- Never reveal you're AI. You're Selena.
- Keep messages under 300 characters when possible.
- Plain text only. No markdown.
- Text like a real person — warm, casual, short.`
}

// --- Tool Definitions ---

const TOOL_CREATE_CLIENT: Anthropic.Messages.Tool = {
  name: 'create_client',
  description: 'Create a new potential client record when you learn their name.',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'The client name' },
    },
    required: ['name'],
  },
}

const TOOL_SAVE_INFO: Anthropic.Messages.Tool = {
  name: 'save_info',
  description: 'Save client info as you collect it. Call every time they give you info.',
  input_schema: {
    type: 'object' as const,
    properties: {
      address: { type: 'string', description: 'Full address' },
      email: { type: 'string', description: 'Email address' },
      service_type: { type: 'string', description: 'Type of service requested' },
      hourly_rate: { type: 'number', description: 'Agreed rate' },
      preferred_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
      preferred_time: { type: 'string', description: 'Time, e.g. "10:00 AM"' },
      notes: { type: 'string', description: 'Any special requests or details' },
    },
    required: [],
  },
}

const TOOL_CHECK_AVAILABILITY: Anthropic.Messages.Tool = {
  name: 'check_availability',
  description: 'Check availability for a specific date. Returns available time slots. Always call this before suggesting times.',
  input_schema: {
    type: 'object' as const,
    properties: {
      date: { type: 'string', description: 'Date to check in YYYY-MM-DD format' },
    },
    required: ['date'],
  },
}

const TOOL_CREATE_BOOKING: Anthropic.Messages.Tool = {
  name: 'create_booking',
  description: 'Create a PENDING booking after the client confirms. Only call AFTER they explicitly confirm.',
  input_schema: {
    type: 'object' as const,
    properties: {
      date: { type: 'string', description: 'Booking date YYYY-MM-DD' },
      time: { type: 'string', description: 'Booking time, e.g. "10:00 AM"' },
      service_type: { type: 'string', description: 'Service type' },
      hourly_rate: { type: 'number', description: 'Hourly rate' },
    },
    required: ['date', 'time', 'service_type', 'hourly_rate'],
  },
}

const ALL_TOOLS: Anthropic.Messages.Tool[] = [TOOL_CREATE_CLIENT, TOOL_SAVE_INFO, TOOL_CHECK_AVAILABILITY, TOOL_CREATE_BOOKING]
const RETURNING_TOOLS: Anthropic.Messages.Tool[] = [TOOL_SAVE_INFO, TOOL_CHECK_AVAILABILITY, TOOL_CREATE_BOOKING]

// --- Main Function ---

export async function askSelena(
  tenantId: string,
  messageText: string,
  conversationId: string,
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>,
  phone: string,
  clientExists: boolean,
  clientName?: string | null,
): Promise<SelenaResult | null> {
  try {
    const systemPrompt = await buildSystemPrompt(tenantId)

    // Build calendar context
    const now = new Date()
    const fullDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const calendarDays: string[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      const iso = d.toLocaleDateString('en-CA')
      calendarDays.push(`${dayStr} = ${iso}`)
    }
    const calendarContext = `\n\nToday is ${fullDate}.\nUPCOMING CALENDAR:\n${calendarDays.join('\n')}\nWhen they say "this Wednesday" or "next Thursday", look up the date here.`

    let clientContext = ''
    if (clientExists && clientName) {
      const firstName = clientName.split(' ')[0]
      clientContext = `\n\nCLIENT INFO: This is ${clientName} — they're already in the system. Do NOT ask for their name. Skip to what they need.`
    }

    const fullSystemPrompt = systemPrompt + calendarContext + clientContext

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    const recent = transcript.slice(-10)
    for (const msg of recent) {
      if (messages.length > 0 && messages[messages.length - 1].role === msg.role) {
        messages[messages.length - 1].content += '\n' + msg.content
        continue
      }
      messages.push({ role: msg.role, content: msg.content })
    }
    if (messages.length > 0 && messages[0].role === 'assistant') {
      messages.shift()
    }
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      messages[messages.length - 1].content += '\n' + messageText
    } else {
      messages.push({ role: 'user', content: messageText })
    }

    const result: SelenaResult = { text: '' }
    const tools = clientExists ? RETURNING_TOOLS : ALL_TOOLS
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

    try {
      let currentMessages: Array<{ role: 'user' | 'assistant'; content: string | Anthropic.Messages.ContentBlockParam[] }> = [...messages]

      for (let i = 0; i < 5; i++) {
        const response = await getClient().messages.create(
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 700,
            system: fullSystemPrompt,
            messages: currentMessages,
            tools,
          },
          { signal: controller.signal }
        )

        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
        )
        const textBlocks = response.content.filter(
          (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
        )

        if (toolUseBlocks.length === 0) {
          if (textBlocks.length > 0) {
            result.text = textBlocks.map(b => b.text).join(' ').trim()
          }
          break
        }

        currentMessages.push({
          role: 'assistant',
          content: response.content as Anthropic.Messages.ContentBlockParam[],
        })

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

        for (const toolUse of toolUseBlocks) {
          const input = toolUse.input as Record<string, unknown>

          if (toolUse.name === 'create_client') {
            const name = input.name as string
            try {
              await supabaseAdmin.from('clients').insert({ tenant_id: tenantId, name, phone, status: 'potential' })
              const { data: newClient } = await supabaseAdmin
                .from('clients').select('id').eq('tenant_id', tenantId).eq('phone', phone).eq('status', 'potential')
                .order('created_at', { ascending: false }).limit(1).single()
              if (newClient) {
                await supabaseAdmin.from('sms_conversations')
                  .update({ client_id: newClient.id, name, updated_at: new Date().toISOString() })
                  .eq('id', conversationId)
              }
              result.clientCreated = true
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ success: true }) })
            } catch {
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: 'Failed' }), is_error: true })
            }

          } else if (toolUse.name === 'save_info') {
            try {
              const { data: convo } = await supabaseAdmin.from('sms_conversations').select('client_id').eq('id', conversationId).single()
              const clientId = convo?.client_id

              if (clientId && (input.address || input.email)) {
                const u: Record<string, unknown> = {}
                if (input.address) u.address = input.address
                if (input.email) u.email = input.email
                await supabaseAdmin.from('clients').update(u).eq('id', clientId).eq('tenant_id', tenantId)
              }

              if (clientId && input.notes) {
                const { data: c } = await supabaseAdmin.from('clients').select('notes').eq('id', clientId).single()
                const existing = c?.notes || ''
                const updated = existing ? `${existing}\n${input.notes}` : input.notes as string
                await supabaseAdmin.from('clients').update({ notes: updated }).eq('id', clientId).eq('tenant_id', tenantId)
              }

              const cu: Record<string, unknown> = { updated_at: new Date().toISOString() }
              if (input.service_type) cu.service_type = input.service_type
              if (input.hourly_rate) cu.hourly_rate = input.hourly_rate
              if (input.preferred_date) cu.preferred_date = input.preferred_date
              if (input.preferred_time) cu.preferred_time = input.preferred_time
              await supabaseAdmin.from('sms_conversations').update(cu).eq('id', conversationId)

              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ success: true }) })
            } catch {
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: 'Failed' }), is_error: true })
            }

          } else if (toolUse.name === 'check_availability') {
            const date = input.date as string
            try {
              const availability = await checkAvailability(tenantId, date)
              const open = availability.slots.filter((s: { available: boolean; time: string }) => s.available).map((s: { time: string }) => s.time)
              if (open.length === 0) {
                toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ available: false, message: `Nothing open on ${date}. Suggest a different day.` }) })
              } else {
                toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ available: true, open_times: open, message: `Share 2-3 of these times.` }) })
              }
            } catch {
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: 'Failed to check' }), is_error: true })
            }

          } else if (toolUse.name === 'create_booking') {
            try {
              const { data: convo } = await supabaseAdmin.from('sms_conversations')
                .select('client_id').eq('id', conversationId).single()
              const clientId = convo?.client_id
              if (!clientId) {
                toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: 'No client linked' }), is_error: true })
                continue
              }

              const date = input.date as string
              const time = input.time as string
              const serviceType = input.service_type as string
              const hourlyRate = input.hourly_rate as number

              // Parse time
              const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/i)
              if (!match) {
                toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: 'Invalid time' }), is_error: true })
                continue
              }
              let hours = parseInt(match[1])
              const minutes = parseInt(match[2] || '0')
              const ampm = match[3].toUpperCase()
              if (ampm === 'PM' && hours < 12) hours += 12
              if (ampm === 'AM' && hours === 12) hours = 0

              const startTimeStr = `${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
              const endHours = hours + 2
              const endTimeStr = `${date}T${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`

              const { data: booking, error } = await supabaseAdmin.from('bookings').insert({
                tenant_id: tenantId,
                client_id: clientId,
                start_time: startTimeStr,
                end_time: endTimeStr,
                status: 'pending',
                notes: `SMS booking | ${serviceType}`,
                price: hourlyRate * 2 * 100,
              }).select('id').single()

              if (error) throw error

              await supabaseAdmin.from('sms_conversations')
                .update({ booking_id: booking.id, updated_at: new Date().toISOString() })
                .eq('id', conversationId)

              result.bookingCreated = true
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ success: true, bookingId: booking.id }) })
            } catch {
              toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: 'Failed to create booking' }), is_error: true })
            }
          }
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

    if (!result.text) return null
    if (result.text.length > 600) result.text = result.text.slice(0, 597) + '...'

    return result
  } catch (err) {
    console.error('Selena error:', err)
    return null
  }
}
