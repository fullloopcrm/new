import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    // Get referrer breakdown from visits
    const { data: visits } = await supabaseAdmin
      .from('website_visits')
      .select('referrer')
      .eq('tenant_id', tenantId)
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

    return NextResponse.json({ attribution, total: visits?.length || 0 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
