import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

function buildSystemPrompt(tenantName: string, industry: string) {
  return `You are Selena, the AI assistant for ${tenantName}, a ${industry} business using Full Loop CRM.
You have tools to query and modify the database. Use them to answer questions and take actions.

Key rules:
- Always confirm before destructive actions (cancelling, deleting)
- When updating multiple bookings, state how many will be affected and ask for confirmation
- Use short, direct responses — this is a chat widget, not an essay
- Dates are stored as naive ISO strings (no timezone). Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
- Prices are stored in cents. Display as dollars.
- When you find results, format them concisely — use bullet points or short lists
- If a user asks to do something, do it (after confirmation if destructive). Don't explain how to do it in the UI.`
}

const tools: Anthropic.Tool[] = [
  {
    name: 'search_clients',
    description: 'Search clients by name, email, phone, or address. Returns matching clients.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search term (name, email, phone, or address fragment)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_team_members',
    description: 'Search team members by name, or list all active members if no query given.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Optional team member name to search for' },
      },
      required: [],
    },
  },
  {
    name: 'query_bookings',
    description: 'Query bookings with filters. Returns bookings with client and team member names.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string', description: 'Filter by client ID' },
        team_member_id: { type: 'string', description: 'Filter by team member ID' },
        status: { type: 'string', description: 'Filter by status: scheduled, confirmed, in_progress, completed, paid, cancelled, no_show' },
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
      required: [],
    },
  },
  {
    name: 'update_bookings',
    description: 'Update one or more bookings. Use for reassigning team members, changing status, price, notes, times, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        booking_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of booking IDs to update',
        },
        updates: {
          type: 'object',
          description: 'Fields to update: team_member_id, status, price, notes, start_time, end_time, payment_status',
          properties: {
            team_member_id: { type: 'string' },
            status: { type: 'string' },
            price: { type: 'number', description: 'Price in cents' },
            notes: { type: 'string' },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            payment_status: { type: 'string' },
          },
        },
        confirmed: { type: 'boolean', description: 'Set to true only after user confirms the action' },
      },
      required: ['booking_ids', 'updates'],
    },
  },
  {
    name: 'cancel_bookings',
    description: 'Cancel one or more bookings (sets status to cancelled).',
    input_schema: {
      type: 'object' as const,
      properties: {
        booking_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of booking IDs to cancel',
        },
        confirmed: { type: 'boolean', description: 'Set to true only after user confirms the action' },
      },
      required: ['booking_ids'],
    },
  },
  {
    name: 'get_schedule_summary',
    description: 'Get a summary of upcoming bookings for a day or date range. Good for "who is working today/tomorrow/this week".',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Date (YYYY-MM-DD). Defaults to today.' },
        date_to: { type: 'string', description: 'End date for range (YYYY-MM-DD). Optional.' },
      },
      required: [],
    },
  },
  {
    name: 'get_client_details',
    description: 'Get full details for a client including their booking history.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string', description: 'Client ID' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'update_client',
    description: 'Update client details like name, email, phone, address, notes, active status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string', description: 'Client ID' },
        updates: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            notes: { type: 'string' },
            active: { type: 'boolean' },
          },
        },
      },
      required: ['client_id', 'updates'],
    },
  },
  {
    name: 'get_revenue_stats',
    description: 'Get revenue and booking statistics for a date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['date_from', 'date_to'],
    },
  },
]

