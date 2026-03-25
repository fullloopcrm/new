import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

const VALID_PAGES = [
  'bookings',
  'clients',
  'campaigns',
  'finance',
  'reviews',
  'referrals',
  'leads',
  'team',
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

    // Read current setup_progress, merge in page config
    const { data: current } = await supabaseAdmin
      .from('tenants')
      .select('setup_progress')
      .eq('id', tenantId)
      .single()

    const sp = (current?.setup_progress || {}) as Record<string, unknown>
    sp[configKey(page)] = config

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ setup_progress: sp })
      .eq('id', tenantId)

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
