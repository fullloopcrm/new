import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { sendSMS } from '@/lib/sms'
import { TEST_MODE, TEST_APPLICANT_NAME_SUBSTRING, BROADCAST_CAP } from '../constants'
import { resolveTenantSmsCredentials } from '@/lib/sms-credentials'

// Broadcast a one-off SMS to new/un-hired applicants. Ported from nycmaid,
// tenant-scoped for FullLoop (cleaner_applications + per-tenant Telnyx creds).
// Safety gates: TEST_MODE (only the test applicant), BROADCAST_CAP, phone dedup.
// Every guard is re-applied server-side — never trust the client's id list.
export const maxDuration = 60

const EXCLUDED_STATUSES = ['accepted', 'rejected']
const MESSAGE_MAX_LENGTH = 1600

type ApplicantRow = {
  id: string
  name: string | null
  phone: string | null
  status: string | null
}

export async function POST(request: Request) {
  // Mass-SMS broadcast to applicants — same blast-radius/cost/brand-risk
  // class as the sibling send-apology-batch route, which is gated on
  // campaigns.send. This route previously only checked for a valid tenant
  // session via getTenantForRequest(), so any authenticated role (incl.
  // 'staff', which has no campaigns.send per rbac.ts) could broadcast SMS
  // to every new applicant.
  const { tenant: ctx, error: authError } = await requirePermission('campaigns.send')
  if (authError) return authError
  const tenantId = ctx.tenantId
  const tenant = ctx.tenant

  const body = await request.json().catch(() => ({}))
  const { applicant_ids, message, confirmed } = body as {
    applicant_ids?: string[]
    message?: string
    confirmed?: boolean
  }

  const text = (message || '').trim()
  if (!text) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  if (text.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json({ error: `Message is too long (max ${MESSAGE_MAX_LENGTH} characters)` }, { status: 400 })
  }
  if (!applicant_ids || applicant_ids.length === 0) {
    return NextResponse.json({ error: 'No recipients selected' }, { status: 400 })
  }
  if (!confirmed) {
    return NextResponse.json({ error: 'Must confirm before sending' }, { status: 400 })
  }
  if (applicant_ids.length > BROADCAST_CAP) {
    return NextResponse.json({ error: `Cap is ${BROADCAST_CAP} recipients per send` }, { status: 400 })
  }
  const smsCreds = resolveTenantSmsCredentials(tenant)
  if (!smsCreds.apiKey || !smsCreds.phone) {
    return NextResponse.json({ error: 'SMS not configured for this tenant' }, { status: 400 })
  }

  const { data: rows, error } = await supabaseAdmin
    .from('cleaner_applications')
    .select('id, name, phone, status')
    .eq('tenant_id', tenantId)
    .in('id', applicant_ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const seenPhones = new Set<string>()

  // Re-apply every guard server-side — never trust the client's id list blindly.
  const recipients = (rows as ApplicantRow[] || []).filter((a) => {
    if (!a.phone) return false
    if (a.status && EXCLUDED_STATUSES.includes(a.status)) return false
    if (TEST_MODE && !(a.name || '').toLowerCase().includes(TEST_APPLICANT_NAME_SUBSTRING)) return false
    const last10 = a.phone.replace(/\D/g, '').slice(-10)
    if (!last10 || seenPhones.has(last10)) return false
    seenPhones.add(last10)
    return true
  })

  if (recipients.length === 0) {
    return NextResponse.json({
      error: TEST_MODE
        ? `TEST MODE — no eligible applicant named "${TEST_APPLICANT_NAME_SUBSTRING}" with a phone on file`
        : 'No eligible recipients (already hired/rejected, or no phone)',
    }, { status: 400 })
  }

  const apiKey = smsCreds.apiKey
  const phone = smsCreds.phone
  const results = await Promise.all(
    recipients.map(async (a) => {
      try {
        await sendSMS({ to: a.phone!, body: text, telnyxApiKey: apiKey, telnyxPhone: phone })
        return { id: a.id, name: a.name, sent: true as const }
      } catch (e) {
        return { id: a.id, name: a.name, sent: false as const, error: e instanceof Error ? e.message : 'send failed' }
      }
    })
  )

  const sent = results.filter((r) => r.sent).length
  const failed = results.filter((r) => !r.sent).length

  await supabaseAdmin.from('notifications').insert({
    tenant_id: tenantId,
    type: 'applicant_broadcast',
    title: 'Applicant broadcast sent',
    message: `Texted ${sent} new applicant${sent === 1 ? '' : 's'}${failed ? `, ${failed} failed` : ''}${TEST_MODE ? ' [TEST MODE]' : ''}.`,
  })

  return NextResponse.json({ test_mode: TEST_MODE, sent, failed, results })
}
