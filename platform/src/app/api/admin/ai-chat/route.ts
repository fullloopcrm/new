/**
 * Admin AI Chat — CRM copilot. Claude with tools for querying and mutating
 * the tenant's CRM data. Tenant-scoped end-to-end.
 *
 * Ported from nycmaid: cleaner_id/cleaners → team_member_id/team_members.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

const tools: Anthropic.Tool[] = [
  {
    name: 'search_clients',
    description: 'Search clients by name, email, phone, or address. Returns matching clients.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Search term' } },
      required: ['query'],
    },
  },
  {
    name: 'search_team_members',
    description: 'Search team members by name, or list all active members if no query.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Optional name filter' } },
      required: [],
    },
  },
  {
    name: 'query_bookings',
    description: 'Query bookings with filters. Returns bookings with client and team-member names.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
        team_member_id: { type: 'string' },
        status: { type: 'string', description: 'scheduled | completed | cancelled | pending | in_progress' },
        date_from: { type: 'string', description: 'YYYY-MM-DD' },
        date_to: { type: 'string', description: 'YYYY-MM-DD' },
        limit: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'update_bookings',
    description: 'Update one or more bookings. Use for reassignments, status/price/note/time changes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        booking_ids: { type: 'array', items: { type: 'string' } },
        updates: {
          type: 'object',
          properties: {
            team_member_id: { type: 'string' },
            status: { type: 'string' },
            price: { type: 'number', description: 'Price in cents' },
            notes: { type: 'string' },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            payment_status: { type: 'string' },
            payment_method: { type: 'string' },
          },
        },
        confirmed: { type: 'boolean', description: 'Only true after user confirms' },
      },
      required: ['booking_ids', 'updates'],
    },
  },
  {
    name: 'cancel_bookings',
    description: 'Cancel bookings (sets status=cancelled).',
    input_schema: {
      type: 'object' as const,
      properties: {
        booking_ids: { type: 'array', items: { type: 'string' } },
        confirmed: { type: 'boolean' },
      },
      required: ['booking_ids'],
    },
  },
  {
    name: 'get_schedule_summary',
    description: 'Get upcoming bookings for a date or range.',
    input_schema: {
      type: 'object' as const,
      properties: { date: { type: 'string' }, date_to: { type: 'string' } },
      required: [],
    },
  },
  {
    name: 'get_client_details',
    description: 'Get full details + booking history for a client.',
    input_schema: {
      type: 'object' as const,
      properties: { client_id: { type: 'string' } },
      required: ['client_id'],
    },
  },
  {
    name: 'update_client',
    description: 'Update client fields (name, email, phone, address, notes, status, do_not_service).',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
        updates: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            notes: { type: 'string' },
            status: { type: 'string' },
            do_not_service: { type: 'boolean' },
          },
        },
      },
      required: ['client_id', 'updates'],
    },
  },
  {
    name: 'create_booking',
    description: 'Create a booking. Search for client first to get client_id. Ask to confirm before creating.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
        start_time: { type: 'string', description: 'ISO local, YYYY-MM-DDTHH:MM:00' },
        end_time: { type: 'string', description: 'Optional — defaults to start + 2h' },
        service_type: { type: 'string' },
        team_member_id: { type: 'string' },
        price: { type: 'number', description: 'Price in cents' },
        notes: { type: 'string' },
        confirmed: { type: 'boolean' },
      },
      required: ['client_id', 'start_time'],
    },
  },
  {
    name: 'get_revenue_stats',
    description: 'Get revenue + booking counts for a date range.',
    input_schema: {
      type: 'object' as const,
      properties: { date_from: { type: 'string' }, date_to: { type: 'string' } },
      required: ['date_from', 'date_to'],
    },
  },
]

async function executeTool(
  tenantId: string,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  const scope = <T extends { eq: (col: string, val: string) => T }>(q: T): T => q.eq('tenant_id', tenantId)

  switch (name) {
    case 'search_clients': {
      const q = String(input.query || '').trim()
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('id, name, email, phone, address, status, do_not_service, notes')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`)
        .limit(10)
      return JSON.stringify(error ? { error: error.message } : data)
    }

    case 'search_team_members': {
      const q = input.query as string | undefined
      let query = supabaseAdmin
        .from('team_members')
        .select('id, name, email, phone, status, working_days')
        .eq('tenant_id', tenantId)
      query = q ? query.ilike('name', `%${q}%`) : query.eq('status', 'active')
      const { data, error } = await query.limit(20)
      return JSON.stringify(error ? { error: error.message } : data)
    }

    case 'query_bookings': {
      let query = supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, status, price, payment_status, payment_method, notes, recurring_type, service_type, schedule_id, clients(name), team_members(name)')
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true })

      if (input.client_id) query = query.eq('client_id', input.client_id as string)
      if (input.team_member_id) query = query.eq('team_member_id', input.team_member_id as string)
      if (input.status) query = query.eq('status', input.status as string)
      if (input.date_from) query = query.gte('start_time', `${input.date_from}T00:00:00`)
      if (input.date_to) query = query.lte('start_time', `${input.date_to}T23:59:59`)

      const limit = Math.min((input.limit as number) || 20, 100)
      const { data, error } = await query.limit(limit)
      return JSON.stringify(error ? { error: error.message } : data)
    }

    case 'update_bookings': {
      const ids = (input.booking_ids as string[]) || []
      const updates = (input.updates as Record<string, unknown>) || {}
      const confirmed = input.confirmed as boolean

      if (!confirmed) {
        return JSON.stringify({
          needs_confirmation: true,
          message: `Will update ${ids.length} booking(s). Ask the user to confirm.`,
          booking_count: ids.length,
          updates,
        })
      }

      const results = await Promise.all(
        ids.map(async id => {
          const { error } = await supabaseAdmin
            .from('bookings')
            .update(updates)
            .eq('id', id)
            .eq('tenant_id', tenantId)
          return { id, error: error?.message }
        })
      )
      const failed = results.filter(r => r.error)
      if (failed.length > 0) return JSON.stringify({ error: `${failed.length}/${ids.length} failed`, details: failed })
      return JSON.stringify({ success: true, updated: ids.length })
    }

    case 'cancel_bookings': {
      const ids = (input.booking_ids as string[]) || []
      const confirmed = input.confirmed as boolean
      if (!confirmed) {
        return JSON.stringify({
          needs_confirmation: true,
          message: `Will cancel ${ids.length} booking(s). Ask the user to confirm.`,
          booking_count: ids.length,
        })
      }
      const results = await Promise.all(
        ids.map(async id => {
          const { error } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .eq('tenant_id', tenantId)
          return { id, error: error?.message }
        })
      )
      const failed = results.filter(r => r.error)
      if (failed.length > 0) return JSON.stringify({ error: `${failed.length}/${ids.length} failed`, details: failed })
      return JSON.stringify({ success: true, cancelled: ids.length })
    }

    case 'get_schedule_summary': {
      const date = (input.date as string) || new Date().toISOString().split('T')[0]
      const dateTo = (input.date_to as string) || date
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, status, price, service_type, clients(name, address), team_members(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${dateTo}T23:59:59`)
        .in('status', ['scheduled', 'in_progress', 'completed'])
        .order('start_time', { ascending: true })
      return JSON.stringify(error ? { error: error.message } : { date, date_to: dateTo, bookings: data, total: data?.length || 0 })
    }

    case 'get_client_details': {
      const clientId = input.client_id as string
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single()
      if (clientError) return JSON.stringify({ error: clientError.message })

      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, price, payment_status, service_type, team_members(name)')
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: false })
        .limit(10)

      return JSON.stringify({ client, recent_bookings: bookings })
    }

    case 'update_client': {
      const { error } = await supabaseAdmin
        .from('clients')
        .update(input.updates as Record<string, unknown>)
        .eq('id', input.client_id as string)
        .eq('tenant_id', tenantId)
      return JSON.stringify(error ? { error: error.message } : { success: true })
    }

    case 'create_booking': {
      const confirmed = input.confirmed as boolean
      if (!confirmed) {
        return JSON.stringify({
          needs_confirmation: true,
          message: 'About to create a booking. Ask the user to confirm.',
          client_id: input.client_id,
          start_time: input.start_time,
          service_type: input.service_type || 'regular',
        })
      }
      const startTime = input.start_time as string
      let endTime = input.end_time as string | undefined
      if (!endTime) {
        const start = new Date(startTime)
        start.setHours(start.getHours() + 2)
        endTime = start.toISOString().replace(/\.\d{3}Z$/, '')
      }
      const bookingData: Record<string, unknown> = {
        tenant_id: tenantId,
        client_id: input.client_id,
        start_time: startTime,
        end_time: endTime,
        status: 'scheduled',
        service_type: input.service_type || 'regular',
      }
      if (input.team_member_id) bookingData.team_member_id = input.team_member_id
      if (input.price) bookingData.price = input.price
      if (input.notes) bookingData.notes = input.notes

      const { data, error } = await supabaseAdmin
        .from('bookings')
        .insert(bookingData)
        .select('id')
        .single()
      return JSON.stringify(error ? { error: error.message } : { success: true, booking_id: data.id })
    }

    case 'get_revenue_stats': {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('price, payment_status, status')
        .eq('tenant_id', tenantId)
        .gte('start_time', `${input.date_from}T00:00:00`)
        .lte('start_time', `${input.date_to}T23:59:59`)
        .in('status', ['scheduled', 'completed', 'in_progress'])
      if (error) return JSON.stringify({ error: error.message })

      const total = (data || []).reduce((s, b) => s + (b.price || 0), 0)
      const paid = (data || []).filter(b => b.payment_status === 'paid').reduce((s, b) => s + (b.price || 0), 0)
      return JSON.stringify({
        total_revenue: total,
        paid,
        pending: total - paid,
        total_bookings: data?.length || 0,
        completed: (data || []).filter(b => b.status === 'completed').length,
        scheduled: (data || []).filter(b => b.status === 'scheduled').length,
      })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
  void scope
}

export async function POST(request: Request) {
  try {
    const { tenantId, tenant } = await getTenantForRequest()
    const { messages } = await request.json()
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const businessName = tenant.name || 'the business'
    const industry = tenant.industry || 'services'
    const SYSTEM_PROMPT = `You are the ${businessName} AI assistant — a CRM copilot for managing a ${industry} business.
You have tools to query and modify the database. Use them to answer questions and take actions.

Key rules:
- Always confirm before destructive actions (cancelling, deleting).
- When updating multiple bookings, state how many will be affected and ask for confirmation.
- Use short, direct responses — this is a chat widget, not an essay.
- Dates are stored as naive ISO strings (no timezone). Today is ${new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
- Prices are stored in cents. Display as dollars.
- Format results concisely — bullet points or short lists.
- If a user asks to do something, do it (after confirmation if destructive). Don't explain how to do it in the UI.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    let currentMessages = [...messages] as Array<Anthropic.Messages.MessageParam>
    let maxIterations = 10

    while (maxIterations-- > 0) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools,
        messages: currentMessages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text') as Anthropic.Messages.TextBlock | undefined
        return NextResponse.json({ reply: textBlock?.text || '' })
      }

      if (response.stop_reason === 'tool_use') {
        currentMessages.push({ role: 'assistant', content: response.content })

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(tenantId, block.name, block.input as Record<string, unknown>)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result,
            })
          }
        }
        currentMessages.push({ role: 'user', content: toolResults })
        continue
      }

      break
    }

    return NextResponse.json({ reply: 'Something went wrong — too many tool calls.' }, { status: 500 })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[admin/ai-chat] error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
