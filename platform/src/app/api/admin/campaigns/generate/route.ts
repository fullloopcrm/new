/**
 * AI-generated campaign copy. Tenant-aware — uses tenant name/industry/brand color
 * to keep the output consistent with the calling tenant's brand.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(request: Request) {
  try {
    const { tenant } = await getTenantForRequest()
    const { prompt, channel } = await request.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const includeEmail = channel === 'email' || channel === 'both'
    const includeSms = channel === 'sms' || channel === 'both'

    const businessName = tenant.name || 'our company'
    const industry = tenant.industry || 'service'
    const brand = tenant.primary_color || '#2563eb'
    const bookUrl = tenant.domain ? `https://${tenant.domain}/book` : '/book'
    const phone = tenant.phone || ''

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a marketing copywriter for ${businessName}, a professional ${industry} business. Generate campaign content based on this prompt:

"${prompt}"

Return a JSON object with these fields:
- "name": a short campaign name (3-5 words, for internal use)
- "subject": an email subject line (compelling, under 60 chars)
${includeEmail ? `- "email_body": HTML email body content. Use inline styles only.
  - Headings: <h1 style="font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px 0;">
  - Body text: <p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
  - For CTAs use: <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;"><tr><td align="center"><a href="${bookUrl}" style="display: inline-block; background-color: ${brand}; color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Book Now</a></td></tr></table>
  - For highlight boxes: <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0;">
  - Keep it clean, warm, and professional. No emojis in email.
  - HTML gets wrapped in the standard email template automatically — provide inner content only.` : ''}
${includeSms ? `- "sms_body": a short SMS version (under 160 chars, include "${businessName}" and a call to action${phone ? ` like "Text ${phone}"` : ''})` : ''}

IMPORTANT: Return ONLY the raw JSON object. No markdown, no code fences, no explanation.`,
      }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    let parsed: { name?: string; subject?: string; email_body?: string; sms_body?: string }
    try {
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
    }

    return NextResponse.json({
      name: parsed.name || '',
      subject: parsed.subject || '',
      email_body: parsed.email_body || '',
      sms_body: parsed.sms_body || '',
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    const e = err as { message?: string }
    console.error('Campaign generate error:', e.message || err)
    return NextResponse.json({ error: e.message || 'Generation failed' }, { status: 500 })
  }
}
