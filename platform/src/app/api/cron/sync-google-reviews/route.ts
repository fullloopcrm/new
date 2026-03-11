import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken, getGoogleBusiness } from '@/lib/google'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all tenants with Google connected
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, google_tokens, google_business')
    .not('google_tokens', 'is', null)

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ message: 'No tenants with Google connected' })
  }

  const results: { tenant: string; synced: number; new: number; error?: string }[] = []

  for (const tenant of tenants) {
    try {
      const accessToken = await getValidAccessToken(tenant.id)
      if (!accessToken) {
        results.push({ tenant: tenant.name, synced: 0, new: 0, error: 'No valid token' })
        continue
      }

      const business = await getGoogleBusiness(tenant.id)
      if (!business?.location_name) {
        results.push({ tenant: tenant.name, synced: 0, new: 0, error: 'No location' })
        continue
      }

      // Fetch reviews (paginated)
      let allReviews: Record<string, unknown>[] = []
      let pageToken: string | null = null

      do {
        const url = new URL(`https://mybusiness.googleapis.com/v4/${business.location_name}/reviews`)
        url.searchParams.set('pageSize', '50')
        if (pageToken) url.searchParams.set('pageToken', pageToken)

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!res.ok) {
          const err = await res.text()
          console.error(`Google reviews fetch failed for ${tenant.name}:`, err)
          break
        }

        const data = await res.json()
        allReviews = allReviews.concat(data.reviews || [])
        pageToken = data.nextPageToken || null
      } while (pageToken)

      // Upsert reviews
      let newReviews = 0
      for (const review of allReviews) {
        const r = review as Record<string, unknown>
        const reviewId = (r.reviewId as string) || (r.name as string)?.split('/').pop()
        const starRating = r.starRating as string
        const rating = starRating === 'FIVE' ? 5
          : starRating === 'FOUR' ? 4
          : starRating === 'THREE' ? 3
          : starRating === 'TWO' ? 2 : 1

        const { data: existing } = await supabaseAdmin
          .from('google_reviews')
          .select('id')
          .eq('google_review_id', reviewId)
          .eq('tenant_id', tenant.id)
          .single()

        if (!existing) newReviews++

        const reviewer = r.reviewer as Record<string, unknown> | undefined
        const reviewReply = r.reviewReply as Record<string, unknown> | undefined

        await supabaseAdmin
          .from('google_reviews')
          .upsert({
            tenant_id: tenant.id,
            google_review_id: reviewId,
            reviewer_name: (reviewer?.displayName as string) || 'Anonymous',
            reviewer_photo_url: (reviewer?.profilePhotoUrl as string) || null,
            rating,
            comment: (r.comment as string) || '',
            reply: (reviewReply?.comment as string) || null,
            review_created_at: (r.createTime as string) || new Date().toISOString(),
            synced_at: new Date().toISOString(),
          }, { onConflict: 'tenant_id,google_review_id' })
      }

      if (newReviews > 0) {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenant.id,
          type: 'feedback',
          title: `${newReviews} new Google review${newReviews > 1 ? 's' : ''}`,
          message: `Synced ${allReviews.length} total reviews from Google Business Profile.`,
        })
      }

      results.push({ tenant: tenant.name, synced: allReviews.length, new: newReviews })
    } catch (e) {
      console.error(`Google review sync error for ${tenant.name}:`, e)
      results.push({ tenant: tenant.name, synced: 0, new: 0, error: 'Sync failed' })
    }
  }

  return NextResponse.json({ results })
}
