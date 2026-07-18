import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'
import { removeDomain } from '@/lib/vercel-domains'
import { getPrimaryTenantDomain } from '@/lib/domains'
import { encryptSecret, isEncrypted, ENCRYPTED_TENANT_FIELDS } from '@/lib/secret-crypto'
import { PRICING } from '@/lib/billing-pricing'
import { omit } from '@/lib/validate'

// Vendor API-key fields that must be encrypted at rest — shared single source
// of truth so write paths can't drift (see secret-crypto.ts).
const ENCRYPTED_FIELDS = ENCRYPTED_TENANT_FIELDS

// Fields with zero read-back consumers on admin/businesses/[id]/page.tsx (and
// its sibling wizard/selena-persona pages) — grepped, confirmed neither reads
// these back raw. Unlike the ENCRYPTED_FIELDS above (which this page
// legitimately prefills into editable inputs so an admin can view/rotate an
// existing key — stripping those would blank the field and risk wiping the
// stored key on next save, the same trap /api/settings/route.ts's own
// NEVER_RETURNED_FIELDS comment documents avoiding), these two carry zero
// legitimate read-back use: `google_tokens` is a live Google OAuth
// access/refresh-token pair (long-lived account access to the tenant's real
// Google Business Profile) that the one consumer (line ~874) only ever
// truthy-checks for a "connected" badge — replaced below with an explicit
// boolean instead. `telegram_webhook_secret` has no consumer anywhere in
// src/app/admin/**.
const NEVER_RETURNED_BUSINESS_FIELDS = ['google_tokens', 'telegram_webhook_secret'] as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const [
    { data: business },
    { data: members },
    { data: invites },
    { count: clients },
    { count: bookings },
    { count: team_members },
    primaryDomain,
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('*').eq('id', id).single(),
    // Explicit column list, NOT select('*') — this is returned wholesale to
    // the browser as `members` below, and tenant_members carries pin_hash
    // (the tenant admin's live login-PIN hash). Sibling routes that surface
    // PIN state (admin/businesses/[id]/users, admin/users) deliberately never
    // return the raw hash, only derived has_pin/pin_set_at/last_login — this
    // list matches that invariant instead of leaking it via select('*').
    supabaseAdmin.from('tenant_members').select('id, tenant_id, clerk_user_id, role, name, email, phone, created_at').eq('tenant_id', id),
    supabaseAdmin.from('tenant_invites').select('*').eq('tenant_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    getPrimaryTenantDomain(id),
  ])

  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Revenue
  const { data: revenueData } = await supabaseAdmin
    .from('bookings')
    .select('final_price')
    .eq('tenant_id', id)
    .in('status', ['paid', 'completed'])

  const revenue = (revenueData || []).reduce((sum, b) => sum + (b.final_price || 0), 0)

  // Service types count
  const { count: serviceCount } = await supabaseAdmin
    .from('service_types')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', id)
    .eq('active', true)

  // Manual checkoffs from setup_progress JSON
  const sp = (business.setup_progress || {}) as Record<string, boolean>

  // Granular onboarding checklist — every real step an operator does
  const checklist = {
    accounts: {
      gmail_created: !!business.gmail_account,
      gmail_2fa: !!sp.gmail_2fa,
      gmail_recovery_set: !!sp.gmail_recovery_set,
      domain_purchased: !!business.domain_name,
      domain_registrar_noted: !!sp.domain_registrar_noted,
    },
    dns_hosting: {
      domain_added_vercel: !!sp.domain_added_vercel,
      dns_a_record: !!sp.dns_a_record,
      dns_cname_www: !!sp.dns_cname_www,
      mx_records: !!sp.mx_records,
      email_forwarding: !!sp.email_forwarding,
      ssl_active: !!sp.ssl_active,
      dns_propagated: !!business.dns_configured,
    },
    resend: {
      resend_account_created: !!sp.resend_account_created,
      resend_domain_added: !!sp.resend_domain_added,
      resend_dkim_added: !!sp.resend_dkim_added,
      resend_spf_added: !!sp.resend_spf_added,
      resend_dmarc_added: !!sp.resend_dmarc_added,
      resend_domain_verified: !!business.email_domain_verified,
      resend_api_key_generated: !!sp.resend_api_key_generated,
      resend_api_key_saved: !!business.resend_api_key,
    },
    telnyx: {
      telnyx_account_created: !!sp.telnyx_account_created,
      telnyx_compliance_submitted: !!sp.telnyx_compliance_submitted,
      telnyx_compliance_approved: !!sp.telnyx_compliance_approved,
      telnyx_number_purchased: !!business.sms_number || !!business.telnyx_phone,
      telnyx_messaging_profile: !!sp.telnyx_messaging_profile,
      telnyx_webhook_url: !!sp.telnyx_webhook_url,
      telnyx_api_key_generated: !!sp.telnyx_api_key_generated,
      telnyx_api_key_saved: !!business.telnyx_api_key,
    },
    stripe: {
      stripe_account_created: !!sp.stripe_account_created,
      stripe_business_verified: !!sp.stripe_business_verified,
      stripe_bank_connected: !!sp.stripe_bank_connected,
      stripe_webhook_configured: !!sp.stripe_webhook_configured,
      stripe_connected_platform: !!business.stripe_account_id,
      stripe_test_payment: !!sp.stripe_test_payment,
    },
    google: {
      gbp_created: !!sp.gbp_created,
      gbp_verified: !!sp.gbp_verified,
      gbp_photos_added: !!sp.gbp_photos_added,
      gbp_hours_set: !!sp.gbp_hours_set,
      place_id_saved: !!business.google_place_id,
      search_console_verified: !!sp.search_console_verified,
    },
    website: {
      vercel_project_created: !!sp.vercel_project_created,
      vercel_env_vars: !!sp.vercel_env_vars,
      content_collected: !!sp.website_content_ready,
      template_configured: !!sp.website_template_configured,
      website_deployed: !!business.website_published,
      // tenant_domains FIRST, tenants.domain FALLBACK — mirrors
      // tenant-lookup.ts's resolution order. Previously checked
      // business.domain_name alone, which is the registrar/display field (see
      // the PUT handler's comment above), never the field the resolver
      // actually reads or tenant_domains — so a tenant onboarded through the
      // recommended admin/websites flow (which writes tenant_domains only,
      // never tenants.domain_name) showed "Custom domain live: false" on this
      // checklist forever, even with DNS and the site both fully live.
      custom_domain_live: !!(primaryDomain || business.domain) && !!business.dns_configured && !!business.website_published,
      analytics_installed: !!sp.analytics_installed,
      tracking_on_existing_site: !!sp.tracking_installed,
    },
    crm_setup: {
      services: (serviceCount || 0) > 0,
      business_hours: !!business.business_hours,
      phone_email: !!(business.phone && business.email),
      branding: !!(business.logo_url || (business.primary_color && business.primary_color !== '#2563eb')),
    },
    billing: {
      rate_set: (business.monthly_rate || 0) > 0,
      setup_fee_paid: !!business.setup_fee_paid_at,
      payment_method: !!business.payment_method,
    },
    credentials: {
      gmail_password_changed: !!sp.gmail_password_changed,
      resend_password_changed: !!sp.resend_password_changed,
      telnyx_password_changed: !!sp.telnyx_password_changed,
      stripe_password_changed: !!sp.stripe_password_changed,
      all_credentials_documented: !!sp.all_credentials_documented,
    },
    testing: {
      test_booking: !!sp.test_booking_done,
      test_email_outbound: !!sp.test_email_received,
      test_email_inbound: !!sp.test_email_inbound,
      test_sms_outbound: !!sp.test_sms_received,
      test_sms_inbound: !!sp.test_sms_inbound,
      test_payment: !!sp.test_payment_done,
      test_portal: !!sp.test_portal_done,
      test_team_portal: !!sp.test_team_portal_done,
    },
    handoff: {
      credentials_doc: !!sp.credentials_shared,
      invite_sent: (invites?.length || 0) > 0,
      invite_accepted: invites?.some((i: { accepted: boolean }) => i.accepted) || false,
      owner_logged_in: !!business.last_active_at,
      walkthrough_done: !!sp.walkthrough_done,
    },
  }

  // Count all items for progress
  const allItems = [
    ...Object.values(checklist.accounts),
    ...Object.values(checklist.dns_hosting),
    ...Object.values(checklist.resend),
    ...Object.values(checklist.telnyx),
    ...Object.values(checklist.stripe),
    ...Object.values(checklist.google),
    ...Object.values(checklist.website),
    ...Object.values(checklist.crm_setup),
    ...Object.values(checklist.billing),
    ...Object.values(checklist.credentials),
    ...Object.values(checklist.testing),
    ...Object.values(checklist.handoff),
  ]
  const completedCount = allItems.filter(Boolean).length
  const totalCount = allItems.length

  // Redact only the response copy — `checklist` above already derived every
  // boolean it needs from the full `business` object, so this can't blank a
  // checklist item the way redacting `business` itself before that block would.
  const safeBusiness = {
    ...omit(business, [...NEVER_RETURNED_BUSINESS_FIELDS]),
    google_oauth_connected: !!business.google_tokens?.refresh_token,
  }

  return NextResponse.json({
    business: safeBusiness,
    members,
    invites,
    stats: {
      clients: clients || 0,
      bookings: bookings || 0,
      team_members: team_members || 0,
      services: serviceCount || 0,
      revenue,
    },
    checklist,
    progress: { completed: completedCount, total: totalCount },
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const allowed = [
    'status', 'plan', 'admin_notes', 'billing_status',
    'monthly_rate', 'setup_fee', 'setup_fee_paid_at', 'payment_method',
    'admin_seats', 'team_seats',
    'owner_name', 'owner_email', 'owner_phone',
    // Onboarding fields
    'gmail_account', 'domain', 'domain_name', 'dns_configured',
    'email_domain_verified', 'sms_number',
    'website_published', 'website_content',
    // NOT 'setup_progress' — merged via the atomic RPC below, never a direct
    // assignment, so a partial checklist patch can never blindly clobber a
    // concurrently-checked box (see the merge block near the main update).
    // Integration fields
    'resend_api_key', 'resend_domain', 'email_from',
    'telegram_bot_token', 'telegram_chat_id',
    'telnyx_api_key', 'telnyx_phone',
    'telnyx_voice_connection_id', 'telnyx_telephony_credential_id', 'telnyx_credential_connection_id',
    'voice_ring_list', 'voicemail_prompt', 'missed_call_sms',
    'stripe_account_id', 'stripe_api_key',
    'imap_host', 'imap_port', 'imap_user', 'imap_pass',
    'zelle_email',
    'anthropic_api_key', 'indexnow_key',
    'google_place_id',
    // Business info
    'phone', 'email', 'website_url', 'address', 'tagline',
    'business_hours', 'logo_url', 'primary_color', 'secondary_color',
    // Service-area geo spine (drives geo/job page generation)
    'service_radius_miles', 'service_area_lat', 'service_area_lng',
    // Agent identity — single source of truth for the AI's name across SMS
    // (Selena) and web/Telegram/admin/email (Yinez). Default 'Jefe'.
    'agent_name',
    // Selena persona (full config blob) — NOT included here when only a
    // partial patch (e.g. service_areas alone) is being merged in; see the
    // atomic RPC merge below. Only a caller sending the full blob directly
    // takes the direct-assignment path.
    'selena_config',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  // Normalize `domain` to the SAME host form the resolver's tenants.domain
  // fallback looks up at request time (getTenantByDomain in tenant-lookup.ts /
  // tenant.ts: lowercase, strip protocol/path/www) — mirrors the fix already
  // applied to tenant_domains inserts in /api/admin/websites and to `domain`
  // on tenant creation in /api/admin/businesses (POST). Without this, an
  // admin pasting "https://WWW.Acme.com/" into this onboarding field stores
  // that exact string; the resolver's `.eq('domain', cleanDomain)` fallback
  // query never finds it, so the domain silently never routes even though
  // setup_progress shows it as configured. `domain_name` is left raw — it's
  // the display/registrar-facing field, not what the resolver queries.
  if (updates.domain !== undefined) {
    const cleanDomain = String(updates.domain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '')
    updates.domain = cleanDomain || null
  }

  // For setup_progress, merge with existing instead of overwriting. A plain
  // read-merge-write here (read setup_progress, spread the patch over it in
  // JS, blind-write it back alongside the rest of `updates` below) races: two
  // admins checking off DIFFERENT onboarding steps in two tabs both read the
  // same stale blob, and whichever write lands second silently reverts the
  // first admin's checked box. Merge atomically in Postgres instead
  // (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql) — no read step, so
  // there's nothing to race. Applied as its own statement, not folded into
  // `updates`, so the later blind tenants UPDATE never touches this column.
  if (body.setup_progress && typeof body.setup_progress === 'object') {
    const { error: spErr } = await supabaseAdmin.rpc('merge_tenant_setup_progress', {
      p_tenant_id: id, p_patch: body.setup_progress,
    })
    if (spErr) return NextResponse.json({ error: spErr.message }, { status: 500 })
  }

  // service_areas lives inside selena_config. Merge it in rather than letting a
  // caller overwrite the whole blob (which would wipe persona/pricing/checklist).
  // Drives activation coverage + the template's geo/service/job page generation.
  // If the caller already sent the full blob (body.selena_config), merge areas
  // into THAT in JS — a full replace the caller opted into, no DB read, no
  // race. If only service_areas was sent, a fresh DB read would be needed to
  // merge against — the same lost-update shape as setup_progress above (a
  // service-area save racing a persona/pricing save on selena_config could
  // silently revert the other), so use the same atomic Postgres-side merge.
  // Also drives the cache-bust below for the RPC-merge branch, where
  // selena_config was changed on the row but never touches `updates`.
  let selenaConfigMergedViaRpc = false
  if (body.service_areas !== undefined) {
    const areas = Array.isArray(body.service_areas)
      ? body.service_areas.map((s: unknown) => String(s).trim()).filter(Boolean)
      : []
    if (updates.selena_config) {
      updates.selena_config = { ...(updates.selena_config as Record<string, unknown>), service_areas: areas }
    } else {
      const { error: scErr } = await supabaseAdmin.rpc('merge_tenant_selena_config', {
        p_tenant_id: id, p_patch: { service_areas: areas },
      })
      if (scErr) return NextResponse.json({ error: scErr.message }, { status: 500 })
      selenaConfigMergedViaRpc = true
    }
  }

  // Capture the RAW telegram bot token before encryption — needed to register
  // the webhook with Telegram so the new bot goes live on save.
  const rawTelegramToken =
    typeof body.telegram_bot_token === 'string' && body.telegram_bot_token.trim() && !isEncrypted(body.telegram_bot_token)
      ? body.telegram_bot_token.trim()
      : null

  // Encrypt vendor secrets at rest — skip if empty (treat as unchanged) or
  // already encrypted (idempotent on re-save).
  for (const field of ENCRYPTED_FIELDS) {
    const v = updates[field]
    if (typeof v === 'string' && v.length > 0 && !isEncrypted(v)) {
      updates[field] = encryptSecret(v)
    }
    if (v === '' || v === null) {
      delete updates[field]
    }
  }

  // Seats are authoritative for the monthly rate. If seat counts change,
  // merge them + recompute monthly_rate atomically in Postgres
  // (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql, merge_tenant_seats)
  // rather than reading current admin_seats/team_seats, merging in JS, and
  // writing all three back as part of the SAME blind `updates` UPDATE below —
  // one admin bumping admin_seats while another bumps team_seats in a
  // second tab would otherwise both read the same stale pair, and whichever
  // write lands second silently reverts the first admin's seat change (and
  // recomputes monthly_rate off the wrong pair). Deleted from `updates` so
  // the later blind UPDATE can never stomp what the RPC just set.
  let seatChange: { admins: number; teamMembers: number } | null = null
  if (updates.admin_seats !== undefined || updates.team_seats !== undefined) {
    const { data: merged, error: seatErr } = await supabaseAdmin.rpc('merge_tenant_seats', {
      p_tenant_id: id,
      p_admin_seats: updates.admin_seats !== undefined ? Number(updates.admin_seats) : null,
      p_team_seats: updates.team_seats !== undefined ? Number(updates.team_seats) : null,
      p_admin_monthly_cents: PRICING.adminMonthly,
      p_team_member_monthly_cents: PRICING.teamMemberMonthly,
    }).single() as { data: { admin_seats: number; team_seats: number; monthly_rate: number } | null; error: { message: string } | null }
    if (seatErr) return NextResponse.json({ error: seatErr.message }, { status: 500 })
    delete updates.admin_seats
    delete updates.team_seats
    delete updates.monthly_rate
    seatChange = { admins: merged!.admin_seats, teamMembers: merged!.team_seats }
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Push new seat counts to the live Stripe subscription (Stripe prorates). Safe
  // no-op when the tenant isn't billing yet; never block the save if Stripe errors.
  if (seatChange) {
    const { data: sub } = await supabaseAdmin
      .from('tenants')
      .select('stripe_subscription_id, billing_status')
      .eq('id', id)
      .single()
    if (sub?.stripe_subscription_id && sub.billing_status === 'active') {
      try {
        const { syncSubscriptionSeats } = await import('@/lib/platform-billing')
        await syncSubscriptionSeats(sub.stripe_subscription_id, seatChange.admins, seatChange.teamMembers)
      } catch (e) {
        console.error(`[billing] seat sync failed for tenant ${id}:`, e)
      }
    }
  }

  // Bust Selena config cache if selena_config was touched so persona
  // changes take effect immediately (default TTL is 5 min). Also true for the
  // RPC-merge branch above, which changes the row without ever touching
  // `updates.selena_config`.
  if (updates.selena_config !== undefined || selenaConfigMergedViaRpc) {
    const { clearSelenaConfigCache } = await import('@/lib/selena-legacy')
    clearSelenaConfigCache(id)
  }

  // Bust middleware's edge-cached slug/domain entries for this tenant when
  // status or domain changed — same class of gap as the selena_config bust
  // above, applied to tenant-lookup.ts's own 5-min-TTL cache. Without this, a
  // tenant just suspended/cancelled here keeps resolving through a warm edge
  // isolate's cached entry (tenantServesSite() evaluates the STALE status)
  // for up to the rest of the TTL after being cut off everywhere else that
  // enforces the same gate.
  if (updates.status !== undefined || updates.domain !== undefined) {
    const { invalidateTenantCache } = await import('@/lib/tenant-lookup')
    invalidateTenantCache(id)
  }

  // When a Telegram bot token is saved, auto-register its webhook so the bot
  // goes live without any manual step. URL is derived from the request origin.
  let telegramWebhook: { ok: boolean; status: number; body: string } | undefined
  if (rawTelegramToken) {
    const { data: t } = await supabaseAdmin.from('tenants').select('slug').eq('id', id).single()
    if (t?.slug) {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
      const origin = host ? `https://${host}` : new URL(request.url).origin
      const { registerTelegramWebhook } = await import('@/lib/telegram')
      telegramWebhook = await registerTelegramWebhook(rawTelegramToken, `${origin}/api/webhooks/telegram/${t.slug}`)
    }
  }

  // Log security events
  if (updates.status) {
    await logSecurityEvent({
      tenantId: id,
      type: 'status_change',
      description: `Account status changed to ${updates.status} by platform admin`,
    })
  }

  return NextResponse.json({ success: true, telegramWebhook })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  // Capture the domains BEFORE deleting so we can detach them from Vercel after.
  // Otherwise a deleted tenant leaves <slug>.fullloopcrm.com (and any custom
  // domain) attached to the project, serving the fallback marketing site.
  const { data: doomed } = await supabaseAdmin
    .from('tenants')
    .select('slug, domain, domain_name')
    .eq('id', id)
    .single()

  // tenant_domains rows (the P1 primary source — admin/websites' recommended
  // add-a-domain flow writes ONLY here, never tenants.domain/domain_name) are
  // ON DELETE CASCADE (migrations/043_tenant_domains.sql) — the DB rows
  // vanish the instant the tenants delete below runs. Read them out FIRST, or
  // any domain a tenant owns purely through tenant_domains (which per
  // admin/websites' own comments is now the common case, not the exception)
  // never makes it into the Vercel-detach list below and stays attached to
  // the project forever after the tenant is gone.
  const { data: ownedDomains } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain')
    .eq('tenant_id', id)

  // Hard delete. Every tenant-scoped table cascades from tenants.id EXCEPT two
  // cross-tenant FKs that are ON DELETE NO ACTION and would block the delete:
  // leads.converted_tenant_id and partner_requests.converted_tenant_id. These
  // are global lead records that merely *reference* the tenant they converted
  // into — not tenant-owned rows — so we detach them before deleting.
  await supabaseAdmin.from('leads').update({ converted_tenant_id: null }).eq('converted_tenant_id', id)
  await supabaseAdmin.from('partner_requests').update({ converted_tenant_id: null }).eq('converted_tenant_id', id)

  const { error } = await supabaseAdmin
    .from('tenants')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bust middleware's edge-cached slug/domain entries for this tenant — same
  // class of gap as the PUT handler above (invalidateTenantCache), but more
  // severe here: this is a full hard delete, not a status/domain edit, so a
  // warm edge isolate's cached entry keeps resolving (and tenantServesSite()
  // evaluating) the NOW-NONEXISTENT tenant's stale data for up to the rest of
  // the 5-min TTL — a deleted tenant's site keeps serving after it's gone.
  // invalidateSlugCache(doomed.slug) additionally closes the negative-cache
  // reuse window invalidateTenantCache can't reach (it only matches cached
  // entries by tenant id, which a negative "no tenant" entry doesn't have):
  // without it, a NEW tenant re-claiming this exact slug within the TTL (e.g.
  // re-signup under the same business name right after a delete) would
  // inherit whatever this slug's cache is left in.
  const { invalidateTenantCache, invalidateSlugCache } = await import('@/lib/tenant-lookup')
  invalidateTenantCache(id)
  if (doomed?.slug) invalidateSlugCache(doomed.slug)

  // Detach Vercel domains — best-effort, never blocks the delete result.
  if (doomed?.slug) {
    const domains = [`${doomed.slug}.fullloopcrm.com`]
    const custom = (doomed.domain as string | null) || (doomed.domain_name as string | null)
    if (custom && custom.trim()) {
      const apex = custom.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
      domains.push(apex, `www.${apex}`)
    }
    for (const row of ownedDomains ?? []) {
      const apex = String(row.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
      if (apex) domains.push(apex, `www.${apex}`)
    }
    const uniqueDomains = [...new Set(domains)]
    await Promise.all(uniqueDomains.map((d) => removeDomain(d)))
  }

  return NextResponse.json({ success: true })
}
