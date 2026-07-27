import { supabaseAdmin } from '@/lib/supabase'
import { encryptSecret, decryptSecret, isEncrypted } from '@/lib/secret-crypto'
import { getSettings } from '@/lib/settings'

export type SocialPlatform = 'facebook' | 'instagram'

interface SocialAccount {
  id: string
  tenant_id: string
  platform: SocialPlatform
  account_id: string
  account_name: string
  access_token: string
  token_expires_at: string | null
  page_id: string | null // Facebook page ID (for posting)
  connected_at: string
}

/**
 * Get connected social accounts for a tenant.
 */
export async function getSocialAccounts(tenantId: string): Promise<SocialAccount[]> {
  const { data } = await supabaseAdmin
    .from('social_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('connected_at', { ascending: false })

  const accounts = (data || []) as SocialAccount[]

  // Decrypt access_token if encrypted; legacy plaintext rows pass through
  // unchanged (decryptSecret is a no-op on non-"v1:" values). A single
  // corrupt/undecryptable row shouldn't break the whole list.
  return accounts.map((a) => {
    if (!a.access_token || !isEncrypted(a.access_token)) return a
    try {
      return { ...a, access_token: decryptSecret(a.access_token) }
    } catch (err) {
      console.error(`[social] access_token decrypt failed for account ${a.id}:`, err)
      return { ...a, access_token: '' }
    }
  })
}

/**
 * Save a social account connection.
 */
export async function saveSocialAccount(
  tenantId: string,
  platform: SocialPlatform,
  accountData: {
    account_id: string
    account_name: string
    access_token: string
    token_expires_at?: string
    page_id?: string
  },
): Promise<void> {
  // Encrypt the long-lived OAuth token at rest, matching the tenants-table
  // vendor-secret pattern (encryptTenantSecrets) -- Facebook/Instagram page
  // tokens derived from a long-lived user token don't expire on a fixed
  // refresh_token, so a plaintext DB row is a standing credential. Degrade
  // to plaintext in dev where SECRET_ENCRYPTION_KEY isn't set, same as
  // google.ts's saveGoogleTokens.
  let accessToken = accountData.access_token
  if (accessToken) {
    try {
      accessToken = encryptSecret(accessToken)
    } catch (err) {
      if (process.env.NODE_ENV === 'production') throw err
      console.warn('[social] SECRET_ENCRYPTION_KEY not set — storing access_token in plaintext (dev only)')
    }
  }

  await supabaseAdmin
    .from('social_accounts')
    .upsert({
      tenant_id: tenantId,
      platform,
      account_id: accountData.account_id,
      account_name: accountData.account_name,
      access_token: accessToken,
      token_expires_at: accountData.token_expires_at || null,
      page_id: accountData.page_id || null,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,platform' })
}

/**
 * Disconnect a social account.
 */
export async function disconnectSocialAccount(
  tenantId: string,
  platform: SocialPlatform,
): Promise<void> {
  await supabaseAdmin
    .from('social_accounts')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('platform', platform)
}

/**
 * Post to a Facebook page.
 */
export async function postToFacebook(
  tenantId: string,
  message: string,
  photoUrl?: string,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const accounts = await getSocialAccounts(tenantId)
  const fb = accounts.find(a => a.platform === 'facebook')

  if (!fb || !fb.page_id) {
    return { success: false, error: 'Facebook not connected or no page selected' }
  }

  const endpoint = photoUrl
    ? `https://graph.facebook.com/v19.0/${fb.page_id}/photos`
    : `https://graph.facebook.com/v19.0/${fb.page_id}/feed`

  const body: Record<string, string> = {
    access_token: fb.access_token,
    message,
  }
  if (photoUrl) body.url = photoUrl

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Facebook post failed:', err)
    return { success: false, error: 'Failed to post to Facebook' }
  }

  const data = await res.json()

  // Log the post
  await supabaseAdmin.from('social_posts').insert({
    tenant_id: tenantId,
    platform: 'facebook',
    external_post_id: data.id || data.post_id,
    content: message,
    photo_url: photoUrl || null,
    status: 'published',
  })

  return { success: true, postId: data.id }
}

/**
 * Post to Instagram (via Facebook Graph API — requires connected FB page + IG account).
 */
export async function postToInstagram(
  tenantId: string,
  caption: string,
  imageUrl: string, // Required for IG
): Promise<{ success: boolean; error?: string }> {
  const accounts = await getSocialAccounts(tenantId)
  const ig = accounts.find(a => a.platform === 'instagram')

  if (!ig) {
    return { success: false, error: 'Instagram not connected' }
  }

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${ig.account_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: ig.access_token,
      }),
    }
  )

  if (!containerRes.ok) {
    return { success: false, error: 'Failed to create IG media container' }
  }

  const container = await containerRes.json()

  // Step 2: Publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${ig.account_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: ig.access_token,
      }),
    }
  )

  if (!publishRes.ok) {
    return { success: false, error: 'Failed to publish to Instagram' }
  }

  // Log the post
  await supabaseAdmin.from('social_posts').insert({
    tenant_id: tenantId,
    platform: 'instagram',
    external_post_id: container.id,
    content: caption,
    photo_url: imageUrl,
    status: 'published',
  })

  return { success: true }
}

