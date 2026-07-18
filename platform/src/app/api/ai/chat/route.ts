import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Same risk/convention as admin/translate's MAX_TEXT_LENGTH: the rate limit
// below caps call *volume*, not payload size. Without a per-message and
// array-length cap, one authenticated tenant member (any role) could send a
// single oversized `messages` array — still just 30 calls per 10 min, but
// each one arbitrarily large — driving real Anthropic spend against the
// tenant's (or platform's) stored key.
const MAX_MESSAGES = 40
const MAX_MESSAGE_LENGTH = 4000

function validateMessages(input: unknown): { role: 'user' | 'assistant'; content: string }[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_MESSAGES) return null
  for (const m of input) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null
    if (m.content.length > MAX_MESSAGE_LENGTH) return null
  }
  return input as { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(request: Request) {
  try {
    const { tenant, tenantId } = await getTenantForRequest()

    if (!tenant.anthropic_api_key && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    // Any authenticated tenant member can trigger this paid Anthropic call
    // with no cost control; cap per-tenant volume so a scripted caller can't
    // run up unbounded API spend. Matches admin/translate's convention.
    const rl = await rateLimitDb(`ai-chat:${tenantId}`, 30, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many AI requests. Try again shortly.' }, { status: 429 })
    }

    // Tenant's own Anthropic key if set, platform key otherwise.
    const anthropic = anthropicFromStoredKey(tenant.anthropic_api_key)

    const { messages: rawMessages, context } = await request.json()

    const messages = validateMessages(rawMessages)
    if (!messages) {
      return NextResponse.json(
        { error: `Invalid messages — max ${MAX_MESSAGES} messages, ${MAX_MESSAGE_LENGTH} characters each` },
        { status: 400 },
      )
    }

    // Get business context for grounding
    const [
      { count: clientCount },
      { count: bookingCount },
      { count: teamCount },
      { data: recentBookings },
    ] = await Promise.all([
      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabaseAdmin.from('bookings').select('id, status, start_time, final_price').eq('tenant_id', tenantId).order('start_time', { ascending: false }).limit(5),
    ])

    const systemPrompt = `You are Selena, an AI assistant for ${tenant.name}, a ${tenant.industry?.replace(/_/g, ' ')} business using Full Loop CRM.

Business context:
- ${clientCount || 0} clients, ${bookingCount || 0} bookings, ${teamCount || 0} team members
- Recent bookings: ${JSON.stringify(recentBookings || [])}
- Business phone: ${tenant.phone || 'not set'}, email: ${tenant.email || 'not set'}

You help with:
1. Writing email/SMS campaigns — marketing copy, promotions, reminders, follow-ups
2. Drafting client communications — professional, friendly, on-brand
3. Creating service descriptions for the website and portal
4. Generating review request messages
5. Answering questions about CRM features and best practices
6. Suggesting business growth strategies for ${tenant.industry?.replace(/_/g, ' ')} businesses

${context === 'campaign' ? `The user is creating a campaign. Help them write compelling subject lines and body copy. Use {name} for client name and {business} for business name as merge tags.` : ''}

Keep responses concise and actionable. Format with markdown when helpful. Always stay professional and on-brand for a service business.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ message: text })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('AI error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
