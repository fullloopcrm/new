import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

// Per-user, per-page preferences. Distinct from tenant-wide settings.
// View defaults, page size, default filters live here. Tenant config
// (booking buffer, payment methods) does not.

const VALID_PAGES = new Set([
  'activity', 'ai', 'analytics', 'bookings', 'calendar', 'campaigns',
  'changelog', 'clients', 'connect', 'docs', 'feedback', 'finance',
  'google', 'leads', 'map', 'notifications', 'overview', 'referrals',
  'reviews', 'sales', 'schedules', 'selena', 'settings', 'sms',
  'social', 'team', 'users', 'websites',
])

async function getMemberId(): Promise<{ memberId: string; tenantId: string } | null> {
  const { userId } = await auth()
  if (!userId) return null

  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch {
    return null
  }

  const { data } = await supabaseAdmin
    .from('tenant_members')
    .select('id')
    .eq('clerk_user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return null
  return { memberId: data.id as string, tenantId }
}

export async function GET(request: NextRequest) {
  try {
    const page = request.nextUrl.searchParams.get('page')
    if (!page || !VALID_PAGES.has(page)) {
      return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
    }

    const ctx = await getMemberId()
    if (!ctx) {
      // No real membership (e.g. super-admin impersonating). Return empty
      // prefs so the UI uses its hardcoded defaults.
      return NextResponse.json({ prefs: {} })
    }

    const { data } = await supabaseAdmin
      .from('user_preferences')
      .select('prefs')
      .eq('tenant_member_id', ctx.memberId)
      .eq('page', page)
      .maybeSingle()

    return NextResponse.json({ prefs: (data?.prefs || {}) as Record<string, unknown> })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { page, prefs } = body
    if (!page || !VALID_PAGES.has(page)) {
      return NextResponse.json({ error: 'Invalid page' }, { status: 400 })
    }
    if (!prefs || typeof prefs !== 'object') {
      return NextResponse.json({ error: 'prefs must be an object' }, { status: 400 })
    }

    const ctx = await getMemberId()
    if (!ctx) {
      // No persistence for impersonation; behave as a no-op so the UI
      // doesn't show errors.
      return NextResponse.json({ prefs })
    }

    const { error } = await supabaseAdmin
      .from('user_preferences')
      .upsert(
        {
          tenant_member_id: ctx.memberId,
          page,
          prefs,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_member_id,page' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prefs })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
