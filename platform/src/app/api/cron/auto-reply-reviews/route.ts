import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { autoReplyReviews } from '@/lib/google-reviews'
import { safeEqual } from '@/lib/timing-safe-equal'
import { tenantServesSite } from '@/lib/tenant-status'

// Runs on schedule — auto-replies to unreplied Google reviews
// for all tenants with auto-reply enabled
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all tenants with auto-reply enabled
  const { data: settings } = await supabaseAdmin
    .from('tenant_settings')
    .select('tenant_id')
    .eq('google_auto_reply', true)

  if (!settings || settings.length === 0) {
    return NextResponse.json({ message: 'No tenants with auto-reply enabled' })
  }

  // Same class of gap fixed in sync-google-reviews this session: this loop
  // never checked tenantServesSite() before spending a real Google Business
  // Profile API call to post a PUBLIC reply on a tenant's behalf — a
  // suspended/cancelled/deleted tenant kept auto-replying to its Google
  // reviews indefinitely.
  const settingTenantIds = Array.from(new Set(settings.map((s) => s.tenant_id as string)))
  const { data: settingTenants } = await supabaseAdmin
    .from('tenants')
    .select('id, status')
    .in('id', settingTenantIds)
  const servingTenantIds = new Set(
    (settingTenants || []).filter((t) => tenantServesSite(t.status)).map((t) => t.id as string),
  )

  const results: { tenant_id: string; replied: number; error?: string }[] = []

  for (const setting of settings) {
    if (!servingTenantIds.has(setting.tenant_id as string)) continue
    try {
      const replied = await autoReplyReviews(setting.tenant_id)
      results.push({ tenant_id: setting.tenant_id, replied })
    } catch (e) {
      console.error(`Auto-reply failed for tenant ${setting.tenant_id}:`, e)
      results.push({ tenant_id: setting.tenant_id, replied: 0, error: 'Failed' })
    }
  }

  const totalReplied = results.reduce((sum, r) => sum + r.replied, 0)

  return NextResponse.json({
    tenants: results.length,
    totalReplied,
    results,
  })
}
