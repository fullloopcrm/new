import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { safeEqual } from '@/lib/timing-safe-equal'

export const maxDuration = 60

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  let deleted = 0

  // Find bookings with walkthrough videos older than 30 days (all tenants)
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, walkthrough_video_url, final_video_url, walkthrough_video_url_uploaded_at, final_video_url_uploaded_at, notes')
    .not('walkthrough_video_url', 'is', null)

  const { data: bookings2 } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, walkthrough_video_url, final_video_url, walkthrough_video_url_uploaded_at, final_video_url_uploaded_at, notes')
    .not('final_video_url', 'is', null)

  const allBookings = [...(bookings || []), ...(bookings2 || [])]
  const seen = new Set<string>()

  for (const booking of allBookings) {
    if (seen.has(booking.id)) continue
    seen.add(booking.id)

    // Skip if booking has dispute flag
    if (booking.notes?.includes('[DISPUTE]')) continue

    const updates: Record<string, null> = {}

    // Clean walkthrough video
    if (booking.walkthrough_video_url && booking.walkthrough_video_url_uploaded_at && booking.walkthrough_video_url_uploaded_at < thirtyDaysAgo) {
      const path = extractOwnStoragePath(booking.walkthrough_video_url, booking.tenant_id)
      if (path) await supabaseAdmin.storage.from('uploads').remove([path])
      updates.walkthrough_video_url = null
      updates.walkthrough_video_url_uploaded_at = null
      deleted++
    }

    // Clean final video
    if (booking.final_video_url && booking.final_video_url_uploaded_at && booking.final_video_url_uploaded_at < thirtyDaysAgo) {
      const path = extractOwnStoragePath(booking.final_video_url, booking.tenant_id)
      if (path) await supabaseAdmin.storage.from('uploads').remove([path])
      updates.final_video_url = null
      updates.final_video_url_uploaded_at = null
      deleted++
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('bookings').update(updates).eq('id', booking.id)
    }
  }

  return NextResponse.json({ success: true, deleted })
}

// Defense in depth: this cron runs across ALL tenants with the service role
// (bypasses RLS) and deletes from the shared `uploads` bucket by path. If a
// stored video_url ever contained a path outside this booking's own tenant
// folder (e.g. a validation gap upstream, or a row edited directly), a bare
// regex extract-and-delete would let one tenant's stale video trigger deletion
// of an ARBITRARY file belonging to a different tenant. Require the extracted
// path to actually live under this booking's own tenant_id folder.
function extractOwnStoragePath(url: string, tenantId: string): string | null {
  const match = url.match(/\/object\/public\/uploads\/(.+)$/)
  const path = match ? match[1] : null
  if (!path || !path.startsWith(`${tenantId}/`)) return null
  return path
}
