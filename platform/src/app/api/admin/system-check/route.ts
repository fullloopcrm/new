import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import { supabaseAdmin } from '@/lib/supabase'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  return token && verifyAdminToken(token)
}

// GET — fetch recent errors and check history
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: errors }, { data: checks }] = await Promise.all([
    supabaseAdmin
      .from('error_logs')
      .select('id, message, route, severity, created_at')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('notifications')
      .select('id, type, title, message, created_at')
      .in('type', ['system_check', 'error'])
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return NextResponse.json({
    errors: (errors || []).map(e => ({
      id: e.id,
      title: `[${e.severity}] ${e.route || 'unknown'}`,
      message: e.message,
      created_at: e.created_at,
    })),
    checks: checks || [],
  })
}

// POST — run system check now
export async function POST() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  type CheckResult = { name: string; status: 'pass' | 'fail' | 'warn'; detail: string }
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

  // 2. AUTH
  const hasClerk = !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY)
  checks.push({
    name: 'Auth (Clerk)',
    status: hasClerk ? 'pass' : 'fail',
    detail: hasClerk ? 'Keys configured' : 'Missing Clerk keys',
  })

  // 3. ONBOARDING
  try {
    const { count, error } = await supabaseAdmin
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
    if (error) throw error
    checks.push({ name: 'Onboarding', status: 'pass', detail: `${count} members registered` })
  } catch (e) {
    checks.push({ name: 'Onboarding', status: 'fail', detail: e instanceof Error ? e.message : 'Table error' })
  }

  // 4. PER-TENANT INTEGRATIONS
  try {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name, resend_api_key, telnyx_api_key, telnyx_phone, stripe_api_key')
      .eq('status', 'active')

    const issues: string[] = []
    for (const t of tenants || []) {
      const missing: string[] = []
      if (!t.resend_api_key) missing.push('email')
      if (!t.telnyx_api_key || !t.telnyx_phone) missing.push('sms')
      if (!t.stripe_api_key) missing.push('payments')
      if (missing.length > 0) issues.push(`${t.name}: no ${missing.join(', ')}`)
    }

    checks.push({
      name: 'Tenant Integrations',
      status: issues.length > 0 ? 'warn' : 'pass',
      detail: issues.length > 0 ? issues.join('; ') : `All ${tenants?.length || 0} tenants configured`,
    })
  } catch {
    checks.push({ name: 'Tenant Integrations', status: 'fail', detail: 'Query failed' })
  }

  // 5. BOOKING PIPELINE
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { count: stuck } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .lt('end_time', fourHoursAgo)

    const { count: pendingOld } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('start_time', new Date().toISOString())

    const msgs: string[] = []
    if ((stuck || 0) > 0) msgs.push(`${stuck} stuck in_progress`)
    if ((pendingOld || 0) > 0) msgs.push(`${pendingOld} pending past start`)

    checks.push({
      name: 'Booking Pipeline',
      status: msgs.length > 0 ? 'warn' : 'pass',
      detail: msgs.length > 0 ? msgs.join(', ') : 'Clean',
    })
  } catch {
    checks.push({ name: 'Booking Pipeline', status: 'fail', detail: 'Query failed' })
  }

  // 6. NOTIFICATIONS (24h)
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

  // 7. ERROR RATE
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

  // 8. PAYMENTS
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

  // 9. CAMPAIGNS
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

  // 10. ENV
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY',
    'CRON_SECRET', 'PORTAL_SECRET', 'TEAM_PORTAL_SECRET',
  ]
  const missing = required.filter(k => !process.env[k])
  checks.push({
    name: 'Environment',
    status: missing.length > 0 ? 'fail' : 'pass',
    detail: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All required vars set',
  })

  const failures = checks.filter(c => c.status === 'fail')
  const warnings = checks.filter(c => c.status === 'warn')

  return NextResponse.json({
    status: failures.length === 0 ? 'healthy' : 'degraded',
    failures: failures.length,
    warnings: warnings.length,
    checks,
    timestamp: new Date().toISOString(),
  })
}
