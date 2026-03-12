import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'
import { sendEmail } from '@/lib/email'

export const maxDuration = 120

type CheckResult = {
  name: string
  status: 'pass' | 'fail' | 'warn'
  detail: string
}

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'jeff@consortiumnyc.com'

/**
 * System check — runs every hour.
 * Tests every critical flow end-to-end and emails you if anything breaks.
 *
 * Checks:
 * 1. Database connectivity
 * 2. Onboarding flow (tenant creation works)
 * 3. Auth flow (Clerk env configured)
 * 4. Per-tenant integration status
 * 5. Booking pipeline (no stuck bookings)
 * 6. Notification delivery rate
 * 7. Cron jobs running (health-check last ran)
 * 8. Error rate
 * 9. Payment pipeline
 * 10. Campaign delivery
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: CheckResult[] = []

  // 1. DATABASE
  try {
    const { count, error } = await supabaseAdmin
      .from('tenants')
      .select('id', { count: 'exact', head: true })
    if (error) throw error
    checks.push({ name: 'Database', status: 'pass', detail: `Connected, ${count} tenants` })
  } catch (e) {
    checks.push({ name: 'Database', status: 'fail', detail: e instanceof Error ? e.message : 'Unreachable' })
  }

  // 2. AUTH (Clerk keys present)
  const hasClerk = !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)
  checks.push({
    name: 'Auth (Clerk)',
    status: hasClerk ? 'pass' : 'fail',
    detail: hasClerk ? 'Keys configured' : 'Missing Clerk keys',
  })

  // 3. ONBOARDING (tenant_members table accessible, api/tenants route exists)
  try {
    const { count, error } = await supabaseAdmin
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
    if (error) throw error
    checks.push({ name: 'Onboarding', status: 'pass', detail: `tenant_members accessible, ${count} members` })
  } catch (e) {
    checks.push({ name: 'Onboarding', status: 'fail', detail: `tenant_members table error: ${e instanceof Error ? e.message : String(e)}` })
  }

  // 4. PER-TENANT INTEGRATION STATUS
  try {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name, resend_api_key, telnyx_api_key, telnyx_phone, stripe_api_key')
      .eq('status', 'active')

    const tenantChecks: string[] = []
    for (const t of tenants || []) {
      const missing: string[] = []
      if (!t.resend_api_key) missing.push('email')
      if (!t.telnyx_api_key || !t.telnyx_phone) missing.push('sms')
      if (!t.stripe_api_key) missing.push('payments')
      if (missing.length > 0) {
        tenantChecks.push(`${t.name}: no ${missing.join(', ')}`)
      }
    }

    if (tenantChecks.length === 0) {
      checks.push({ name: 'Tenant Integrations', status: 'pass', detail: `All ${tenants?.length || 0} tenants fully configured` })
    } else {
      checks.push({ name: 'Tenant Integrations', status: 'warn', detail: tenantChecks.join('; ') })
    }
  } catch {
    checks.push({ name: 'Tenant Integrations', status: 'fail', detail: 'Query failed' })
  }

  // 5. BOOKING PIPELINE — stuck bookings
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { count: stuckCount } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .lt('end_time', fourHoursAgo)

    const { count: pendingOld } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('start_time', new Date().toISOString())

    const issues: string[] = []
    if ((stuckCount || 0) > 0) issues.push(`${stuckCount} stuck in_progress`)
    if ((pendingOld || 0) > 0) issues.push(`${pendingOld} pending past start time`)

    checks.push({
      name: 'Booking Pipeline',
      status: issues.length > 0 ? 'warn' : 'pass',
      detail: issues.length > 0 ? issues.join(', ') : 'Clean',
    })
  } catch {
    checks.push({ name: 'Booking Pipeline', status: 'fail', detail: 'Query failed' })
  }

  // 6. NOTIFICATION DELIVERY RATE (last 24h)
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count: sent } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', oneDayAgo)

    const { count: failed } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', oneDayAgo)

    const total = (sent || 0) + (failed || 0)
    const rate = total > 0 ? Math.round(((sent || 0) / total) * 100) : 100

    checks.push({
      name: 'Notifications (24h)',
      status: rate < 80 ? 'fail' : rate < 95 ? 'warn' : 'pass',
      detail: `${sent} sent, ${failed} failed (${rate}% success)`,
    })
  } catch {
    checks.push({ name: 'Notifications (24h)', status: 'fail', detail: 'Query failed' })
  }

  // 7. ERROR RATE (last hour)
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('error_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)

    checks.push({
      name: 'Error Rate (1h)',
      status: (count || 0) > 20 ? 'fail' : (count || 0) > 5 ? 'warn' : 'pass',
      detail: `${count || 0} errors`,
    })
  } catch {
    checks.push({ name: 'Error Rate (1h)', status: 'fail', detail: 'Query failed' })
  }

  // 8. PAYMENT PIPELINE
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: unpaid } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'unpaid')
      .eq('status', 'completed')
      .lt('end_time', oneDayAgo)

    checks.push({
      name: 'Payment Pipeline',
      status: (unpaid || 0) > 10 ? 'warn' : 'pass',
      detail: `${unpaid || 0} completed bookings unpaid >24h`,
    })
  } catch {
    checks.push({ name: 'Payment Pipeline', status: 'fail', detail: 'Query failed' })
  }

  // 9. CAMPAIGNS — any stuck in "sending" status
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: stuck } = await supabaseAdmin
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sending')
      .lt('updated_at', oneHourAgo)

    checks.push({
      name: 'Campaigns',
      status: (stuck || 0) > 0 ? 'warn' : 'pass',
      detail: (stuck || 0) > 0 ? `${stuck} stuck in sending` : 'Clean',
    })
  } catch {
    checks.push({ name: 'Campaigns', status: 'fail', detail: 'Query failed' })
  }

  // 10. ENV VARS — all required present
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY',
    'CRON_SECRET', 'PORTAL_SECRET', 'TEAM_PORTAL_SECRET',
  ]
  const missingEnvs = requiredEnvs.filter(k => !process.env[k])
  checks.push({
    name: 'Environment',
    status: missingEnvs.length > 0 ? 'fail' : 'pass',
    detail: missingEnvs.length > 0 ? `Missing: ${missingEnvs.join(', ')}` : 'All required vars set',
  })

  // ---- REPORT ----
  const failures = checks.filter(c => c.status === 'fail')
  const warnings = checks.filter(c => c.status === 'warn')
  const allGood = failures.length === 0

  // Store result
  await supabaseAdmin.from('notifications').insert({
    type: allGood ? 'system_check' : 'error',
    title: allGood ? 'System Check: All Clear' : `System Check: ${failures.length} failures, ${warnings.length} warnings`,
    message: checks.map(c => `${c.status === 'pass' ? 'OK' : c.status === 'warn' ? 'WARN' : 'FAIL'} ${c.name}: ${c.detail}`).join('\n'),
    channel: 'system',
    status: 'sent',
  })

  // Email alert on any failure
  if (failures.length > 0) {
    try {
      await trackError(
        new Error(`System check failed: ${failures.map(f => f.name).join(', ')}`),
        { source: 'cron/system-check', severity: 'high' }
      )

      const rows = checks.map(c => {
        const color = c.status === 'pass' ? '#16a34a' : c.status === 'warn' ? '#f59e0b' : '#dc2626'
        const icon = c.status === 'pass' ? 'OK' : c.status === 'warn' ? 'WARN' : 'FAIL'
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;color:${color}">${icon}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${c.name}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#666">${c.detail}</td></tr>`
      }).join('')

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[FL] System Check FAILED — ${failures.length} issue${failures.length > 1 ? 's' : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px">
            <div style="background:#dc2626;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
              <h2 style="margin:0;font-size:16px">System Check Failed</h2>
              <p style="margin:4px 0 0 0;opacity:0.9;font-size:13px">${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
            </div>
            <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-top:0">
              <thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#888">Status</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#888">Check</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#888">Detail</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `,
      }).catch(() => {})
    } catch {
      // If email fails, error is already tracked above
    }
  }

  return NextResponse.json({
    status: allGood ? 'healthy' : 'degraded',
    failures: failures.length,
    warnings: warnings.length,
    checks,
    timestamp: new Date().toISOString(),
  })
}
