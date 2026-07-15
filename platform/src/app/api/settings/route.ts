import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission, overridesFor } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { clearSettingsCache } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { encryptTenantSecrets } from '@/lib/secret-crypto'
import { hasPermission } from '@/lib/rbac'

// Vendor secrets + internal/billing/PII columns. Only returned to callers
// with settings.view — every other role gets the rest of the row (business
// hours, selena_config, telnyx_phone, etc.) that non-settings dashboard
// panels (calendar, quotes, sms, websites, selena) rely on for prefill.
const SENSITIVE_TENANT_FIELDS = new Set([
  'resend_api_key', 'telnyx_api_key', 'stripe_api_key', 'imap_pass',
  'imap_host', 'imap_user', 'anthropic_api_key', 'indexnow_key',
  'admin_notes', 'monthly_rate', 'setup_fee',
  'owner_email', 'owner_phone', 'owner_name',
])

export async function GET() {
  try {
    const ctx = await getTenantForRequest()
    const canViewSettings = hasPermission(ctx.role, 'settings.view', overridesFor(ctx))
    const tenant = canViewSettings
      ? ctx.tenant
      : Object.fromEntries(
          Object.entries(ctx.tenant).filter(([key]) => !SENSITIVE_TENANT_FIELDS.has(key)),
        )
    return NextResponse.json({ tenant })
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

    // Don't allow updating id or status through settings
    delete body.id
    delete body.status

    // Block system-managed fields — only set via OAuth flows or internal processes
    const systemOnlyFields = ['google_tokens', 'google_business', 'stripe_account_id']
    for (const f of systemOnlyFields) {
      delete body[f]
    }

    // Track sensitive field changes for security audit log
    const sensitiveFields = ['resend_api_key', 'telnyx_api_key', 'telnyx_phone', 'stripe_api_key', 'stripe_account_id', 'imap_pass', 'anthropic_api_key', 'indexnow_key']
    const changedSensitive = sensitiveFields.filter((f) => body[f] !== undefined)

    // Encrypt vendor secrets at rest (anthropic/telnyx/resend/stripe/etc.).
    // Non-destructive: empty/null values pass through so a tenant can clear a
    // key (e.g. blank Anthropic key => fall back to the platform key).
    const updatePayload = encryptTenantSecrets(body)

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update(updatePayload)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Bust per-tenant settings cache so getSettings() reflects the change immediately.
    clearSettingsCache(tenantId)

    // Bust Selena config cache if selena_config was touched so persona/
    // config changes take effect immediately (default cache TTL is 5 min).
    if (body.selena_config !== undefined) {
      const { clearSelenaConfigCache } = await import('@/lib/selena-legacy')
      clearSelenaConfigCache(tenantId)
    }

    // Log security events for sensitive changes. Non-fatal — DB write already
    // succeeded, a missing Resend domain (dev env) shouldn't 500 the save.
    for (const field of changedSensitive) {
      try {
        await logSecurityEvent({
          tenantId,
          type: 'api_key_change',
          description: `Integration key updated: ${field.replace(/_/g, ' ')}`,
        })
      } catch (err) {
        console.error('[settings PUT] logSecurityEvent failed:', err)
      }
    }

    await audit({ tenantId, action: 'settings.updated', entityType: 'settings', entityId: tenantId, details: { fields: Object.keys(body), sensitiveChanged: changedSensitive } })

    return NextResponse.json({ tenant: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
