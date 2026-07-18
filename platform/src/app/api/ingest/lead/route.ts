/**
 * Cross-site LEAD ingest (shared by every standalone tenant site).
 *
 * Standalone marketing sites (nyc-tow + its sister sites: nycroadside…,
 * theroadsidehelper, tolltrucksnearme, etc.) run their own Next.js apps and
 * historically wrote leads only to their own DB + email. This route is the
 * single public sink that funnels their lead-form submissions into FullLoop's
 * `clients` + `portal_leads` tables, scoped by `tenant_slug`, so every site in
 * a business group lands in ONE tenant's Leads admin.
 *
 * Sibling of /api/ingest/application (same auth + slug pattern). The write/
 * notify logic mirrors the host-resolved /api/lead route — only the tenant
 * resolution differs (explicit slug instead of host header), since a
 * cross-origin POST from another site carries the wrong host.
 *
 * Auth: shared `INGEST_SECRET` (header `x-ingest-secret`). Insert-only via this
 * route; not the service-role key, so a compromised site cannot read or mutate
 * other tenant data.
 *
 * Public route: covered by middleware `isPublicRoute` (`/api/ingest(.*)`).
 */
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { randomClientPin, MAX_CLIENT_PIN_ATTEMPTS } from '@/lib/client-auth'
import { getTenantBySlug } from '@/lib/tenant-lookup'
import { emailAdmins } from '@/lib/admin-contacts'
import { adminNewClientEmail } from '@/lib/email-templates'
import { notify } from '@/lib/notify'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { trackError } from '@/lib/error-tracking'
import { rateLimitDb } from '@/lib/rate-limit-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface IngestLeadBody {
  tenant_slug?: string
  type?: string
  name?: string
  email?: string
  phone?: string
  details?: string
  message?: string
  source?: string
  [key: string]: unknown
}

// Standard fields handled explicitly; everything else a form sends (service,
// address, city, zip, when, vehicle, etc.) is folded into notes so no field is
// silently dropped.
const STANDARD_KEYS = new Set(['tenant_slug', 'type', 'name', 'email', 'phone', 'details', 'message', 'source'])

function buildLeadNotes(body: IngestLeadBody): string | null {
  const lines: string[] = []
  const base = (body.details || body.message || '').toString().trim()
  for (const [k, v] of Object.entries(body)) {
    if (STANDARD_KEYS.has(k)) continue
    if (v === undefined || v === null || v === '') continue
    const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    lines.push(`${label}: ${String(v)}`)
  }
  const extra = lines.join('\n')
  return [extra, base].filter(Boolean).join('\n\n').trim() || null
}

