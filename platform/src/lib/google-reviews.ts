import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken, getGoogleBusiness } from '@/lib/google'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

/**
 * Generate an AI reply for a Google review.
 * Uses tenant's business name and the review content to craft a natural response.
 */
export async function generateReviewReply(
  tenantId: string,
  reviewerName: string,
  rating: number,
  comment: string,
): Promise<string> {
  // Get business info for context
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, industry')
    .eq('id', tenantId)
    .single()

  const bizName = tenant?.name || 'our business'
  const industry = tenant?.industry?.replace(/_/g, ' ') || 'service'

  const prompt = rating >= 4
    ? `Write a warm, professional reply to a ${rating}-star Google review for "${bizName}" (${industry}). The reviewer "${reviewerName}" said: "${comment}". Keep it 2-3 sentences. Thank them genuinely, reference something specific they said if possible. Don't be generic or overly enthusiastic. Sound like a real business owner.`
    : `Write a professional, empathetic reply to a ${rating}-star Google review for "${bizName}" (${industry}). The reviewer "${reviewerName}" said: "${comment}". Keep it 2-3 sentences. Acknowledge their experience, apologize if appropriate, and offer to make it right (invite them to contact you directly). Don't be defensive. Sound like a caring business owner.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0]
  if (text.type === 'text') return text.text.trim()
  return ''
}

/**
 * Post a reply to a Google review via the API.
 */
export async function postReviewReply(
  tenantId: string,
  reviewName: string, // e.g. accounts/123/locations/456/reviews/789
  replyText: string,
): Promise<boolean> {
  const accessToken = await getValidAccessToken(tenantId)
  if (!accessToken) return false

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: replyText }),
    }
  )

  if (!res.ok) {
    console.error('Failed to post review reply:', await res.text())
    return false
  }

  return true
}

/**
 * Auto-reply to all unreplied reviews for a tenant.
 * Returns count of replies posted.
 */
export async function autoReplyReviews(tenantId: string): Promise<number> {
  // Check if auto-reply is enabled for this tenant
  const { data: settings } = await supabaseAdmin
    .from('tenant_settings')
    .select('value')
    .eq('tenant_id', tenantId)
    .eq('key', 'google_auto_reply')
    .single()

  if (!settings || settings.value !== 'true') return 0

  // Get unreplied reviews
  const { data: unreplied } = await supabaseAdmin
    .from('google_reviews')
    .select('id, google_review_id, reviewer_name, rating, comment')
    .eq('tenant_id', tenantId)
    .is('reply', null)
    .not('comment', 'is', null)
    .order('review_created_at', { ascending: false })
    .limit(10)

  if (!unreplied || unreplied.length === 0) return 0

  const business = await getGoogleBusiness(tenantId)
  if (!business?.location_name) return 0

  let replied = 0

  for (const review of unreplied) {
    try {
      // Generate AI reply
      const replyText = await generateReviewReply(
        tenantId,
        review.reviewer_name,
        review.rating,
        review.comment || '',
      )

      if (!replyText) continue

      // Build the full review resource name
      const reviewName = `${business.location_name}/reviews/${review.google_review_id}`

      // Post to Google
      const posted = await postReviewReply(tenantId, reviewName, replyText)

      if (posted) {
        // Save reply locally
        await supabaseAdmin
          .from('google_reviews')
          .update({ reply: replyText })
          .eq('id', review.id)

        replied++
      }
    } catch (e) {
      console.error(`Failed to auto-reply review ${review.id}:`, e)
    }
  }

  return replied
}
