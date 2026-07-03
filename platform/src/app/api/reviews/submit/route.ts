/**
 * Public review submission. Called from tenant sites — tenant resolved via the
 * request host (set by middleware x-tenant-id header). Moderated: status=pending.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getSettings } from '@/lib/settings'
import { notify } from '@/lib/notify'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`reviews:${ip}`, 5, 60 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
    }

    const tenant = await getTenantFromHeaders()
    if (!tenant) {
      return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, rating, text, service_type, neighborhood, team_member_name, images, video_url } = body

    if (!name || !rating || !text) {
      return NextResponse.json({ error: 'Name, rating, and review text are required' }, { status: 400 })
    }
    const r = Number(rating)
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }
    if (typeof text !== 'string' || text.length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: 'Review must be under 2000 characters' }, { status: 400 })
    }

    let client_id: string | null = null
    let verified = false
    const normalizedEmail = email ? String(email).toLowerCase().trim() : null
    if (normalizedEmail) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('email', normalizedEmail)
        .maybeSingle()
      if (client) {
        client_id = client.id as string
        verified = true
      }
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        tenant_id: tenant.id,
        name: String(name).trim(),
        email: normalizedEmail,
        rating: r,
        text: text.trim(),
        service_type: service_type || null,
        neighborhood: neighborhood || null,
        team_member_name: team_member_name || null,
        images: Array.isArray(images) ? images.slice(0, 5) : [],
        video_url: video_url || null,
        status: 'pending',
        verified,
        client_id,
        published_at: null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[reviews/submit] insert error:', error)
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
    }

    // Owner heads-up on submission. LOW ratings keep the existing intervene-
    // before-it-surfaces notify; ratings ABOVE the threshold (previously
    // silent) now fire a Luxe owner alert so good reviews are heard too. Both
    // owner-only + non-fatal — a comms failure must not 500 the public submit.
    try {
      const settings = await getSettings(tenant.id)
      if (r <= settings.review_low_rating_threshold) {
        await notify({
          tenantId: tenant.id,
          type: 'review_received',
          title: `Low rating alert: ${r}/5 from ${name}`,
          message: `${name} just left a ${r}-star review${service_type ? ` for ${service_type}` : ''}. Reach out before it goes public.\n\n"${String(text).slice(0, 200)}${String(text).length > 200 ? '...' : ''}"`,
          channel: 'email',
          recipientType: 'admin',
        })
      } else {
        // Review text + name are PUBLIC user input → escape before HTML email.
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        const safeName = esc(String(name).trim())
        const snippet = esc(String(text).slice(0, 240)) + (String(text).length > 240 ? '…' : '')
        const stars = '★'.repeat(r) + '☆'.repeat(5 - r)
        const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
        await ownerAlert({
          tenantId: tenant.id,
          subject: `New ${r}-star review from ${safeName}`,
          kicker: 'New review',
          heading: `${r}-star review from ${safeName}`,
          bodyHtml: `<p style="margin:0 0 10px;font-size:18px;letter-spacing:2px">${stars}${service_type ? ` <span style="font-size:13px;letter-spacing:0">· ${esc(String(service_type))}</span>` : ''}</p><p style="margin:0">&ldquo;${snippet}&rdquo;</p>`,
          sms: `New ${r}★ review from ${String(name).trim()}${service_type ? ` (${service_type})` : ''}.`,
        })
      }
    } catch (notifyErr) {
      console.error('[reviews/submit] owner alert failed:', notifyErr)
    }

    await audit({ tenantId: tenant.id, action: 'review.created', entityType: 'review', entityId: data.id, details: { rating: r, verified }, ip })

    return NextResponse.json({ success: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
