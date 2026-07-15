import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { validateUsPhone, phoneReasonText } from '@/lib/nycmaid/phone-validator'
import { safeEqual, signWithSecret } from '@/lib/secret-compare'

// Token format: <team_member_id>.<expiry_ms>.<sig> signed with ADMIN_PASSWORD.
// Matches the signing side in cron/phone-fixup/route.ts.

function sign(payload: string): string {
  return signWithSecret(payload, process.env.ADMIN_PASSWORD)
}

interface ParsedToken {
  valid: boolean
  teamMemberId?: string
  reason?: 'malformed' | 'bad_signature' | 'expired'
}

function parseToken(token: string): ParsedToken {
  if (!token) return { valid: false, reason: 'malformed' }
  const parts = token.split('.')
  if (parts.length !== 3) return { valid: false, reason: 'malformed' }
  const [teamMemberId, expiry, sig] = parts
  if (!teamMemberId || !expiry || !sig) return { valid: false, reason: 'malformed' }
  // sign() throws if ADMIN_PASSWORD is unset — fail closed (bad_signature)
  // rather than signing with a publicly-computable '' key.
  let expected: string
  try {
    expected = sign(`${teamMemberId}.${expiry}`)
  } catch {
    return { valid: false, reason: 'bad_signature' }
  }
  if (!safeEqual(expected, sig)) return { valid: false, reason: 'bad_signature' }
  const expiryMs = Number(expiry)
  if (!Number.isFinite(expiryMs) || Date.now() > expiryMs) return { valid: false, reason: 'expired' }
  return { valid: true, teamMemberId }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''
  const parsed = parseToken(token)
  if (!parsed.valid) return NextResponse.json({ error: parsed.reason || 'invalid' }, { status: 400 })

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id, name, email, phone')
    .eq('id', parsed.teamMemberId!)
    .single()

  if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ id: member.id, name: member.name, current_phone: member.phone })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { token?: string; phone?: string }
  const parsed = parseToken(body.token || '')
  if (!parsed.valid) return NextResponse.json({ error: parsed.reason || 'invalid' }, { status: 400 })

  const phoneCheck = validateUsPhone(body.phone)
  if (!phoneCheck.valid) {
    return NextResponse.json({ error: phoneReasonText(phoneCheck.reason) }, { status: 400 })
  }

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id, email')
    .eq('id', parsed.teamMemberId!)
    .single()
  if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { error: cErr } = await supabaseAdmin
    .from('team_members')
    .update({ phone: phoneCheck.normalized })
    .eq('id', member.id)
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  if (member.email) {
    await supabaseAdmin
      .from('cleaner_applications')  // tenant-scope-ok: member-initiated phone sync across the same applicant's records by their verified email
      .update({ phone: phoneCheck.normalized })
      .eq('email', member.email)
  }

  return NextResponse.json({ ok: true, phone: phoneCheck.normalized })
}
