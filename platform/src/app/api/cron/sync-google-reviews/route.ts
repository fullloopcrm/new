import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getValidAccessToken, getGoogleBusiness } from '@/lib/google'

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

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
      const newReviewIds: string[] = []
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

        if (!existing) {
          newReviews++
          if (reviewId) newReviewIds.push(reviewId)
        }

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
        // Insert-first claim before notifying: two overlapping invocations
        // for the same tenant (a slow round-trip across many review pages
        // bleeding into the next tick, a manual re-trigger) can both read
        // the same not-yet-synced reviews as "new" before either upsert
        // above commits, and both would otherwise fire a duplicate
        // "N new reviews" notification for the identical batch -- same
        // check-then-act race class this session has repeatedly found and
        // fixed (cron/comms-monitor, cron/schedule-monitor, every webhook
        // redelivery-dedup pass). A review's id is permanently written to
        // `google_reviews` by the upsert above, so the identical fingerprint
        // (tenant + exact set of newly-seen review ids) reappearing after
        // the race window closes is structurally unreachable -- same
        // ephemeral-fingerprint reasoning as comms-monitor's fix, so a plain
        // permanent unique constraint suffices (see
        // 2026_07_18_google_review_sync_alerts_dedup.sql).
        const fingerprint = `${tenant.id}:${newReviewIds.sort().join(',')}`.slice(0, 500)
        const { error: claimErr } = await supabaseAdmin
          .from('google_review_sync_alerts')
          .insert({ fingerprint })

        if (!claimErr) {
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenant.id,
            type: 'feedback',
            title: `${newReviews} new Google review${newReviews > 1 ? 's' : ''}`,
            message: `Synced ${allReviews.length} total reviews from Google Business Profile.`,
          })
        } else if (claimErr.code !== '23505') {
          console.error(`[sync-google-reviews] claim insert failed for ${tenant.name}:`, claimErr)
        }
      }

      results.push({ tenant: tenant.name, synced: allReviews.length, new: newReviews })
    } catch (e) {
      console.error(`Google review sync error for ${tenant.name}:`, e)
      results.push({ tenant: tenant.name, synced: 0, new: 0, error: 'Sync failed' })
    }
  }

  return NextResponse.json({ results })
}
