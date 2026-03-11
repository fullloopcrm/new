import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { getGoogleTokens, getGoogleBusiness } from '@/lib/google'

export async function GET(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
  }

  const tokens = await getGoogleTokens(tenantId)
  if (!tokens) {
    return NextResponse.json({ connected: false })
  }

  const business = await getGoogleBusiness(tenantId)
  if (!business?.location_name) {
    return NextResponse.json({ connected: false, error: 'No location found' })
  }

  // Read from cached google_reviews table
  const { data: reviews } = await supabaseAdmin
    .from('google_reviews')
    .select('google_review_id, reviewer_name, rating, comment, reply, review_created_at')
    .eq('tenant_id', tenantId)
    .order('review_created_at', { ascending: false })
    .limit(50)

  const allReviews = (reviews || []).map(r => ({
    id: r.google_review_id,
    reviewer: r.reviewer_name,
    rating: r.rating,
    comment: r.comment,
    reply: r.reply,
    created_at: r.review_created_at,
  }))

  const avgRating = allReviews.length > 0
    ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    : 0
  const totalReviews = allReviews.length

  return NextResponse.json({
    connected: true,
    reviews: allReviews,
    avgRating,
    totalReviews,
  })
}
