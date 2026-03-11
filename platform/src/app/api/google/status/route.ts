import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getGoogleTokens, getGoogleBusiness } from '@/lib/google'
import { supabaseAdmin } from '@/lib/supabase'

// Dashboard-level Google status check
export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()

    const tokens = await getGoogleTokens(tenant.id)
    if (!tokens) {
      return NextResponse.json({ connected: false })
    }

    const business = await getGoogleBusiness(tenant.id)
    if (!business?.location_name) {
      return NextResponse.json({ connected: false, error: 'No location found' })
    }

    // Get review stats
    const { data: reviews } = await supabaseAdmin
      .from('google_reviews')
      .select('rating')
      .eq('tenant_id', tenant.id)

    const allReviews = reviews || []
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0

    // Get post count
    const { count: postCount } = await supabaseAdmin
      .from('google_posts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    // Check auto-reply setting
    const { data: autoReplySetting } = await supabaseAdmin
      .from('tenant_settings')
      .select('value')
      .eq('tenant_id', tenant.id)
      .eq('key', 'google_auto_reply')
      .single()

    return NextResponse.json({
      connected: true,
      locationTitle: business.location_title || business.location_name,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: allReviews.length,
      totalPosts: postCount || 0,
      autoReplyEnabled: autoReplySetting?.value === 'true',
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
