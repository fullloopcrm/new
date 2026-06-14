import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { getActiveAdminMemberId } from '@/lib/admin-member'
import { resolveTenantVoiceConfig } from '@/lib/comhub-voice-config'

// POST /api/admin/comhub/voice/token { session_id? }
// Per-session Telnyx telephony credential + short-lived JWT for the browser
// softphone WebRTC SDK. Voice config is resolved per-tenant (own Telnyx account
// when configured, else platform env fallback).
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()
  const adminId = await getActiveAdminMemberId(tenantId)

  const cfg = await resolveTenantVoiceConfig(tenantId)

  if (!cfg.apiKey) {
    return NextResponse.json(
      { error: 'voice not configured', detail: 'Telnyx API key required (tenant or platform).' },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { session_id?: string } | null
  const sessionId = body?.session_id || ''

  const tag = sessionId ? `comhub-session:${sessionId}` : 'comhub-session:unknown'
  const credentialName = `Comhub Softphone Session ${sessionId.slice(0, 8) || 'shared'}`

  let credentialId = ''
  let sipUsername = ''
  let sipPassword = ''
  if (cfg.credentialConnectionId) {
    try {
      const createRes = await fetch('https://api.telnyx.com/v2/telephony_credentials', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: credentialName,
          tag,
          connection_id: cfg.credentialConnectionId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      })
      if (createRes.ok) {
        const data = (await createRes.json()) as {
          data?: { id?: string; sip_username?: string; sip_password?: string }
        }
        credentialId = data.data?.id || ''
        sipUsername = data.data?.sip_username || ''
        sipPassword = data.data?.sip_password || ''
      }
    } catch {
      // fall through to shared credential
    }
  }

  if (!credentialId && cfg.telephonyCredentialId) {
    credentialId = cfg.telephonyCredentialId
    const credRes = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${credentialId}`,
      { headers: { Authorization: `Bearer ${cfg.apiKey}` } },
    )
    if (credRes.ok) {
      const credData = (await credRes.json()) as { data?: { sip_username?: string } }
      sipUsername = credData?.data?.sip_username || ''
    }
  }

  if (!credentialId) {
    return NextResponse.json(
      {
        error: 'voice not configured',
        detail: 'No Telnyx telephony credential available. Set the tenant voice fields or platform TELNYX_TELEPHONY_CREDENTIAL_ID / TELNYX_CREDENTIAL_CONNECTION_ID.',
      },
      { status: 503 },
    )
  }

  const tokenRes = await fetch(
    `https://api.telnyx.com/v2/telephony_credentials/${credentialId}/token`,
    { method: 'POST', headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' } },
  )
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => '')
    return NextResponse.json({ error: 'token mint failed', detail: detail.slice(0, 500) }, { status: 502 })
  }
  const loginToken = (await tokenRes.text()).trim()

  return NextResponse.json({
    login_token: loginToken,
    credential_id: credentialId,
    sip_username: sipUsername,
    sip_password: sipPassword || undefined,
    sip_address: sipUsername ? `sip:${sipUsername}@sip.telnyx.com` : null,
    session_id: sessionId,
    expires_in_seconds: 60 * 60,
    admin_id: adminId,
    used_voice_connection_id: cfg.voiceConnectionId || null,
  })
}

// DELETE /api/admin/comhub/voice/token { credential_id }
export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = await getCurrentTenantId()
  const cfg = await resolveTenantVoiceConfig(tenantId)

  const body = (await req.json().catch(() => ({}))) as { credential_id?: string } | null
  const credentialId = body?.credential_id || ''
  if (!credentialId || credentialId === cfg.telephonyCredentialId) {
    return NextResponse.json({ ok: true, note: 'shared credential, not deleted' })
  }
  if (!cfg.apiKey) return NextResponse.json({ ok: true })
  try {
    await fetch(`https://api.telnyx.com/v2/telephony_credentials/${credentialId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    })
  } catch {
    // best-effort
  }
  return NextResponse.json({ ok: true, deleted: credentialId })
}
