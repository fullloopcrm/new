import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 60

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
      const path = extractStoragePath(booking.walkthrough_video_url)
      if (path) await supabaseAdmin.storage.from('uploads').remove([path])
      updates.walkthrough_video_url = null
      updates.walkthrough_video_url_uploaded_at = null
      deleted++
    }

    // Clean final video
    if (booking.final_video_url && booking.final_video_url_uploaded_at && booking.final_video_url_uploaded_at < thirtyDaysAgo) {
      const path = extractStoragePath(booking.final_video_url)
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

function extractStoragePath(url: string): string | null {
  // Extract path after /object/public/uploads/
  const match = url.match(/\/object\/public\/uploads\/(.+)$/)
  return match ? match[1] : null
}
