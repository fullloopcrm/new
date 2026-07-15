import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

// Projects = long jobs (weeks-to-year). A project owns a span and one or more
// booking touchpoints. This creates a project row plus a single span booking
// (project_id set → duration_class derives to 'project'), so it appears in the
// Projects view immediately. Tenant-scoped, additive.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('bookings.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('*, clients(name)')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ projects: data || [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const startDate = typeof body.start_date === 'string' ? body.start_date : ''
    const endDate = typeof body.end_date === 'string' ? body.end_date : ''
    const clientId = typeof body.client_id === 'string' && body.client_id ? body.client_id : null
    const serviceType = typeof body.service_type === 'string' && body.service_type.trim() ? body.service_type.trim() : null

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return NextResponse.json({ error: 'start_date and end_date must be YYYY-MM-DD' }, { status: 400 })
    if (endDate < startDate) return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 })

    // Confirm the client (if given) belongs to this tenant.
    if (clientId) {
      const { data: c } = await supabaseAdmin.from('clients').select('id').eq('id', clientId).eq('tenant_id', tenantId).single()
      if (!c) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: project, error: pErr } = await supabaseAdmin
      .from('projects')
      .insert({ tenant_id: tenantId, client_id: clientId, title, stage: 'scheduled', service_type: serviceType, start_date: startDate, end_date: endDate })
      .select()
      .single()
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

    // Span booking (naive wall-clock, no team member → overlap trigger skips it).
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        project_id: project.id,
        start_time: `${startDate}T09:00:00`,
        end_time: `${endDate}T17:00:00`,
        service_type: serviceType,
        price: 0,
        status: 'scheduled',
        duration_class: 'project',
      })
      .select('id')
      .single()
    if (bErr) return NextResponse.json({ error: bErr.message, project }, { status: 500 })

    return NextResponse.json({ project, booking_id: booking?.id })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