function secretMatches(provided: string | null): boolean {
  const expected = process.env.INGEST_SECRET
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-ingest-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: IngestLeadBody
  try {
    body = (await request.json()) as IngestLeadBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = body.tenant_slug?.trim()
  if (!slug) {
    return NextResponse.json({ error: 'tenant_slug is required' }, { status: 400 })
  }

  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    return NextResponse.json({ error: `Unknown tenant: ${slug}` }, { status: 400 })
  }

  // The shared INGEST_SECRET gates every standalone marketing site funneling
  // leads into this tenant's clients/portal_leads/deals + admin email — same
  // secret across many separate codebases, so a leak/compromise on any one
  // site turns this into an unbounded-write + admin-email-flood vector for
  // any known tenant_slug. Matches the sibling host-resolved /api/lead limit.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limit = await rateLimitDb(`ingest-lead:${tenant.id}:${ip}`, 5, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase() || null
  const phoneRaw = body.phone?.trim() || ''
  const notes = buildLeadNotes(body)

  if (!name || (!email && !phoneRaw)) {
    return NextResponse.json({ error: 'Name and a phone or email are required.' }, { status: 400 })
  }

  const cleanPhone = phoneRaw.replace(/\D/g, '')
  const phone = phoneRaw || null

  try {
    // Exact national-number match only (mirrors client/collect's established
    // fix for this exact bug class) -- a substring ilike() with only a
    // 7-digit floor let a short/malformed phone match an ARBITRARY unrelated
    // client in this tenant and silently overwrite their name/email/notes/
    // active-status. This route is reachable from any standalone site holding
    // the shared INGEST_SECRET, so a crafted short phone is fully attacker-controlled.
    const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
    const normalizedPhone = nat(cleanPhone)
    let existingClient: { id: string } | undefined
    if (normalizedPhone.length >= 10) {
      const { data: candidates } = await supabaseAdmin
        .from('clients')
        .select('id, phone')
        .eq('tenant_id', tenant.id)
      existingClient = candidates?.find((c) => nat((c.phone || '').replace(/\D/g, '')) === normalizedPhone)
    }

    let clientId: string
    let deduped = false
    if (existingClient) {
      deduped = true
      const { data: updated, error } = await supabaseAdmin
        .from('clients')
        .update({ name, email, notes, active: true, status: 'active' })
        .eq('id', existingClient.id)
        .eq('tenant_id', tenant.id)
        .select('id')
        .single()
      if (error) throw error
      clientId = updated.id
    } else {
      // idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql)
      // uniquely constrains (tenant_id, pin) with no application-layer check
      // before this insert -- regenerate-and-retry on 23505, same pattern
      // client/collect's identical insert uses, instead of throwing a raw
      // collision error and losing an external partner site's lead outright.
      let inserted, error
      for (let attempt = 0; attempt < MAX_CLIENT_PIN_ATTEMPTS; attempt++) {
        ;({ data: inserted, error } = await supabaseAdmin
          .from('clients')
          .insert({
            tenant_id: tenant.id,
            name,
            email,
            phone,
            notes,
            pin: randomClientPin(),
          })
          .select('id')
          .single())
        if (!error || error.code !== '23505') break
      }
      if (error || !inserted) throw error || new Error('insert failed')
      clientId = inserted.id
    }

    await supabaseAdmin
      .from('portal_leads')
      .insert({
        tenant_id: tenant.id,
        name,
        email,
        phone,
        notes,
        source: body.source || body.type || 'lead-form',
        client_id: clientId,
      })
      .then(() => {}, () => {})

    // Create the sales deal so the lead actually shows in Sales › Leads (which
    // reads `deals` @ stage 'new'). Without this, ingested leads landed as
    // client + portal_lead only and were invisible to Sales. Idempotent: bump an
    // existing open deal instead of duplicating on repeat submissions.
    try {
      const { data: openDeal } = await supabaseAdmin
        .from('deals')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('client_id', clientId)
        .in('stage', ['new', 'qualifying', 'quoted', 'pending'])
        .limit(1)
        .maybeSingle()
      if (openDeal) {
        await supabaseAdmin
          .from('deals')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', openDeal.id)
          .eq('tenant_id', tenant.id)
      } else {
        await supabaseAdmin.from('deals').insert({
          tenant_id: tenant.id,
          client_id: clientId,
          title: body.type || body.source || 'New lead',
          stage: 'new',
          mode: 'sales',
          probability: 25,
          source: body.source || body.type || 'ingest',
          notes,
          status: 'active',
        })
      }
    } catch (dealErr) {
      console.error('[ingest/lead] deal create error:', dealErr)
    }

    await notify({
      tenantId: tenant.id,
      type: 'new_client',
      title: 'New Lead',
      message: `${name}${phone ? ' • ' + phone : ''}`,
    }).catch((err) => console.error('[ingest/lead] notify error:', err))

    try {
      const adminUrl = `${tenantSiteUrl(tenant)}/admin/clients`
      const msg = adminNewClientEmail(
        { name, phone: phone || '', email: email || undefined, notes: notes || undefined },
        { tenantName: tenant.name, adminUrl },
      )
      await emailAdmins(tenant.id, msg.subject, msg.html)
    } catch (emailErr) {
      console.error('[ingest/lead] lead email error:', emailErr)
    }

    return NextResponse.json({ success: true, client_id: clientId, deduped })
  } catch (err) {
    console.error('[ingest/lead] error:', err)
    await trackError(err, { source: 'api/ingest/lead', severity: 'high' }).catch(() => {})
    return NextResponse.json({ error: 'Failed to ingest lead' }, { status: 500 })
  }
}
