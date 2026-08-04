import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

// Keys must match the `section` prop passed to <SectionVisibility> in
// src/app/dashboard/page.tsx. Persisted per-tenant in tenants.setup_progress
// (same jsonb column + read-merge-write pattern as /api/settings/page-config),
// so every viewer of this tenant's Loop dashboard sees the same on/off state —
// this is UI config, not a per-tenant operator dashboard fork (see platform CLAUDE.md).
export const VALID_SECTIONS = ['revenue', 'sales', 'jobs', 'jobs_by_month', 'kpis', 'today_tomorrow']

const STORE_KEY = 'dashboard_hidden_sections'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('setup_progress')
      .eq('id', tenantId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sp = (tenant?.setup_progress || {}) as Record<string, unknown>
    const hidden = Array.isArray(sp[STORE_KEY]) ? (sp[STORE_KEY] as string[]) : []

    return NextResponse.json({ hidden })
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
    const { section, hidden } = body as { section?: string; hidden?: boolean }

    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }
    if (typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'hidden must be a boolean' }, { status: 400 })
    }

    // Read-merge-write: setup_progress carries other unrelated keys (onboarding
    // progress, per-page config), so this only ever touches its own array.
    const { data: current } = await supabaseAdmin
      .from('tenants')
      .select('setup_progress')
      .eq('id', tenantId)
      .single()

    const sp = (current?.setup_progress || {}) as Record<string, unknown>
    const existing = Array.isArray(sp[STORE_KEY]) ? (sp[STORE_KEY] as string[]) : []
    const next = hidden
      ? Array.from(new Set([...existing, section]))
      : existing.filter((s) => s !== section)
    sp[STORE_KEY] = next

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ setup_progress: sp })
      .eq('id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ hidden: next })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
