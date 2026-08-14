import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { sanitizePostgrestValue } from '@/lib/postgrest-safe'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'
import { getSettings } from '@/lib/settings'
import { createPrimaryContact } from '@/lib/client-contacts'
import { formatName } from '@/lib/format'
import { stripPhone } from '@/lib/phone'
import { isValidLeadSource } from '@/lib/lead-sources'
import { resolveOnboardingTenantId } from '@/lib/onboarding-auth'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'
import { queueForReview } from '@/lib/client-dedupe'
import { trackError } from '@/lib/error-tracking'
import { notify } from '@/lib/notify'

export const OPTIONS = corsPreflight

export const GET = withMobileCors(async function GET(request: NextRequest) {
  try {
    // Every other verb on this route family (POST here, PUT/DELETE on
    // [id]) is gated by requirePermission('clients.*') -- this GET only
    // called getTenantForRequest(), so a tenant that uses the real,
    // documented per-role permission override feature (selena_config.
    // role_permissions) to revoke clients.view from a role would have that
    // revocation silently ignored here: any authenticated tenant member,
    // any role, could still list every client's full PII. No tenant
    // currently has such an override configured (confirmed live 2026-07-31),
    // so this was dormant, not actively exploited -- but real and fixable.
    const { tenant: authTenant, error: authError } = await requirePermission('clients.view')
    if (authError) return authError
    const { tenantId } = authTenant
    const db = tenantDb(tenantId)
    const url = request.nextUrl
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 1000)
    const offset = (page - 1) * limit

    // tenantDb auto-injects .eq('tenant_id', tenantId) on the select below.
    let query = db
      .from('clients')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      const s = sanitizePostgrestValue(search)
      // Phone is stored E.164 (+1XXXXXXXXXX). A user typing a formatted
      // number ("(212) 555-1234") won't literally substring-match that, so
      // match on digits-only against the same column separately.
      const searchDigits = stripPhone(search)
      const orParts = [`name.ilike.%${s}%`, `email.ilike.%${s}%`]
      if (searchDigits) orParts.push(`phone.ilike.%${searchDigits}%`)
      query = query.or(orParts.join(','))
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clients: data, total: count })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>

  // Session + RBAC wins when present (unchanged dashboard behavior). With no
  // session, a valid onboarding token is accepted instead -- same as /api/
  // catalog -- so a brand-new tenant can import their client list from the
  // onboarding wizard before they've ever logged in.
  const { tenant, error: authError } = await requirePermission('clients.create')
  let tenantId: string
  if (tenant) {
    tenantId = tenant.tenantId
  } else if (typeof body.token === 'string') {
    const resolvedId = await resolveOnboardingTenantId(body.token)
    if (!resolvedId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    tenantId = resolvedId
  } else {
    return authError
  }

  try {
    const db = tenantDb(tenantId)
    const settings = await getSettings(tenantId)

    const validated = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      address: { type: 'string', max: 500 },
      source: { type: 'string', max: 100 },
      status: { type: 'string', max: 50 },
      sales_partner_id: { type: 'uuid' },
      referrer_id: { type: 'uuid' },
      notes: { type: 'string', max: 2000 },
    })
    if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 })
    const fields = validated.data
    if (fields?.name) fields.name = formatName(fields.name as string)

    // Required for every direct-client-creation path that bypasses the deals
    // pipeline (see lss-08 readiness finding, 2026-08-01): 90% of real clients
    // had zero lead-source record at all, not just an unsold deal.
    if (!isValidLeadSource(fields?.source)) {
      return NextResponse.json({ error: 'source (lead source) is required and must be one of the known options' }, { status: 400 })
    }

    // Tenant rules: enforce required fields, default the lifecycle status.
    if (settings.require_client_phone && !fields?.phone) {
      return NextResponse.json({ error: 'Phone number is required for new clients.' }, { status: 400 })
    }
    if (settings.require_client_email && !fields?.email) {
      return NextResponse.json({ error: 'Email address is required for new clients.' }, { status: 400 })
    }
    if (fields && !fields.status) {
      fields.status = settings.default_client_status || 'active'
    }

    // sales_partner_id is a plain uuid per the validate() schema above --
    // confirm it actually belongs to this tenant before it's attributed,
    // same tenant-ownership check every other FK-by-id write in this route
    // family enforces (a cross-tenant id here would misattribute commission
    // earnings to the wrong tenant's partner).
    if (fields?.sales_partner_id) {
      const { data: partnerRow } = await supabaseAdmin
        .from('sales_partners')
        .select('id')
        .eq('id', fields.sales_partner_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!partnerRow) {
        return NextResponse.json({ error: 'Invalid sales partner' }, { status: 400 })
      }
    }

    // Same tenant-ownership check as sales_partner_id above -- referrer_id
    // drives the sticky commission attribution read on every completed
    // cleaning (see 2026_07_18_sales_partners.sql), so a cross-tenant id here
    // would misattribute commission earnings to the wrong tenant's referrer.
    if (fields?.referrer_id) {
      const { data: referrerRow } = await supabaseAdmin
        .from('referrers')
        .select('id')
        .eq('id', fields.referrer_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!referrerRow) {
        return NextResponse.json({ error: 'Invalid referrer' }, { status: 400 })
      }
    }

    // Check for potential duplicates
    const duplicateChecks = []
    if (fields?.email) {
      duplicateChecks.push(
        db
          .from('clients')
          .select('id, name, email, phone')
          .eq('email', fields.email)
          .limit(1)
      )
    }
    if (fields?.phone) {
      duplicateChecks.push(
        db
          .from('clients')
          .select('id, name, email, phone')
          .eq('phone', fields.phone)
          .limit(1)
      )
    }

    const dupeResults = await Promise.all(duplicateChecks)
    const duplicates = dupeResults.flatMap(r => r.data || [])
    const uniqueDupes = [...new Map(duplicates.map(d => [d.id, d])).values()]

    // Automated dedupe (2026-08-13): a submission whose phone AND email both
    // exactly match one existing client is treated as that same client, not
    // a new one -- no new row is created, no force-to-override step needed.
    // Two different real customers sharing both pieces of contact info at
    // once is a vanishingly rare false positive (unlike a single-field
    // match, which is common -- shared landline, typo'd email -- and still
    // goes through the warn-and-force flow below). See src/lib/client-dedupe.ts.
    if (fields?.email && fields?.phone) {
      const fullMatches = uniqueDupes.filter(
        (d) => d.phone === fields.phone && d.email && String(d.email).toLowerCase() === String(fields.email).toLowerCase()
      )
      if (fullMatches.length === 1) {
        const existing = fullMatches[0]
        await audit({
          tenantId,
          action: 'client.dedupe_prevented',
          entityType: 'client',
          entityId: existing.id,
          details: { name: fields.name, phone: fields.phone, email: fields.email },
        })
        return NextResponse.json({ client: existing, deduped: true }, { status: 200 })
      }
    }

    // If force=true in body, skip duplicate warning
    const force = (body as Record<string, unknown>).force === true

    if (uniqueDupes.length > 0 && !force) {
      return NextResponse.json({
        warning: 'Potential duplicate client found',
        duplicates: uniqueDupes,
        message: 'Set force=true to create anyway',
      }, { status: 409 })
    }

    // tenantDb.insert stamps tenant_id last, so a forged body value can't win.
    const { data, error } = await db
      .from('clients')
      .insert({ ...fields })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // A partial match (phone-only or email-only) was overridden with
    // force=true -- the new row now genuinely duplicates an existing client
    // on one field. Not safe to auto-merge (see client-dedupe.ts), so queue
    // it for a human instead of letting it silently sit as an unflagged dupe.
    const queuedMatches: string[] = []
    for (const dupe of uniqueDupes) {
      const matchType = dupe.phone === fields?.phone ? 'phone' : 'email'
      const matchValue = matchType === 'phone' ? String(fields?.phone) : String(fields?.email)
      try {
        await queueForReview({ tenantId, clientAId: data.id, clientBId: dupe.id, matchType, matchValue })
        queuedMatches.push(`${fields.name} + ${dupe.name || dupe.id} — matched on ${matchType} only`)
      } catch (queueErr) {
        // Best-effort: the client was already created successfully -- don't
        // fail the request over a queue-write hiccup, but don't lose it silently either.
        await trackError(queueErr, { source: 'api/clients:dedupe-queue', severity: 'medium', tenantId })
      }
    }
    // One notify() for this request, even if uniqueDupes has more than one
    // entry -- never one notify() per dupe (see client-dedupe.ts's
    // sweepTenant docstring for the 2026-08-14 incident this avoids).
    if (queuedMatches.length > 0) {
      await notify({
        tenantId,
        type: 'client_dedupe_queued',
        title: 'Duplicate Client Queued for Review',
        message: `force=true created a client that duplicates an existing one — queued for review (Clients > Duplicates):\n${queuedMatches.join('\n')}`,
        recipientType: 'admin',
      })
    }

    // Required by every client-creation path — without it, getClientContacts()
    // returns empty forever and this client's confirmation email/SMS silently
    // no-ops on every future send. See createPrimaryContact's own docstring.
    await createPrimaryContact(tenantId, data.id, { name: data.name, phone: data.phone, email: data.email })

    await audit({ tenantId, action: 'client.created', entityType: 'client', entityId: data.id, details: { name: data.name } })

    return NextResponse.json({ client: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
