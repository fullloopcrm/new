/**
 * Public review submission. Called from tenant sites — tenant resolved via the
 * request host (set by middleware x-tenant-id header). Moderated: status=pending.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({ success: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
