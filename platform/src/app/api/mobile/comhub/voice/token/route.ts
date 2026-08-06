import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { resolveTenantVoiceConfig } from '@/lib/comhub-voice-config'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

// Mobile-scoped equivalent of /api/admin/comhub/voice/token. That route gates
// on requireAdmin() (platform SUPER-ADMIN only — verifyAdminToken, never a
// tenant_admin token), so it isn't reachable with the tenant owner/admin
// bearer token minted by /api/mobile/auth/login. This route uses
// getTenantForRequest() instead (cookie OR bearer, tenant-scoped), which is
// the correct gate for a tenant's own app — role is already owner/admin-only
// because /api/mobile/auth/login rejected anything else at login time.
//
// Same Telnyx credential-mint flow as the web softphone: per-session
// telephony credential (or the tenant's shared one), then a short-lived
// login token for that credential.
export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(req: NextRequest) {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

  const cfg = await resolveTenantVoiceConfig(tenantId)
  if (!cfg.apiKey) {
    return NextResponse.json(
      { error: 'voice not configured', detail: 'Telnyx API key required (tenant or platform).' },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { session_id?: string } | null
  const sessionId = body?.session_id || ''
  const tag = sessionId ? `full-loop-mobile-session:${sessionId}` : 'full-loop-mobile-session:unknown'
  const credentialName = `Full Loop Mobile Session ${sessionId.slice(0, 8) || 'shared'}`

  let credentialId = ''
  let sipUsername = ''
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
          data?: { id?: string; sip_username?: string }
        }
        credentialId = data.data?.id || ''
        sipUsername = data.data?.sip_username || ''
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
        detail: 'No Telnyx telephony credential available for this tenant.',
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
    session_id: sessionId,
    expires_in_seconds: 60 * 60,
  })
})

// DELETE /api/mobile/comhub/voice/token { credential_id }
export const DELETE = withMobileCors(async function DELETE(req: NextRequest) {
  let tenantId: string
  try {
    const ctx = await getTenantForRequest()
    tenantId = ctx.tenantId
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status })
  }

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
})
