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

    // Block tenant from editing admin-managed integration fields
    const adminOnlyFields = [
      'resend_api_key', 'resend_domain', 'email_from',
      'telnyx_api_key', 'telnyx_phone',
      'stripe_account_id',
      'google_place_id', 'google_tokens', 'google_business',
    ]
    for (const f of adminOnlyFields) {
      delete body[f]
    }

    // Track sensitive field changes (none should remain, but just in case)
    const sensitiveFields = ['resend_api_key', 'telnyx_api_key', 'telnyx_phone', 'stripe_account_id']
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

    // Log security events for sensitive changes
    for (const field of changedSensitive) {
      await logSecurityEvent({
        tenantId,
        type: 'api_key_change',
        description: `Integration key updated: ${field.replace(/_/g, ' ')}`,
      })
    }

    return NextResponse.json({ tenant: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
