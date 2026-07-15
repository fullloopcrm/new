/**
 * Generate an AI reply to a Google review. Admin hits this to preview
 * before posting via /api/admin/google/reply. Tenant-aware.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function POST(request: Request) {
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('reviews.request')
    if (authError) return authError
    const { tenant, tenantId } = authTenant
    const { reviewerName, rating, comment } = await request.json()

    if (typeof rating !== 'number') {
      return NextResponse.json({ error: 'rating required' }, { status: 400 })
    }

    // Any authenticated tenant member can trigger this paid Anthropic call
    // with no cost control; cap per-tenant volume so a scripted caller can't
    // run up unbounded API spend. Matches admin/translate's convention.
    const rl = await rateLimitDb(`google-generate-reply:${tenantId}`, 30, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many AI requests. Try again shortly.' }, { status: 429 })
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

    // Tenant's own Anthropic key if set, platform key otherwise.
    const anthropic = anthropicFromStoredKey(tenant.anthropic_api_key)
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
