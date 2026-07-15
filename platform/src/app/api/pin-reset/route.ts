import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { hashAdminPin, isValidAdminPin } from '@/lib/admin-pin'
import { safeEqual } from '@/lib/secret-compare'

/**
 * Self-service tenant-member PIN reset. Runs on a tenant's own domain: the
 * middleware injects a signed x-tenant-id, so the whole flow is scoped to THAT
 * tenant. A member proves control of their on-file phone/email (code delivered
 * via the tenant's own SMS/email), then sets a new PIN. Full Loop platform never
 * issues or sees the PIN.
 */

const CODE_TTL_MS = 10 * 60 * 1000

function generateCode(): string {
  return String(100000 + crypto.randomInt(0, 900000))
}

/** Missing-table (pre-migration) → a clean 503 instead of a 500. */
function isUndefinedTable(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42P01'
}

async function resolveTenantId(): Promise<string | null> {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const sig = h.get('x-tenant-sig')
  if (tenantId && verifyTenantHeaderSig(tenantId, sig)) return tenantId
  return null
}

type Member = { id: string; name: string | null; phone: string | null; email: string | null }

// Escape LIKE/ILIKE wildcards so the lookup only ever matches the literal
// address (Postgres default LIKE escape char is backslash). This route is
// reachable pre-auth on a tenant's own login page — an unescaped '%'/'_' in
// `contact` let a caller with no prior knowledge of any specific member's
// email turn a single-address lookup into a broad pattern match, using the
// send_code 'sent'/'No operator found' response as an existence oracle for
// which member-email patterns exist on the tenant. Same pattern already
// fixed on /api/referrers (601a7904) and /api/client/check.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

async function findMember(tenantId: string, contact: string): Promise<Member | null> {
  const value = contact.trim()
  if (!value) return null
  // Phone match first, then email (case-insensitive).
  const byPhone = await supabaseAdmin
    .from('tenant_members')
    .select('id, name, phone, email')
    .eq('tenant_id', tenantId)
    .eq('phone', value)
    .maybeSingle()
  if (byPhone.data) return byPhone.data as Member

  const byEmail = await supabaseAdmin
    .from('tenant_members')
    .select('id, name, phone, email')
    .eq('tenant_id', tenantId)
    .ilike('email', escapeLike(value))
    .maybeSingle()
  return (byEmail.data as Member) || null
}

