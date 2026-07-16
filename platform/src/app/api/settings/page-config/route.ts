import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_PAGES = [
  'activity',
  'ai',
  'analytics',
  'bookings',
  'calendar',
  'campaigns',
  'changelog',
  'clients',
  'connect',
  'docs',
  'feedback',
  'finance',
  'google',
  'leads',
  'map',
  'notifications',
  'overview',
  'referrals',
  'reviews',
  'sales',
  'schedules',
  'selena',
  'settings',
  'sms',
  'social',
  'team',
  'users',
  'websites',
]

function configKey(page: string) {
  return `__page_config_${page}`
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const page = request.nextUrl.searchParams.get('page')

    if (!page || !VALID_PAGES.includes(page)) {
      return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('setup_progress')
      .eq('id', tenantId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sp = (tenant?.setup_progress || {}) as Record<string, unknown>
    const config = (sp[configKey(page)] || {}) as Record<string, unknown>

    return NextResponse.json({ config })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()
    const { page, config } = body

    if (!page || !VALID_PAGES.includes(page)) {
      return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Config must be an object' }, { status: 400 })
    }

    // Merge this page's config key into setup_progress atomically in Postgres
    // (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql) instead of a JS
    // read-merge-write -- two different admin pages saving their page config
    // concurrently (or racing an onboarding-checklist toggle on the same
    // setup_progress column) would otherwise both read the same stale blob,
    // and whichever write landed second would silently drop the other page's
    // just-saved config key.
    const { error } = await supabaseAdmin.rpc('merge_tenant_setup_progress', {
      p_tenant_id: tenantId,
      p_patch: { [configKey(page)]: config },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
