import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'
import { clearSettingsCache } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { encryptTenantSecrets } from '@/lib/secret-crypto'
import { autoVerifyIntegrations } from '@/lib/integration-auto-verify'

export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()
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

    // selena_config is jsonb shared by many independent settings panels, each
    // holding its own possibly-stale client snapshot. Merge the incoming
    // patch onto the row's CURRENT selena_config (read right before write)
    // instead of trusting the client's copy — otherwise a stale tab's save
    // silently overwrites fields another panel/tab changed in the meantime.
    // (Root cause of the 2026-08-20 nycmaid manual_away flip: a stale-tab
    // save reset it to a snapshot from days earlier.)
    if (body.selena_config !== undefined && body.selena_config !== null) {
      const { data: currentRow } = await supabaseAdmin
        .from('tenants')
        .select('selena_config')
        .eq('id', tenantId)
        .single()
      body.selena_config = { ...(currentRow?.selena_config || {}), ...body.selena_config }
    }

    // Track sensitive field changes for security audit log
    const sensitiveFields = ['resend_api_key', 'telnyx_api_key', 'telnyx_phone', 'stripe_api_key', 'stripe_account_id', 'imap_pass', 'anthropic_api_key', 'deepgram_api_key', 'indexnow_key']
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

    // Live-verify any vendor key that changed this save instead of leaving
    // "is this actually working" as a separate manual Activate step. Runs
    // after the save succeeds — a verification failure never blocks the
    // save itself, it only shows up as a warning and leaves the onboarding
    // task un-completed until a working key is saved.
    let integrationWarnings: string[] = []
    if (body.stripe_api_key !== undefined || body.telnyx_api_key !== undefined || body.telnyx_phone !== undefined) {
      const result = await autoVerifyIntegrations(
        tenantId,
        { stripe_api_key: body.stripe_api_key, telnyx_api_key: body.telnyx_api_key, telnyx_phone: body.telnyx_phone },
        { telnyx_api_key: data.telnyx_api_key, telnyx_phone: data.telnyx_phone },
      ).catch((err) => {
        console.error('[settings PUT] autoVerifyIntegrations failed:', err)
        return { warnings: [] }
      })
      integrationWarnings = result.warnings
    }

    return NextResponse.json({ tenant: data, integrationWarnings })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
