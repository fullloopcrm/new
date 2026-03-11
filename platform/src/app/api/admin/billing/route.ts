import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 49,
  pro: 99,
  enterprise: 249,
}

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, plan, status, email, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const all = tenants || []
  const byPlan = { free: 0, starter: 0, pro: 0, enterprise: 0 }

  for (const t of all) {
    const plan = (t.plan || 'free') as keyof typeof byPlan
    if (plan in byPlan) byPlan[plan]++
    else byPlan.free++
  }

  const mrr =
    byPlan.free * PLAN_PRICES.free +
    byPlan.starter * PLAN_PRICES.starter +
    byPlan.pro * PLAN_PRICES.pro +
    byPlan.enterprise * PLAN_PRICES.enterprise

  // Recent plan changes — tenants updated in last 30 days where plan is not free
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const recentChanges = all
    .filter((t) => t.updated_at && t.updated_at >= thirtyDaysAgo && (t.plan || 'free') !== 'free')
    .slice(0, 10)
    .map((t) => ({
      tenantId: t.id,
      name: t.name,
      plan: t.plan || 'free',
      updatedAt: t.updated_at,
    }))

  return NextResponse.json({
    mrr,
    totalAccounts: all.length,
    byPlan,
    recentChanges,
    tenants: all.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan || 'free',
      status: t.status,
      email: t.email,
      mrr: PLAN_PRICES[t.plan || 'free'] || 0,
      created_at: t.created_at,
    })),
  })
}

export async function PUT(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await request.json()
  const { tenantId, plan, billingEmail, notes } = body

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  // Update plan on tenants table
  if (plan) {
    if (!Object.keys(PLAN_PRICES).includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Save billing notes / email to tenant_settings
  if (billingEmail || notes) {
    const settings: Record<string, string> = {}
    if (billingEmail) settings.billing_email = billingEmail
    if (notes) settings.billing_notes = notes

    const { error } = await supabaseAdmin
      .from('tenant_settings')
      .upsert(
        { tenant_id: tenantId, ...settings, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
