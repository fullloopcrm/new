import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { clearSettingsCache } from '@/lib/settings'
import {
  normalizePrefs,
  defaultCommPrefs,
  deriveCapabilities,
  type CommPreferences,
} from '@/lib/comms-prefs'

// GET communications preferences + capabilities for the tenant.
export async function GET() {
  let tenant
  try {
    tenant = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('notification_preferences, resend_api_key, telnyx_api_key, telnyx_phone')
    .eq('id', tenant.tenantId)
    .single()

  return NextResponse.json({
    preferences: normalizePrefs(data?.notification_preferences),
    capabilities: deriveCapabilities(data || {}),
  })
}

// PUT — persist the full { comms, timing } preferences object.
export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  // Normalize before storing so we only ever persist known keys in the canonical
  // shape (drops unknown keys, fills gaps from registry defaults).
  const preferences: CommPreferences = normalizePrefs(body?.preferences ?? defaultCommPrefs())

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ notification_preferences: preferences })
    .eq('id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  clearSettingsCache(tenant.tenantId)
  return NextResponse.json({ success: true, preferences })
}
