import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { logSecurityEvent } from '@/lib/security'

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

    // Track sensitive field changes for security audit log
    const sensitiveFields = ['resend_api_key', 'telnyx_api_key', 'telnyx_phone', 'stripe_api_key', 'stripe_account_id', 'imap_pass', 'anthropic_api_key', 'indexnow_key']
    const changedSensitive = sensitiveFields.filter((f) => body[f] !== undefined)

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update(body)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Bust Selena config cache if selena_config was touched so persona/
    // config changes take effect immediately (default cache TTL is 5 min).
    if (body.selena_config !== undefined) {
      const { clearSelenaConfigCache } = await import('@/lib/selena')
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

    return NextResponse.json({ tenant: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
