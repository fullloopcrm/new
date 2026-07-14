import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'
import { removeDomain } from '@/lib/vercel-domains'
import { encryptSecret, isEncrypted, ENCRYPTED_TENANT_FIELDS } from '@/lib/secret-crypto'
import { computeMonthly } from '@/lib/billing-pricing'

// Vendor API-key fields that must be encrypted at rest — shared single source
// of truth so write paths can't drift (see secret-crypto.ts).
const ENCRYPTED_FIELDS = ENCRYPTED_TENANT_FIELDS

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const db = tenantDb(id)

  const [
    { data: business },
    { data: members },
    { data: invites },
    { count: clients },
    { count: bookings },
    { count: team_members },
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('*').eq('id', id).single(),
    db.from('tenant_members').select('*'),
    db.from('tenant_invites').select('*').order('created_at', { ascending: false }),
    db.from('clients').select('id', { count: 'exact', head: true }),
    db.from('bookings').select('id', { count: 'exact', head: true }),
    db.from('team_members').select('id', { count: 'exact', head: true }),
  ])

  if (!business) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Revenue
  const { data: revenueData } = await db
    .from('bookings')
    .select('final_price')
    .in('status', ['paid', 'completed'])

  const revenue = (revenueData || []).reduce((sum, b) => sum + (b.final_price || 0), 0)

  // Service types count
  const { count: serviceCount } = await db
    .from('service_types')
    .select('id', { count: 'exact', head: true })
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
      custom_domain_live: !!business.domain_name && !!business.dns_configured && !!business.website_published,
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

  return NextResponse.json({
    business,
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
    'website_published', 'website_content', 'setup_progress',
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
    // Selena persona (full config blob)
    'selena_config',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  // For setup_progress, merge with existing instead of overwriting
  if (body.setup_progress) {
    const { data: current } = await supabaseAdmin
      .from('tenants')
      .select('setup_progress')
      .eq('id', id)
      .single()
    updates.setup_progress = { ...(current?.setup_progress || {}), ...body.setup_progress }
  }

  // service_areas lives inside selena_config. Merge it in rather than letting a
  // caller overwrite the whole blob (which would wipe persona/pricing/checklist).
  // Drives activation coverage + the template's geo/service/job page generation.
  if (body.service_areas !== undefined) {
    let base = updates.selena_config as Record<string, unknown> | undefined
    if (!base) {
      const { data } = await supabaseAdmin.from('tenants').select('selena_config').eq('id', id).single()
      base = (data?.selena_config as Record<string, unknown>) || {}
    }
    updates.selena_config = {
      ...base,
      service_areas: Array.isArray(body.service_areas)
        ? body.service_areas.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
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

  // Seats are authoritative for the monthly rate. If seat counts change, recompute
  // monthly_rate server-side (never trust a client-sent rate) from the new seats
  // merged over the tenant's current values.
  let seatChange: { admins: number; teamMembers: number } | null = null
  if (updates.admin_seats !== undefined || updates.team_seats !== undefined) {
    const { data: cur } = await supabaseAdmin
      .from('tenants')
      .select('admin_seats, team_seats')
      .eq('id', id)
      .single()
    const admins = Math.max(1, Number(updates.admin_seats ?? cur?.admin_seats ?? 1))
    const teamMembers = Math.max(0, Number(updates.team_seats ?? cur?.team_seats ?? 0))
    updates.admin_seats = admins
    updates.team_seats = teamMembers
    updates.monthly_rate = computeMonthly(admins, teamMembers)
    seatChange = { admins, teamMembers }
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
  // changes take effect immediately (default TTL is 5 min).
  if (updates.selena_config !== undefined) {
    const { clearSelenaConfigCache } = await import('@/lib/selena-legacy')
    clearSelenaConfigCache(id)
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
      const { deriveTelegramSecret } = await import('@/lib/telegram-webhook-auth')
      // Scope the secret to this tenant's id so the webhook can fail-closed verify
      // authenticity. Null when TELEGRAM_WEBHOOK_SECRET is unset (registers without
      // a secret — the route then fails closed until the env is configured).
      const secretToken = deriveTelegramSecret(`tenant:${id}`) || undefined
      telegramWebhook = await registerTelegramWebhook(rawTelegramToken, `${origin}/api/webhooks/telegram/${t.slug}`, secretToken)
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

  // Detach Vercel domains — best-effort, never blocks the delete result.
  if (doomed?.slug) {
    const domains = [`${doomed.slug}.fullloopcrm.com`]
    const custom = (doomed.domain as string | null) || (doomed.domain_name as string | null)
    if (custom && custom.trim()) {
      const apex = custom.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
      domains.push(apex, `www.${apex}`)
    }
    await Promise.all(domains.map((d) => removeDomain(d)))
  }

  return NextResponse.json({ success: true })
}
