import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'

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
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('*').eq('id', id).single(),
    supabaseAdmin.from('tenant_members').select('*').eq('tenant_id', id),
    supabaseAdmin.from('tenant_invites').select('*').eq('tenant_id', id).order('created_at', { ascending: false }),
    supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
    supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
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
  const body = await request.json()

  const allowed = [
    'status', 'plan', 'admin_notes', 'billing_status',
    'monthly_rate', 'setup_fee', 'setup_fee_paid_at', 'payment_method',
    'owner_name', 'owner_email', 'owner_phone',
    // Onboarding fields
    'gmail_account', 'domain_name', 'dns_configured',
    'email_domain_verified', 'sms_number',
    'website_published', 'website_content', 'setup_progress',
    // Integration fields
    'resend_api_key', 'resend_domain', 'email_from',
    'telnyx_api_key', 'telnyx_phone',
    'stripe_account_id', 'stripe_api_key',
    'imap_host', 'imap_port', 'imap_user', 'imap_pass',
    'zelle_email',
    'anthropic_api_key', 'indexnow_key',
    'google_place_id',
    // Business info
    'phone', 'email', 'website_url', 'address', 'tagline',
    'business_hours', 'logo_url', 'primary_color', 'secondary_color',
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

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log security events
  if (updates.status) {
    await logSecurityEvent({
      tenantId: id,
      type: 'status_change',
      description: `Account status changed to ${updates.status} by platform admin`,
    })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ status: 'deleted' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
