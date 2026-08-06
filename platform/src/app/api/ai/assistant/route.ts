import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getTenantForRequest, AuthError, type TenantContext } from '@/lib/tenant-query'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'
import { supabaseAdmin } from '@/lib/supabase'
import { hasPermission, type Role } from '@/lib/rbac'
import { overridesFor } from '@/lib/require-permission'
import { getTenantTimezone } from '@/lib/tenant-time'
import { nowNaiveET } from '@/lib/recurring'
import { audit } from '@/lib/audit'
import { runTool } from '@/lib/selena/tools'
import { SHARED_TOOL_PERMISSIONS } from '@/lib/selena/tool-permissions'
import type { YinezResult } from '@/lib/selena/agent'

// #3 (fold the dashboard assistant into the shared tool registry — 2026-07-30):
// every tool that has a clean shared equivalent now dispatches through
// runTool() (src/lib/selena/tools.ts), the SAME dispatcher SMS/web/Telegram
// use, gated by the SAME SHARED_TOOL_PERMISSIONS map — no more a second,
// hand-maintained tool implementation + permission map drifting from the
// shared one. Two tools stayed local because their query logic has a real
// semantic difference (see tool-permissions.ts's comments on each) — both
// are still gated through SHARED_TOOL_PERMISSIONS for one RBAC source of
// truth even though their handlers remain here.

function buildSystemPrompt(agentName: string, tenantName: string, industry: string, timezone: string) {
  return `You are ${agentName}, the AI assistant for ${tenantName}, a ${industry} business using Full Loop CRM.
You have tools to query and modify the database. Use them to answer questions and take actions.

Key rules:
- Always confirm before destructive actions (cancelling, deleting)
- When updating multiple bookings, state how many will be affected and ask for confirmation
- Use short, direct responses — this is a chat widget, not an essay
- Dates are stored as naive ISO strings (no timezone) in this business's own local time (${timezone}). Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: timezone })}
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

// Best-effort real target id for the audit row's entity_id column — mirrors
// Yinez's extractEntityId (src/lib/selena/tools.ts).
function extractAssistantEntityId(input: Record<string, unknown>): string | undefined {
  if (typeof input.client_id === 'string') return input.client_id
  if (Array.isArray(input.booking_ids) && typeof input.booking_ids[0] === 'string') return input.booking_ids[0] as string
  if (typeof input.team_member_id === 'string') return input.team_member_id
  return undefined
}

// Maps this route's externally-exposed tool names (unchanged since 2026-07,
// kept stable so the system prompt / conversation history don't need to
// change) to the shared registry's internal tool name, for two purposes:
// (1) looking up the right entry in SHARED_TOOL_PERMISSIONS, (2) dispatching
// through runTool() using the name IT recognizes.
const SHARED_NAME: Partial<Record<string, string>> = {
  search_clients: 'lookup_client',
  search_team_members: 'list_cleaners', // overridden to lookup_cleaner below when a query is given
  query_bookings: 'list_bookings',
  update_bookings: 'update_booking',
  cancel_bookings: 'update_booking',
  get_schedule_summary: 'list_bookings',
  get_client_details: 'lookup_client',
}

async function dispatchTool(name: string, input: Record<string, unknown>, tenant: TenantContext): Promise<string> {
  const overrides = overridesFor(tenant)
  const permissionKey = SHARED_NAME[name] || name
  const requiredPermission = SHARED_TOOL_PERMISSIONS[permissionKey]
  if (requiredPermission && !hasPermission(tenant.role, requiredPermission, overrides)) {
    return JSON.stringify({ error: `You don't have permission to do that (requires ${requiredPermission}).` })
  }
  const tenantId = tenant.tenantId

  // #3 fold: every case below now dispatches through the SAME runTool()
  // dispatcher SMS/web/Telegram use (src/lib/selena/tools.ts) instead of a
  // second, hand-maintained implementation. `role` present bypasses runTool's
  // phone-based owner gate (by design, see tools.ts's dispatchTool comment)
  // and SHARED_TOOL_PERMISSIONS above is the real gate for this caller. A
  // synthetic conversationId is fine — none of these tools link a real
  // conversation row (create_client, the one that does, isn't in this set).
  const stubResult: YinezResult = { text: '', toolsCalled: [] }
  const syntheticConversationId = `dashboard:${tenantId}`
  const rt = (toolName: string, toolInput: Record<string, unknown>) =>
    runTool(toolName, toolInput, syntheticConversationId, null, stubResult, tenantId, tenant.role as Role, overrides ?? undefined)

  switch (name) {
    case 'search_clients':
      return await rt('lookup_client', { query: (input.query as string || '').trim() })

    case 'search_team_members': {
      const q = input.query as string | undefined
      return q ? await rt('lookup_cleaner', { name: q }) : await rt('list_cleaners', { status: 'active' })
    }

    case 'query_bookings':
      return await rt('list_bookings', {
        client_id: input.client_id, cleaner_id: input.team_member_id, status: input.status,
        from_date: input.date_from, to_date: input.date_to, limit: input.limit,
      })

    case 'update_bookings': {
      const ids = input.booking_ids as string[]
      const updates = input.updates as Record<string, unknown>
      const confirmed = input.confirmed as boolean
      if (!confirmed) {
        return JSON.stringify({ needs_confirmation: true, message: `This will update ${ids.length} booking(s). Ask the user to confirm.`, booking_count: ids.length, updates })
      }
      // Confirmation gate stays HERE (dashboard-specific — bulk edits across
      // many bookings warrant it) rather than in the shared handleUpdateBooking,
      // which SMS/Telegram already call without one (single booking, live
      // conversation, prompt-level "confirm before destructive" is enough there).
      const { team_member_id, ...rest } = updates
      const fields = team_member_id !== undefined ? { ...rest, cleaner_id: team_member_id } : rest
      const results = await Promise.all(ids.map(async (id) => {
        const out = await rt('update_booking', { booking_id: id, fields })
        const parsed = JSON.parse(out) as { error?: string }
        return { id, error: parsed.error }
      }))
      const failed = results.filter(r => r.error)
      if (failed.length > 0) return JSON.stringify({ error: `${failed.length}/${ids.length} failed`, details: failed })
      return JSON.stringify({ success: true, updated: ids.length })
    }

    case 'cancel_bookings': {
      const ids = input.booking_ids as string[]
      const confirmed = input.confirmed as boolean
      if (!confirmed) {
        return JSON.stringify({ needs_confirmation: true, message: `This will cancel ${ids.length} booking(s). Ask the user to confirm.`, booking_count: ids.length })
      }
      const results = await Promise.all(ids.map(async (id) => {
        const out = await rt('update_booking', { booking_id: id, fields: { status: 'cancelled' } })
        const parsed = JSON.parse(out) as { error?: string }
        return { id, error: parsed.error }
      }))
      const failed = results.filter(r => r.error)
      if (failed.length > 0) return JSON.stringify({ error: `${failed.length}/${ids.length} failed`, details: failed })
      return JSON.stringify({ success: true, cancelled: ids.length })
    }

    case 'get_schedule_summary': {
      // "today" must be ET's calendar date — UTC's date rolls over ~4-5h
      // before ET's does. Schema promises "defaults to today"; list_bookings
      // has no such default (its other callers always pass an explicit date).
      const date = (input.date as string) || nowNaiveET().slice(0, 10)
      return await rt('list_bookings', { date, to_date: input.date_to })
    }

    case 'get_client_details':
      return await rt('lookup_client', { client_id: input.client_id })

    // Kept dashboard-local — no shared equivalent (update_account is the
    // CLIENT's own self-service tool, a different access pattern) — but still
    // gated above via SHARED_TOOL_PERMISSIONS.update_client for one RBAC source.
    case 'update_client': {
      const allowedClientFields = ['name', 'email', 'phone', 'address', 'notes', 'active']
      const rawUpdates = (input.updates as Record<string, unknown>) || {}
      const safeUpdates: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(rawUpdates)) {
        if (allowedClientFields.includes(k)) safeUpdates[k] = v
      }
      if (Object.keys(safeUpdates).length === 0) return JSON.stringify({ error: 'no allowed fields to update' })

      const { error } = await supabaseAdmin
        .from('clients')
        .update(safeUpdates)
        .eq('id', input.client_id as string)
        .eq('tenant_id', tenantId)
      if (error) return JSON.stringify({ error: error.message })
      return JSON.stringify({ success: true })
    }

    // Kept dashboard-local — computes from bookings.price/payment_status
    // (invoiced total), a different basis than the shared get_revenue tool
    // (actual payments.amount collected). Merging would silently change the
    // dollar figure dashboard users already see. Still gated above via
    // SHARED_TOOL_PERMISSIONS.get_revenue_stats for one RBAC source.
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

