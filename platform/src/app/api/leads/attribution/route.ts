import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { getSettings } from '@/lib/settings'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    // Honor the tenant's configured attribution window — only count visits
    // within the last N hours toward source attribution.
    const settings = await getSettings(tenantId)
    const windowMs = Math.max(1, settings.attribution_window_hours) * 3_600_000
    const since = new Date(Date.now() - windowMs).toISOString()

    // Get referrer breakdown from visits
    const { data: visits } = await supabaseAdmin
      .from('website_visits')
      .select('referrer')
      .eq('tenant_id', tenantId)
      .gte('created_at', since)
      .not('referrer', 'is', null)

    const sources: Record<string, number> = {}
    ;(visits || []).forEach((v) => {
      const ref = v.referrer || 'direct'
      let source = 'direct'
      if (ref.includes('google')) source = 'Google'
      else if (ref.includes('bing')) source = 'Bing'
      else if (ref.includes('chatgpt') || ref.includes('openai')) source = 'ChatGPT'
      else if (ref.includes('facebook')) source = 'Facebook'
      else if (ref.includes('instagram')) source = 'Instagram'
      else if (ref.includes('yelp')) source = 'Yelp'
      else if (ref !== 'direct') source = ref
      sources[source] = (sources[source] || 0) + 1
    })

    const attribution = Object.entries(sources)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      attribution,
      total: visits?.length || 0,
      window_hours: settings.attribution_window_hours,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