export async function POST(request: Request) {
  const tenantId = await resolveTenantId()
  if (!tenantId) {
    return NextResponse.json(
      { error: 'PIN reset must be used on your business login page.' },
      { status: 400 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const action = body?.action

  // ---- Step 1: send a reset code to the member's on-file phone/email ----
  if (action === 'send_code') {
    const contact = String(body?.contact || '')
    if (!contact.trim()) {
      return NextResponse.json({ error: 'Enter your phone or email.' }, { status: 400 })
    }

    const rl = await rateLimitDb(`pin_reset:${tenantId}:${contact}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone, resend_api_key')
      .eq('id', tenantId)
      .single()
    if (!tenant) {
      return NextResponse.json({ error: 'Business not found.' }, { status: 404 })
    }

    const member = await findMember(tenantId, contact)
    if (!member) {
      return NextResponse.json(
        { error: 'No operator found with that phone or email. Contact your admin.' },
        { status: 404 },
      )
    }

    const code = generateCode()

    const del = await supabaseAdmin
      .from('member_pin_reset_codes')
      .delete()
      .eq('member_id', member.id)
      .eq('used', false)
    if (isUndefinedTable(del.error)) {
      return NextResponse.json(
        { error: 'PIN reset is not available yet. Contact your admin.' },
        { status: 503 },
      )
    }

    const ins = await supabaseAdmin.from('member_pin_reset_codes').insert({
      tenant_id: tenantId,
      member_id: member.id,
      phone: contact.trim(),
      code,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    if (isUndefinedTable(ins.error)) {
      return NextResponse.json(
        { error: 'PIN reset is not available yet. Contact your admin.' },
        { status: 503 },
      )
    }
    if (ins.error) {
      return NextResponse.json({ error: 'Could not start reset. Try again.' }, { status: 500 })
    }

    // Deliver via the tenant's own SMS (preferred) or email (fallback).
    let delivered = false
    if (member.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
      try {
        const { sendSMS } = await import('@/lib/sms')
        await sendSMS({
          to: member.phone,
          body: `Your ${tenant.name} PIN reset code is: ${code}`,
          telnyxApiKey: tenant.telnyx_api_key,
          telnyxPhone: tenant.telnyx_phone,
        })
        delivered = true
      } catch (e) {
        console.error('[pin-reset] SMS send failed:', e)
      }
    }
    if (!delivered && member.email) {
      try {
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: member.email,
          subject: `Your ${tenant.name} PIN reset code`,
          html: `<p>Your PIN reset code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
          resendApiKey: tenant.resend_api_key,
        })
        delivered = true
      } catch (e) {
        console.error('[pin-reset] Email send failed:', e)
      }
    }

    if (!delivered) {
      return NextResponse.json(
        { error: 'No phone/email on file to send a code. Contact your admin.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ sent: true, via: member.phone && tenant.telnyx_api_key ? 'sms' : 'email' })
  }

  // ---- Step 2: verify the code and set the new PIN ----
  if (action === 'verify_and_set') {
    const contact = String(body?.contact || '')
    const code = String(body?.code || '')
    const newPin = String(body?.new_pin || '')
    if (!contact.trim() || !code || !newPin) {
      return NextResponse.json({ error: 'Missing information.' }, { status: 400 })
    }
    if (!isValidAdminPin(newPin)) {
      return NextResponse.json({ error: 'PIN must be 4–8 digits.' }, { status: 400 })
    }

    // Throttle code verification so a 6-digit code can't be brute-forced.
    // Primary cap is per-contact: once attempts land in the window, further
    // guesses against THAT contact's code are blocked regardless of source
    // IP. A looser per-IP cap adds defense against one host spraying codes
    // across many contacts. Mirrors the same throttle in portal/auth/route.ts.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rlContact = await rateLimitDb(`pin_reset_verify:${tenantId}:${contact}`, 5, 15 * 60 * 1000, {
      failClosed: true,
    })
    const rlIp = await rateLimitDb(`pin_reset_verify_ip:${ip}`, 30, 15 * 60 * 1000, { failClosed: true })
    if (!rlContact.allowed || !rlIp.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const member = await findMember(tenantId, contact)
    if (!member) {
      return NextResponse.json({ error: 'Code expired or not found.' }, { status: 400 })
    }

    const { data: stored, error: selErr } = await supabaseAdmin
      .from('member_pin_reset_codes')
      .select('id, code, expires_at')
      .eq('member_id', member.id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (isUndefinedTable(selErr)) {
      return NextResponse.json(
        { error: 'PIN reset is not available yet. Contact your admin.' },
        { status: 503 },
      )
    }
    if (!stored || !safeEqual(stored.code, code)) {
      return NextResponse.json({ error: 'Code expired or incorrect.' }, { status: 400 })
    }

    // Enforce per-tenant PIN uniqueness (a DB index also enforces it).
    const pinHash = hashAdminPin(newPin)
    const { data: clash } = await supabaseAdmin
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('pin_hash', pinHash)
      .neq('id', member.id)
      .maybeSingle()
    if (clash) {
      return NextResponse.json({ error: 'That PIN is already in use — pick another.' }, { status: 409 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('tenant_members')
      .update({ pin_hash: pinHash, pin_set_at: new Date().toISOString() })
      .eq('id', member.id)
      .eq('tenant_id', tenantId)
    if (updErr) {
      return NextResponse.json({ error: 'Could not set PIN. Try again.' }, { status: 500 })
    }

    await supabaseAdmin.from('member_pin_reset_codes').update({ used: true }).eq('id', stored.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
