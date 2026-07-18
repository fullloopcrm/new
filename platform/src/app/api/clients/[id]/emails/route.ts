import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { sendEmail, tenantSender } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { isCommEnabled } from '@/lib/comms-prefs'

const SUBJECT_MAX_LENGTH = 200
const BODY_MAX_LENGTH = 20000

// GET — email transcript for this client (client_emails, tenant + client scoped).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data: emails, error } = await supabaseAdmin
      .from('client_emails')
      .select('id, direction, subject, body, created_at')
      .eq('client_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(emails ?? [])
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: (e as any).status ?? 401 })
    }
    throw e
  }
}

// POST — admin/staff sends a manual outbound email to this client. Sends via
// the same tenant-branded sendEmail() platform-fallback pattern used for
// team-invite/notify sends and logs the sent message into client_emails so it
// appears in the transcript immediately.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('clients.edit')
  if (authError) return authError

  try {
    const { tenantId, tenant: tenantRow, userId } = tenant
    const { id } = await params
    const { subject, body } = await request.json()

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 })
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 })
    }
    if (subject.length > SUBJECT_MAX_LENGTH) {
      return NextResponse.json({ error: `subject is too long (max ${SUBJECT_MAX_LENGTH} characters)` }, { status: 400 })
    }
    if (body.length > BODY_MAX_LENGTH) {
      return NextResponse.json({ error: `body is too long (max ${BODY_MAX_LENGTH} characters)` }, { status: 400 })
    }

    const enabled = await isCommEnabled(tenantId, 'manual_message', 'email')
    if (!enabled) {
      return NextResponse.json(
        { error: 'Email is turned off for this tenant in Communications settings' },
        { status: 403 },
      )
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, email')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (clientError) {
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    if (!client.email) {
      return NextResponse.json({ error: 'Client has no email address on file' }, { status: 400 })
    }

    try {
      await sendEmail({
        to: client.email,
        subject,
        html: `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`,
        from: tenantSender(tenantRow),
        resendApiKey: tenantRow.resend_api_key,
      })
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const { data: saved, error: insertError } = await supabaseAdmin
      .from('client_emails')
      .insert({
        tenant_id: tenantId,
        client_id: id,
        direction: 'outbound',
        subject,
        body,
        sent_by: userId,
      })
      .select('id, direction, subject, body, created_at')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ email: saved }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: (e as any).status ?? 401 })
    }
    throw e
  }
}
