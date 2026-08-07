import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireComhubAccess } from '@/lib/comhub-access'
import { sendComhubMessage, type SendComhubMessageBody } from '@/lib/comhub-send'

// POST /api/admin/comhub/send
// Body: { thread_id?, contact_id?, phone?, email?, channel, body, subject?, author_id? }
// Send logic itself lives in lib/comhub-send.ts, shared with the
// mobile-scoped equivalent (/api/mobile/comhub/send) — same reasoning as
// comhub-threads.ts for the GET list route.
export async function POST(req: NextRequest) {
  const access = await requireComhubAccess()
  if (access instanceof NextResponse) return access
  const tenantId = access.tenantId

  // Comms go out on THIS tenant's own channels (profile creds), never a global.
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, phone, email, address, logo_url, primary_color, telnyx_api_key, telnyx_phone, resend_api_key, email_from')
    .eq('id', tenantId)
    .maybeSingle()

  const body = await req.json().catch(() => null) as SendComhubMessageBody | null
  if (!body) return NextResponse.json({ error: 'channel and body are required' }, { status: 400 })

  const result = await sendComhubMessage(tenantId, tenant, body, 'admin', body.author_id || null)
  return NextResponse.json(result.json, { status: result.status })
}
