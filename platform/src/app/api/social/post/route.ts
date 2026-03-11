import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { postToFacebook, postToInstagram } from '@/lib/social'

export async function POST(request: Request) {
  try {
    const { tenant } = await getTenantForRequest()
    const { platform, message, photoUrl, caption, imageUrl } = await request.json()

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
    }

    if (platform === 'facebook') {
      if (!message) {
        return NextResponse.json({ error: 'Message is required for Facebook posts' }, { status: 400 })
      }
      const result = await postToFacebook(tenant.id, message, photoUrl)
      return NextResponse.json(result)
    }

    if (platform === 'instagram') {
      if (!caption || !imageUrl) {
        return NextResponse.json({ error: 'Caption and image URL are required for Instagram posts' }, { status: 400 })
      }
      const result = await postToInstagram(tenant.id, caption, imageUrl)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
