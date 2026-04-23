/**
 * Generate an AI reply to a Google review. Admin hits this to preview
 * before posting via /api/admin/google/reply. Tenant-aware.
 */
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(request: Request) {
  try {
    const { tenant } = await getTenantForRequest()
    const { reviewerName, rating, comment } = await request.json()

    if (typeof rating !== 'number') {
      return NextResponse.json({ error: 'rating required' }, { status: 400 })
    }

    const business = tenant.name || 'our business'
    const industry = tenant.industry || 'services'

    const tone = rating >= 4
      ? 'This is a positive review — thank them and say you look forward to seeing them again.'
      : rating === 3
        ? 'This is a neutral review — thank them and ask how you can improve.'
        : 'This is a negative review — apologize sincerely, take responsibility, and offer to make it right. Do not be defensive.'

    const prompt = `You are the owner of "${business}", a professional ${industry} business. Write a short, warm reply to this Google review. Be genuine and professional. Keep it under 3 sentences. Don't be overly enthusiastic or use excessive exclamation marks.

${tone}

Reviewer: ${reviewerName || 'Customer'}
Rating: ${rating}/5 stars
Review: ${comment || '(no comment, just a star rating)'}

Reply:`

    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = message.content[0]
    const reply = block.type === 'text' ? block.text.trim() : ''
    return NextResponse.json({ reply })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('Failed to generate reply:', e)
    return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 })
  }
}
