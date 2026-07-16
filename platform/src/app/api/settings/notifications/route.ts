import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
  const { tenant, error: authError } = await requirePermission('settings.view')
  if (authError) return authError

  // maybeSingle() (not single()), error checked explicitly — same masked-error
  // pattern already fixed in tenant.ts/tenant-query.ts. This route's `error` used
  // to be discarded entirely (only `data` was destructured), so a genuine DB
  // failure looked identical to "no preferences set yet" and silently returned
  // defaultCommPrefs()-shaped output with zero capabilities instead of a loud
  // 500 — an outage read as "this tenant just hasn't configured comms."
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('notification_preferences, resend_api_key, telnyx_api_key, telnyx_phone')
    .eq('id', tenant.tenantId)
    .maybeSingle()

  if (error) {
    console.error(`TENANT_NOTIFICATION_PREFS_LOOKUP_ERROR tenant_id=${tenant.tenantId} error=${error.message}`)
    throw new Error(`TENANT_NOTIFICATION_PREFS_LOOKUP_ERROR tenant_id=${tenant.tenantId} error=${error.message}`)
  }

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
