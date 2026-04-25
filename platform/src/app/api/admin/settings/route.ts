import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { clearSettingsCache } from '@/lib/settings'

// Columns a super-admin may write to via this route. Excludes: id, slug,
// created_at, system-managed (google_tokens, google_business, stripe_account_id),
// and any column not user-tunable. Update this list when adding new tenant
// settings.
const EDITABLE_TENANT_COLUMNS = new Set<string>([
  'name', 'phone', 'email', 'address', 'zip_code', 'team_size', 'timezone',
  'industry', 'plan', 'status', 'admin_notes', 'monthly_rate', 'setup_fee',
  'owner_email', 'owner_phone', 'owner_name',
  'business_hours', 'business_hours_start', 'business_hours_end',
  'primary_color', 'secondary_color', 'logo_url', 'tagline', 'website_url',
  'resend_api_key', 'resend_domain', 'email_from',
  'telnyx_api_key', 'telnyx_phone',
  'stripe_api_key', 'google_place_id',
  'imap_host', 'imap_port', 'imap_user', 'imap_pass', 'email_monitor_enabled',
  'anthropic_api_key', 'indexnow_key',
  'booking_buffer_minutes', 'default_duration_hours', 'min_days_ahead',
  'allow_same_day',
  'commission_rate', 'active_client_threshold_days', 'at_risk_threshold_days',
  'reschedule_notice_days',
  'guidelines_en', 'guidelines_es',
  'payment_methods', 'zelle_email', 'apple_cash_phone',
  'selena_config', 'website_content', 'setup_progress', 'setup_dismissed',
  'domain_name', 'sms_number', 'website_published',
  'enable_legacy_seo_pages', 'expense_categories', 'onboarding_checklist',
  'hq_latitude', 'hq_longitude',
])

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  if (tenantId) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ tenant })
  }

  const { count: tenantCount } = await supabaseAdmin
    .from('tenants')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    tenantCount: tenantCount || 0,
  })
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const { tenant_id, key, value } = body

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
  }

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 })
  }

  if (!EDITABLE_TENANT_COLUMNS.has(key)) {
    return NextResponse.json({ error: `Column '${key}' is not editable via this route` }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ [key]: value, updated_at: new Date().toISOString() })
    .eq('id', tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  clearSettingsCache(tenant_id)

  return NextResponse.json({ success: true })
}
