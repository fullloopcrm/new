import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken, getGoogleBusiness } from '@/lib/google'
import { anthropicFromStoredKey } from '@/lib/anthropic-client'

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
    .select('name, industry, anthropic_api_key')
    .eq('id', tenantId)
    .single()

  const bizName = tenant?.name || 'our business'
  const industry = tenant?.industry?.replace(/_/g, ' ') || 'service'
  // Tenant's own Anthropic key if set, platform key otherwise.
  const anthropic = anthropicFromStoredKey(tenant?.anthropic_api_key as string | null | undefined)

  const prompt = rating >= 4
    ? `Write a warm, professional reply to a ${rating}-star Google review for "${bizName}" (${industry}). The reviewer "${reviewerName}" said: "${comment}". Keep it 2-3 sentences. Thank them genuinely, reference something specific they said if possible. Don't be generic or overly enthusiastic. Sound like a real business owner.`
    : `Write a professional, empathetic reply to a ${rating}-star Google review for "${bizName}" (${industry}). The reviewer "${reviewerName}" said: "${comment}". Keep it 2-3 sentences. Acknowledge their experience, apologize if appropriate, and offer to make it right (invite them to contact you directly). Don't be defensive. Sound like a caring business owner.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
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
    .select('google_auto_reply')
    .eq('tenant_id', tenantId)
    .single()

  if (!settings || !settings.google_auto_reply) return 0

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
    // Claim BEFORE generating/posting: the old flow selected reviews with
    // reply IS NULL, generated an AI reply and PUT it to Google, and only
    // then wrote `reply` locally -- a check-then-act race. Two overlapping
    // invocations reading the same unreplied review would both burn a real
    // Anthropic call and both PUT to Google's reply endpoint, which is a
    // last-write-wins overwrite slot, not an append -- the loser's PUT can
    // land last and leave the local `reply` column out of sync with what's
    // actually live on Google. reply_claimed_at is a dedicated column
    // (not `reply` itself, which must stay real-text-or-null for the
    // dashboard + sync-google-reviews) claimed via compare-and-swap; the
    // losing invocation's claim affects 0 rows and it skips.
    const { data: claimed } = await supabaseAdmin
      .from('google_reviews')
      .update({ reply_claimed_at: new Date().toISOString() })
      .eq('id', review.id)
      .is('reply_claimed_at', null)
      .select('id')
      .maybeSingle()
    if (!claimed) continue

    try {
      // Generate AI reply
      const replyText = await generateReviewReply(
        tenantId,
        review.reviewer_name,
        review.rating,
        review.comment || '',
      )

      if (!replyText) {
        // Release the claim so the next cron pass retries this review --
        // losing the retry here (unlike a one-shot notification) means the
        // review just never gets answered.
        await supabaseAdmin.from('google_reviews').update({ reply_claimed_at: null }).eq('id', review.id)
        continue
      }

      // Build the full review resource name
      const reviewName = `${business.location_name}/reviews/${review.google_review_id}`

      // Post to Google
      const posted = await postReviewReply(tenantId, reviewName, replyText)

      if (posted) {
        // Save reply locally
        await supabaseAdmin
          .from('google_reviews')
          .update({ reply: replyText, replied_at: new Date().toISOString() })
          .eq('id', review.id)

        replied++
      } else {
        await supabaseAdmin.from('google_reviews').update({ reply_claimed_at: null }).eq('id', review.id)
      }
    } catch (e) {
      console.error(`Failed to auto-reply review ${review.id}:`, e)
      await supabaseAdmin.from('google_reviews').update({ reply_claimed_at: null }).eq('id', review.id)
    }
  }

  return replied
}
