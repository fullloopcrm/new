import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { createGooglePost, generateGooglePost, getGooglePosts } from '@/lib/google-posts'

// GET — list all posts for tenant
export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()
    const posts = await getGooglePosts(tenant.id)
    return NextResponse.json({ posts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// POST — create a new Google Business post
export async function POST(request: NextRequest) {
  try {
    const { tenant } = await getTenantForRequest()
    const { summary, generateAI, topic, callToActionType, callToActionUrl, photoUrl } = await request.json()

    // Generate AI content if requested
    if (generateAI) {
      const generated = await generateGooglePost(tenant.id, topic)
      return NextResponse.json({ generatedPost: generated })
    }

    if (!summary) {
      return NextResponse.json({ error: 'Post content required' }, { status: 400 })
    }

    const result = await createGooglePost({
      tenantId: tenant.id,
      summary,
      callToActionType,
      callToActionUrl,
      photoUrl,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
