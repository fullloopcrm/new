import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken, getGoogleBusiness } from '@/lib/google'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export type PostType = 'STANDARD' | 'EVENT' | 'OFFER'

interface GooglePostInput {
  tenantId: string
  summary: string
  callToActionType?: 'BOOK' | 'ORDER' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL'
  callToActionUrl?: string
  photoUrl?: string
}

/**
 * Create a Google Business Profile post.
 */
export async function createGooglePost({
  tenantId,
  summary,
  callToActionType,
  callToActionUrl,
  photoUrl,
}: GooglePostInput): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidAccessToken(tenantId)
  if (!accessToken) return { success: false, error: 'No valid Google token' }

  const business = await getGoogleBusiness(tenantId)
  if (!business?.location_name) return { success: false, error: 'No Google location configured' }

  const postBody: Record<string, unknown> = {
    languageCode: 'en',
    summary,
    topicType: 'STANDARD',
  }

  if (callToActionType && callToActionUrl) {
    postBody.callToAction = {
      actionType: callToActionType,
      url: callToActionUrl,
    }
  }

  if (photoUrl) {
    postBody.media = [{
      mediaFormat: 'PHOTO',
      sourceUrl: photoUrl,
    }]
  }

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${business.location_name}/localPosts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postBody),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('Failed to create Google post:', err)
    return { success: false, error: err }
  }

  const data = await res.json()

  // Log the post
  await supabaseAdmin.from('google_posts').insert({
    tenant_id: tenantId,
    google_post_id: data.name,
    summary,
    call_to_action_type: callToActionType || null,
    call_to_action_url: callToActionUrl || null,
    photo_url: photoUrl || null,
    status: 'published',
  })

  return { success: true }
}

/**
 * Generate a post using AI based on business type and optional topic.
 */
export async function generateGooglePost(
  tenantId: string,
  topic?: string,
): Promise<string> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, industry, phone, email')
    .eq('id', tenantId)
    .single()

  const bizName = tenant?.name || 'our business'
  const industry = tenant?.industry?.replace(/_/g, ' ') || 'service'

  const prompt = topic
    ? `Write a short Google Business Profile post (2-3 sentences max) for "${bizName}" (${industry}) about: ${topic}. Make it engaging and natural. Include a soft call to action. No hashtags. No emojis. Sound like a real business owner, not a marketer.`
    : `Write a short Google Business Profile post (2-3 sentences max) for "${bizName}" (${industry}). Pick a relevant topic like a seasonal tip, service highlight, or customer appreciation. Make it engaging and natural. Include a soft call to action. No hashtags. No emojis. Sound like a real business owner, not a marketer.`

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
 * Get all posts for a tenant from local DB.
 */
export async function getGooglePosts(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('google_posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}
