import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { createGooglePost, generateGooglePost, getGooglePosts } from '@/lib/google-posts'
import { requirePermission } from '@/lib/require-permission'

// GET — list all posts for tenant. Gated on campaigns.view, matching the
// sibling social/posts route's established convention -- 'staff' has no
// campaigns permission at all per rbac.ts.
export async function GET() {
  const { tenant, error: authError } = await requirePermission('campaigns.view')
  if (authError) return authError

  try {
    const posts = await getGooglePosts(tenant.tenantId)
    return NextResponse.json({ posts })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// POST — create a new Google Business post. Publishes live to the tenant's
// Google Business Profile with no draft/approval step, so it's gated the same
// as the sibling live-publish route (social/post -> campaigns.send) rather
// than campaigns.create.
export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('campaigns.send')
  if (authError) return authError

  try {
    const { summary, generateAI, topic, callToActionType, callToActionUrl, photoUrl } = await request.json()

    // Generate AI content if requested
    if (generateAI) {
      const generated = await generateGooglePost(tenant.tenantId, topic)
      return NextResponse.json({ generatedPost: generated })
    }

    if (!summary) {
      return NextResponse.json({ error: 'Post content required' }, { status: 400 })
    }

    const result = await createGooglePost({
      tenantId: tenant.tenantId,
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
