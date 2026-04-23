import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request: Request) {
  try {
    const { tenant, tenantId } = await getTenantForRequest()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const { messages, context } = await request.json()

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
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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
