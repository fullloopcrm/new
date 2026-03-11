import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { autoReplyReviews } from '@/lib/google-reviews'

// Runs on schedule — auto-replies to unreplied Google reviews
// for all tenants with auto-reply enabled
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all tenants with auto-reply enabled
  const { data: settings } = await supabaseAdmin
    .from('tenant_settings')
    .select('tenant_id')
    .eq('key', 'google_auto_reply')
    .eq('value', 'true')

  if (!settings || settings.length === 0) {
    return NextResponse.json({ message: 'No tenants with auto-reply enabled' })
  }

  const results: { tenant_id: string; replied: number; error?: string }[] = []

  for (const setting of settings) {
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
