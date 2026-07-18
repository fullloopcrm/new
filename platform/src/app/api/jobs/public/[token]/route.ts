/**
 * Public, view-only job photo timeline. Token-authenticated (no tenant
 * session) — mirrors /api/quotes/public/[token]. Returns job basics + photos
 * only; internal comments and tags stay office-only.
 *
 * GET /api/jobs/public/[token] → { job, photos }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type Params = { params: Promise<{ token: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('id, title, service_address, status, tenants!inner(name, slug, logo_url, primary_color, status)')
      .eq('public_token', token)
      .eq('tenants.status', 'active')
      .maybeSingle()
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: photos } = await supabaseAdmin
      .from('job_photos')
      .select('id, url, photo_type, pair_id, caption, taken_at')
      .eq('job_id', job.id)
      .order('taken_at', { ascending: false })

    return NextResponse.json({
      job: { title: job.title, service_address: job.service_address, status: job.status, tenant: job.tenants },
      photos: photos ?? [],
    })
  } catch (err) {
    console.error('GET /api/jobs/public/[token]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
