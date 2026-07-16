import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { clearSettingsCache } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { encryptTenantSecrets } from '@/lib/secret-crypto'

// Fields the settings UI has zero read-back consumers for (grepped
// dashboard/**, no component reads these) — stripped even for authorized
// viewers, same as GET /api/social/accounts stripping its access_token.
// Deliberately NOT included: stripe_api_key/resend_api_key/imap_pass/
// anthropic_api_key/indexnow_key — settings/page.tsx prefills these into
// editable inputs (form.X || '') so operators can see/update an existing
// key without retyping it; stripping them would blank the field on load
// and risk wiping the stored key on the next save.
const NEVER_RETURNED_FIELDS = ['google_tokens', 'telegram_bot_token', 'telegram_webhook_secret'] as const

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('settings.view')
    if (authError) return authError

    const safeTenant = { ...tenant.tenant }
    for (const field of NEVER_RETURNED_FIELDS) {
      delete (safeTenant as Record<string, unknown>)[field]
    }
    return NextResponse.json({ tenant: safeTenant })
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