// Every tool this tenant-dashboard assistant calls goes through this one
// function (the POST loop below calls nothing else). Writes one
// 'assistant.tool_call' audit row per invocation, success or failure.
// #3 fold: tools now routed through the shared runTool() ALSO write their own
// 'yinez.tool_call' row internally (see tools.ts) — two rows per shared-routed
// call, not one. Accepted as a minor, harmless redundancy (both rows are
// truthful, distinguishable by action name) rather than threading a
// skip-audit flag through runTool for this.
async function executeTool(name: string, input: Record<string, unknown>, tenant: TenantContext): Promise<string> {
  let out: string
  let threw: unknown
  try {
    out = await dispatchTool(name, input, tenant)
  } catch (err) {
    threw = err
    out = JSON.stringify({ error: 'tool_threw', message: err instanceof Error ? err.message : String(err) })
  }

  let toolError: string | undefined
  try {
    const parsed = JSON.parse(out)
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      toolError = String((parsed as { error: unknown }).error)
    }
  } catch {
    // Non-JSON tool output — treat as success, nothing to parse.
  }

  audit({
    tenantId: tenant.tenantId,
    action: 'assistant.tool_call',
    entityType: name,
    entityId: extractAssistantEntityId(input),
    details: { actor: 'agent', role: tenant.role, success: !toolError, error: toolError },
  }).catch((e) => console.error('[ai/assistant] audit log failed for tool', name, e))

  if (threw) throw threw
  return out
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantForRequest()
    const { tenant } = ctx

    if (!tenant.anthropic_api_key && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    // Tenant's own Anthropic key if set, platform key otherwise.
    const anthropic = anthropicFromStoredKey(tenant.anthropic_api_key)

    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(tenant.agent_name || 'Selena', tenant.name, tenant.industry?.replace(/_/g, ' ') || 'service', getTenantTimezone(tenant))

    let currentMessages = [...messages]
    let maxIterations = 10

    while (maxIterations-- > 0) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
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
            const result = await executeTool(block.name, block.input as Record<string, unknown>, ctx)
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
