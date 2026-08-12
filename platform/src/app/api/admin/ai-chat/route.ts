/**
 * Admin AI Chat — CRM copilot. Claude with tools for querying and mutating
 * the tenant's CRM data. Tenant-scoped end-to-end.
 *
 * Ported from nycmaid: cleaner_id/cleaners → team_member_id/team_members.
 * Tool schemas + dispatch/execute logic live in ./tools.ts — a Next.js route
 * file may only export HTTP method handlers, so executeTool can't live here
 * and stay directly unit-testable.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'
import { overridesFor } from '@/lib/require-permission'
import { getTenantTimezone } from '@/lib/tenant-time'
import { tools, executeTool } from './tools'

export async function POST(request: Request) {
  try {
    const tenantCtx = await getTenantForRequest()
    const { tenantId, tenant, role } = tenantCtx
    const overrides = overridesFor(tenantCtx)
    const { messages } = await request.json()
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }
    if (!tenant.anthropic_api_key && !process.env.ANTHROPIC_API_KEY) {
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
- Dates are stored as naive ISO strings (no timezone). Today is ${new Date().toLocaleDateString('en-US', { timeZone: getTenantTimezone(tenant), weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.
- Prices are stored in cents. Display as dollars.
- Format results concisely — bullet points or short lists.
- If a user asks to do something, do it (after confirmation if destructive). Don't explain how to do it in the UI.`

    // Tenant's own Anthropic key if set, platform key otherwise.
    const anthropic = anthropicFromStoredKey(tenant.anthropic_api_key)
    let currentMessages = [...messages] as Array<Anthropic.Messages.MessageParam>
    let maxIterations = 10

    while (maxIterations-- > 0) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
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
            const result = await executeTool(tenantId, block.name, block.input as Record<string, unknown>, role, overrides)
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
