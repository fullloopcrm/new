import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { generateReviewReply, postReviewReply } from '@/lib/google-reviews'
import { getGoogleBusiness } from '@/lib/google'

// GET — list reviews for current tenant
export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()

    const { data: reviews } = await supabaseAdmin
      .from('google_reviews')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('review_created_at', { ascending: false })
      .limit(50)

    // Check if auto-reply is enabled
    const { data: autoReplySetting } = await supabaseAdmin
      .from('tenant_settings')
      .select('google_auto_reply')
      .eq('tenant_id', tenant.id)
      .single()

    const business = await getGoogleBusiness(tenant.id)

    return NextResponse.json({
      reviews: reviews || [],
      connected: !!business?.location_name,
      locationTitle: business?.location_title || null,
      autoReplyEnabled: autoReplySetting?.google_auto_reply === true,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// POST — reply to a specific review (manual or AI-generated)
export async function POST(request: NextRequest) {
  try {
    const { tenant } = await getTenantForRequest()
    const { reviewId, reply, generateAI } = await request.json()

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
    }

    // Get the review
    const { data: review } = await supabaseAdmin
      .from('google_reviews')
      .select('*')
      .eq('id', reviewId)
      .eq('tenant_id', tenant.id)
      .single()

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    let replyText = reply

    // Generate AI reply if requested
    if (generateAI) {
      replyText = await generateReviewReply(
        tenant.id,
        review.reviewer_name,
        review.rating,
        review.comment || '',
      )
      // Return the generated text without posting (user can edit first)
      return NextResponse.json({ generatedReply: replyText })
    }

    if (!replyText) {
      return NextResponse.json({ error: 'Reply text required' }, { status: 400 })
    }

    // Post to Google
    const business = await getGoogleBusiness(tenant.id)
    if (!business?.location_name) {
      return NextResponse.json({ error: 'Google Business not connected' }, { status: 400 })
    }

    const reviewName = `${business.location_name}/reviews/${review.google_review_id}`
    const posted = await postReviewReply(tenant.id, reviewName, replyText)

    if (!posted) {
      return NextResponse.json({ error: 'Failed to post reply to Google' }, { status: 500 })
    }

    // Save locally
    await supabaseAdmin
      .from('google_reviews')
      .update({ reply: replyText })
      .eq('id', reviewId)

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

// PUT — toggle auto-reply setting
export async function PUT(request: NextRequest) {
  try {
    const { tenant } = await getTenantForRequest()
    const { autoReply } = await request.json()

    await supabaseAdmin
      .from('tenant_settings')
      .upsert(
        { tenant_id: tenant.id, google_auto_reply: !!autoReply, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      )

    return NextResponse.json({ success: true, autoReply })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
