import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/company/track — pageview beacon for Full Loop's OWN marketing
// site only (see (marketing)/VisitTracker.tsx). Public, unauthenticated,
// sendBeacon-compatible — same shape as /api/leads/visits but writes
// platform_website_visits (no tenant_id; this site isn't a tenant's site).
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, unknown>

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      const text = await request.text()
      body = JSON.parse(text)
    }

    const { session_id, visitor_id, referrer, device, page_url, utm_source, utm_medium, utm_campaign } =
      body as Record<string, string | null | undefined>

    await supabaseAdmin.from('platform_website_visits').insert({
      session_id: session_id || null,
      visitor_id: visitor_id || null,
      referrer: referrer || null,
      device: device || null,
      page_url: page_url || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
    })

    return new NextResponse(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
