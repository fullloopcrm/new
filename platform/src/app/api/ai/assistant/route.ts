import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getTenantForRequest, AuthError, type TenantContext } from '@/lib/tenant-query'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantTimezone } from '@/lib/tenant-time'
import { audit } from '@/lib/audit'
import { runTool } from '@/lib/selena/tools'
import { TOOLS as SHARED_TOOLS, type YinezResult } from '@/lib/selena/agent'

// 2026-08-06 (full-access dashboard agent): every tool in the shared registry
// (src/lib/selena/tools.ts — the SAME dispatcher SMS/web/Telegram use) is now
// exposed here, and every call runs with role hard-coded to 'owner' — full
// RBAC permission — regardless of which dashboard user (owner/admin/manager/
// staff) is actually in the chat. Per-tenant, per-role gating was intentionally
// removed for this surface: whoever a tenant lets into their dashboard chat
// gets the agent's full capability, no exceptions. Two tools stay dashboard-
// local because their query logic has a real semantic difference from the
// shared equivalent (see each handler below).

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

// Bulk-only tools with no shared-registry equivalent (the shared update_booking
// takes one booking_id at a time) — kept local and additive to SHARED_TOOLS.
const dashboardOnlyTools: Anthropic.Tool[] = [
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

async function dispatchTool(name: string, input: Record<string, unknown>, tenant: TenantContext): Promise<string> {
  const tenantId = tenant.tenantId

  // Full-access dashboard agent: role is hard-coded to 'owner' for every
  // call, regardless of which dashboard user is actually chatting — see the
  // file-header note. This also bypasses runTool's phone-based owner gate
  // (a truthy role skips it by design, see tools.ts's dispatchTool comment).
  // A synthetic conversationId is fine — none of these tools link a real
  // conversation row (create_client, the one that does, isn't in this set).
  const stubResult: YinezResult = { text: '', toolsCalled: [] }
  const syntheticConversationId = `dashboard:${tenantId}`
  const rt = (toolName: string, toolInput: Record<string, unknown>) =>
    runTool(toolName, toolInput, syntheticConversationId, null, stubResult, tenantId, 'owner')

  switch (name) {
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

    // Kept dashboard-local — no shared equivalent (update_account is the
    // CLIENT's own self-service tool, a different access pattern).
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
    // dollar figure dashboard users already see.
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

    // Everything else is a tool from the shared registry (SHARED_TOOLS,
    // imported from agent.ts) — dispatch straight through runTool with no
    // remapping. This is the "100% permission" surface: every tool SMS/
    // Telegram can call, the dashboard agent can now call too.
    default:
      return await rt(name, input)
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
        tools: [...SHARED_TOOLS, ...dashboardOnlyTools],
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
