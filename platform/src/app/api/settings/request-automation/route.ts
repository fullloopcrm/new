import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

/**
 * Tenants can't author net-new automated triggers themselves (a new trigger
 * needs code to fire its event). Instead they request one here; it files to the
 * platform team, who add it to the global registry (lib/comms-registry.ts).
 */
const PLATFORM_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'hi@fullloopcrm.com'

export async function POST(request: Request) {
  let tenant
  try {
    tenant = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const title = String(body?.title || '').trim().slice(0, 160)
  const description = String(body?.description || '').trim().slice(0, 2000)
  if (!title) return NextResponse.json({ error: 'A short title is required.' }, { status: 400 })

  const { data: t } = await supabaseAdmin
    .from('tenants')
    .select('name, owner_email')
    .eq('id', tenant.tenantId)
    .single()

  const tenantName = t?.name || tenant.tenantId

  try {
    await sendEmail({
      to: PLATFORM_EMAIL,
      subject: `[Automation request] ${tenantName}: ${title}`,
      html: `<h2>New automation request</h2>
        <p><strong>Tenant:</strong> ${tenantName} (${tenant.tenantId})</p>
        <p><strong>From:</strong> ${t?.owner_email || '—'}</p>
        <p><strong>Trigger:</strong> ${title}</p>
        ${description ? `<pre style="white-space:pre-wrap;font-family:inherit">${description}</pre>` : ''}`,
    })
  } catch (err) {
    console.error('[request-automation] email failed:', err)
    return NextResponse.json({ error: 'Could not send the request. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