async function executeTool(name: string, input: Record<string, unknown>, tenantId: string): Promise<string> {
  switch (name) {
    case 'search_clients': {
      const q = (input.query as string).trim()
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('id, name, email, phone, address, active, notes')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`)
        .limit(10)
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify(data)
    }

    case 'search_team_members': {
      const q = input.query as string | undefined
      let query = supabaseAdmin.from('team_members').select('id, name, email, phone, status, working_days, pay_rate').eq('tenant_id', tenantId)
      if (q) query = query.ilike('name', `%${q}%`)
      else query = query.eq('status', 'active')
      const { data, error } = await query.limit(20)
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify(data)
    }

    case 'query_bookings': {
      let query = supabaseAdmin
        .from('bookings')
        .select('id, start_time, end_time, status, price, payment_status, notes, service_type_id, schedule_id, clients(name), team_members(name)')
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true })

      if (input.client_id) query = query.eq('client_id', input.client_id as string)
      if (input.team_member_id) query = query.eq('team_member_id', input.team_member_id as string)
      if (input.status) query = query.eq('status', input.status as string)
      if (input.date_from) query = query.gte('start_time', `${input.date_from}T00:00:00`)
      if (input.date_to) query = query.lte('start_time', `${input.date_to}T23:59:59`)

      const limit = (input.limit as number) || 20
      const { data, error } = await query.limit(limit)
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify(data)
    }

    case 'update_bookings': {
      const ids = input.booking_ids as string[]
      const updates = input.updates as Record<string, unknown>
      const confirmed = input.confirmed as boolean

      if (!confirmed) {
        return JSON.stringify({
          needs_confirmation: true,
          message: `This will update ${ids.length} booking(s). Ask the user to confirm.`,
          booking_count: ids.length,
          updates,
        })
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabaseAdmin.from('bookings').update(updates).eq('id', id).eq('tenant_id', tenantId)
          return { id, error: error?.message }
        })
      )
      const failed = results.filter(r => r.error)
      if (failed.length > 0) return JSON.stringify({ error: `${failed.length}/${ids.length} failed`, details: failed })
      return JSON.stringify({ success: true, updated: ids.length })
    }

    case 'cancel_bookings': {
      const ids = input.booking_ids as string[]
      const confirmed = input.confirmed as boolean

      if (!confirmed) {
        return JSON.stringify({
          needs_confirmation: true,
          message: `This will cancel ${ids.length} booking(s). Ask the user to confirm.`,
          booking_count: ids.length,
        })
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', id).eq('tenant_id', tenantId)
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
        .select('id, start_time, end_time, status, price, clients(name, address), team_members(name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${dateTo}T23:59:59`)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
        .order('start_time', { ascending: true })

      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ date, date_to: dateTo, bookings: data, total: data?.length || 0 })
    }

    case 'get_client_details': {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', input.client_id as string)
        .eq('tenant_id', tenantId)
        .single()
      if (clientError) return JSON.stringify({ error: clientError.message })

      const { data: bookings } = await supabaseAdmin
        .from('bookings')
        .select('id, start_time, status, price, payment_status, team_members(name)')
        .eq('client_id', input.client_id as string)
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
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true })
    }

    case 'get_revenue_stats': {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('price, payment_status, status')
        .eq('tenant_id', tenantId)
        .gte('start_time', `${input.date_from}T00:00:00`)
        .lte('start_time', `${input.date_to}T23:59:59`)
        .in('status', ['scheduled', 'confirmed', 'completed', 'in_progress', 'paid'])

      if (error) return JSON.stringify({ error: error.message })

      const total = data?.reduce((sum, b) => sum + (b.price || 0), 0) || 0
      const paid = data?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.price || 0), 0) || 0
      const pending = total - paid
      const completedCount = data?.filter(b => ['completed', 'paid'].includes(b.status)).length || 0
      const scheduledCount = data?.filter(b => ['scheduled', 'confirmed'].includes(b.status)).length || 0

      return JSON.stringify({
        total_revenue: total,
        paid,
        pending,
        total_bookings: data?.length || 0,
        completed: completedCount,
        scheduled: scheduledCount,
      })
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, tenantId } = await getTenantForRequest()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(tenant.name, tenant.industry?.replace(/_/g, ' ') || 'service')

    let currentMessages = [...messages]
    let maxIterations = 10

    while (maxIterations-- > 0) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages: currentMessages,
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text')
        return NextResponse.json({ reply: textBlock?.text || '' })
      }

      if (response.stop_reason === 'tool_use') {
        currentMessages.push({ role: 'assistant', content: response.content })

        const toolResults = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeTool(block.name, block.input as Record<string, unknown>, tenantId)
            toolResults.push({
              type: 'tool_result' as const,
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
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('AI Assistant error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
