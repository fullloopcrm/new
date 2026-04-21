import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function getClientIP(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip')
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    // High-frequency endpoint (every visitor, every scroll tick) — cap so a
    // runaway client or scraper can't pummel the DB. 240/min/IP is generous.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`track:${ip}`, 240, 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit' }, { status: 429, headers: corsHeaders })
    }

    let body: Record<string, unknown>

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      body = await request.json()
    } else {
      const text = await request.text()
      try { body = JSON.parse(text) } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: corsHeaders })
      }
    }

    // sendBeacon can only POST — handle PATCH via _method override
    if (body._method === 'PATCH') {
      return handlePatch(request, body)
    }

    const visitorIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''

    const {
      tenant_id, domain, page, action, session_id, visitor_id, lead_id, referrer,
      ref_code, first_domain, first_visit_at, last_domain, device, scroll_depth,
      time_on_page, engaged_30s, placement, scroll_at_cta, time_before_cta,
      cta_clicked_at, load_time_ms, load_speed, utm_source, utm_medium,
      utm_campaign, final_scroll, final_time, cta_clicked,
      screen_w, screen_h, connection, active_time
    } = body

    if (!domain || !action) {
      return NextResponse.json({ error: 'Missing domain or action' }, { status: 400, headers: corsHeaders })
    }

    const payload: Record<string, unknown> = {
      tenant_id: tenant_id || null,
      domain,
      page: page || '/',
      action,
      session_id: session_id || null,
      visitor_id: visitor_id || null,
      lead_id: lead_id || null,
      referrer: referrer || null,
      ref_code: ref_code || null,
      first_domain: first_domain || null,
      first_visit_at: first_visit_at || null,
      last_domain: last_domain || null,
      device: device || 'unknown',
      scroll_depth: scroll_depth || 0,
      time_on_page: time_on_page || 0,
      engaged_30s: engaged_30s || false,
      placement: placement || null,
      scroll_at_cta: scroll_at_cta || null,
      time_before_cta: time_before_cta || null,
      cta_clicked_at: cta_clicked_at || null,
      load_time_ms: load_time_ms || null,
      load_speed: load_speed || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      final_scroll: final_scroll || null,
      final_time: final_time || null,
      cta_clicked: cta_clicked || false,
      visitor_ip: visitorIP,
    }

    const extraFields: Record<string, unknown> = {}
    if (screen_w) extraFields.screen_w = parseInt(screen_w as string) || null
    if (screen_h) extraFields.screen_h = parseInt(screen_h as string) || null
    if (connection) extraFields.connection = connection
    if (active_time) extraFields.active_time = parseInt(active_time as string) || null
    if (userAgent) extraFields.user_agent = userAgent.substring(0, 500)

    const fullPayload = { ...payload, ...extraFields }
    let { error } = await supabaseAdmin.from('lead_clicks').insert(fullPayload)

    if (error) {
      const { error: err2 } = await supabaseAdmin.from('lead_clicks').insert(payload)
      if (err2) {
        delete payload.visitor_ip
        await supabaseAdmin.from('lead_clicks').insert(payload)
      }
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err) {
    console.error('Track error:', err)
    return NextResponse.json({ success: true }, { headers: corsHeaders })
  }
}

async function handlePatch(request: Request, body?: Record<string, unknown>) {
  try {
    if (!body) {
      const text = await request.text()
      body = JSON.parse(text)
    }
    const { session_id, visitor_id, domain, final_scroll, final_time, cta_clicked, active_time } = body as Record<string, unknown>

    if (!session_id || !domain) {
      return NextResponse.json({ error: 'Missing session_id or domain' }, { status: 400, headers: corsHeaders })
    }

    const domainVariants = [domain as string]
    if ((domain as string).startsWith('www.')) {
      domainVariants.push((domain as string).replace('www.', ''))
    } else {
      domainVariants.push(`www.${domain}`)
    }

    const { data: visits } = await supabaseAdmin
      .from('lead_clicks')
      .select('id')
      .eq('session_id', session_id)
      .in('domain', domainVariants)
      .eq('action', 'visit')
      .order('created_at', { ascending: false })
      .limit(1)

    if (visits && visits.length > 0) {
      const update: Record<string, unknown> = {
        final_scroll: final_scroll || 0,
        final_time: final_time || 0,
        cta_clicked: cta_clicked || false,
        engaged_30s: ((final_time as number) || 0) >= 30
      }
      if (active_time) update.active_time = parseInt(active_time as string) || null
      if (visitor_id) update.visitor_id = visitor_id

      await supabaseAdmin
        .from('lead_clicks')
        .update(update)
        .eq('id', visits[0].id)
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err) {
    console.error('Track PATCH error:', err)
    return NextResponse.json({ success: true }, { headers: corsHeaders })
  }
}

export async function PATCH(request: Request) {
  return handlePatch(request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const body: Record<string, string | null> = {}
  searchParams.forEach((value, key) => { body[key] = value })

  const fakeRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body)
  })

  return POST(fakeRequest)
}