/**
 * Get post history for a tenant.
 */
export async function getSocialPosts(tenantId: string) {
  const { data } = await supabaseAdmin
    .from('social_posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}

/**
 * Accounts (across all tenants) whose token expires within `withinMs`.
 * Used by the token-refresh cron; access_token comes back decrypted.
 */
export async function getExpiringSocialAccounts(withinMs: number): Promise<SocialAccount[]> {
  const cutoff = new Date(Date.now() + withinMs).toISOString()
  const { data } = await supabaseAdmin
    .from('social_accounts')
    .select('*')
    .not('token_expires_at', 'is', null)
    .lte('token_expires_at', cutoff)

  const accounts = (data || []) as SocialAccount[]
  return accounts.map((a) => {
    if (!a.access_token || !isEncrypted(a.access_token)) return a
    try {
      return { ...a, access_token: decryptSecret(a.access_token) }
    } catch (err) {
      console.error(`[social] access_token decrypt failed for account ${a.id}:`, err)
      return { ...a, access_token: '' }
    }
  })
}

/**
 * Extend a Facebook/Instagram page token before it expires. Meta's
 * long-lived page tokens (~60 days) can only be re-extended while still
 * valid -- once fully expired the tenant has to reconnect via OAuth.
 */
export async function refreshFacebookToken(
  account: SocialAccount,
): Promise<{ success: boolean; error?: string }> {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appId || !appSecret) {
    return { success: false, error: 'Facebook app not configured' }
  }
  if (!account.access_token) {
    return { success: false, error: 'No access token to extend' }
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${account.access_token}`
  )
  const data = await res.json()

  if (!res.ok || !data.access_token) {
    console.error(`[social] token extend failed for account ${account.id}:`, data)
    return { success: false, error: 'Token extend failed' }
  }

  await saveSocialAccount(account.tenant_id, account.platform, {
    account_id: account.account_id,
    account_name: account.account_name,
    access_token: data.access_token,
    page_id: account.page_id || undefined,
    token_expires_at: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
  })

  return { success: true }
}

/**
 * Auto-post a job's photo to the tenant's connected Facebook/Instagram
 * accounts when a booking is checked out. Opt-in per tenant
 * (social_autopost_enabled). Deliberately generic — never includes client
 * name, address, or any other PII, only the service type.
 *
 * No-ops silently (not an error) when: auto-post is off, no platform is
 * connected, or the job has no 'after'/'progress' photo explicitly marked
 * shareable yet — this runs fire-and-forget off the checkout path and must
 * never fail loud there.
 */
export async function autoPostJobCompletion(tenantId: string, bookingId: string): Promise<void> {
  const settings = await getSettings(tenantId)
  if (!settings.social_autopost_enabled) return

  const accounts = await getSocialAccounts(tenantId)
  if (accounts.length === 0) return

  const photo = await pickAutoPostPhoto(tenantId, bookingId)
  if (!photo) return

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('service_type')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single()

  const serviceType = (booking?.service_type as string | null) || 'job'
  const caption = settings.social_autopost_caption_template.replace(/\{service_type\}/g, serviceType)

  const hasFacebook = accounts.some(a => a.platform === 'facebook')
  const hasInstagram = accounts.some(a => a.platform === 'instagram')

  // Independent try/catch per platform — one failing (e.g. an expired IG
  // token) must not block the other from posting.
  if (hasFacebook) {
    await postToFacebook(tenantId, caption, photo.url).catch((err) =>
      console.error(`[social] auto-post to Facebook failed for booking ${bookingId}:`, err))
  }
  if (hasInstagram) {
    await postToInstagram(tenantId, caption, photo.url).catch((err) =>
      console.error(`[social] auto-post to Instagram failed for booking ${bookingId}:`, err))
  }
}

async function pickAutoPostPhoto(tenantId: string, bookingId: string): Promise<{ url: string } | null> {
  // 'after' photos are the marketing-worthy shot; fall back to 'progress'.
  // Deliberately excludes 'before' — a messy pre-job photo isn't something
  // a tenant wants auto-published to their public feed. shareable=true is
  // required regardless of type — whoever captured the photo must have
  // explicitly opted it in (see PhotoCapture.tsx), tenant-level auto-post
  // being on is not itself consent for any specific photo.
  for (const photoType of ['after', 'progress'] as const) {
    const { data } = await supabaseAdmin
      .from('job_photos')
      .select('url')
      .eq('tenant_id', tenantId)
      .eq('booking_id', bookingId)
      .eq('photo_type', photoType)
      .eq('shareable', true)
      .order('taken_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.url) return { url: data.url as string }
  }
  return null
}
