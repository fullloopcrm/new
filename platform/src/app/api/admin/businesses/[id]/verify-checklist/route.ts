/**
 * POST /api/admin/businesses/:id/verify-checklist
 *
 * Runs live verification of onboarding checklist items (DNS, SSL, Resend
 * domain, Telnyx number, Stripe account + webhook) and persists results
 * into tenants.setup_progress so the existing checklist UI auto-ticks.
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { runAllChecks } from '@/lib/onboarding-verify'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, domain, resend_api_key, resend_domain, telnyx_api_key, telnyx_phone, stripe_api_key, stripe_account_id, setup_progress')
    .eq('id', id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homeservicesbusinesscrm.com'
  const checks = await runAllChecks(tenant, appUrl)

  // Persist auto-verified flags into setup_progress so the /admin/businesses/[id]
  // checklist UI reflects live state without manual toggles.
  const current = (tenant.setup_progress || {}) as Record<string, boolean>
  const updated = {
    ...current,
    dns_a_record: checks.dns_a.ok,
    dns_cname_www: checks.dns_cname_www.ok,
    mx_records: checks.mx_records.ok,
    ssl_active: checks.ssl_active.ok,
    resend_domain_verified: checks.resend_domain_verified.ok,
    telnyx_messaging_profile: checks.telnyx_number_active.ok,
    stripe_webhook_configured: checks.stripe_webhook_configured.ok,
    stripe_business_verified: checks.stripe_account.ok,
    auto_verified_at: new Date().toISOString() as unknown as boolean,
  }

  await supabaseAdmin
    .from('tenants')
    .update({ setup_progress: updated, dns_configured: checks.dns_a.ok && checks.dns_cname_www.ok })
    .eq('id', id)

  return NextResponse.json({
    success: true,
    checks,
    summary: {
      passed: Object.values(checks).filter(c => c.ok).length,
      failed: Object.values(checks).filter(c => !c.ok).length,
      total: Object.keys(checks).length,
    },
  })
}
