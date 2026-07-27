import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { postToFacebook, postToInstagram } from '@/lib/social'
import { requirePermission } from '@/lib/require-permission'

// message/caption land in social_posts.content with no DB-side length limit
// and get forwarded straight to Meta's Graph API; photoUrl/imageUrl likewise.
// Cap here before either downstream call.
const MAX_POST_TEXT = 5000
const MAX_URL = 2000

function capString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('campaigns.send')
  if (authError) return authError

  try {
    const body = await request.json()
    const platform = body?.platform
    const message = capString(body?.message, MAX_POST_TEXT)
    const photoUrl = capString(body?.photoUrl, MAX_URL)
    const caption = capString(body?.caption, MAX_POST_TEXT)
    const imageUrl = capString(body?.imageUrl, MAX_URL)

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
    }

    if (platform === 'facebook') {
      if (!message) {
        return NextResponse.json({ error: 'Message is required for Facebook posts' }, { status: 400 })
      }
      const result = await postToFacebook(tenant.tenantId, message, photoUrl)
      return NextResponse.json(result)
    }

    if (platform === 'instagram') {
      if (!caption || !imageUrl) {
        return NextResponse.json({ error: 'Caption and image URL are required for Instagram posts' }, { status: 400 })
      }
      const result = await postToInstagram(tenant.tenantId, caption, imageUrl)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
