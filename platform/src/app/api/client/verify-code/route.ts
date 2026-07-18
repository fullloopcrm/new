import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createClientSession, clientSessionCookieOptions } from '@/lib/client-auth'
import { isUniqueViolation } from '@/lib/ledger'
import { randomInt } from 'crypto'

// Escape LIKE/ILIKE wildcards so `email` is matched literally (Postgres default
// LIKE escape char is backslash). Without this, an OTP-verified caller who owns
// any real inbox containing '%'/'_' (both legal RFC 5322 local-part chars) can
// submit that address as `email`, receive their own valid code, then have this
// route's client lookup below wildcard-match a DIFFERENT existing client and
// hand back THAT client's session -- full account takeover with no knowledge of
// the victim's real email. Same pattern as client/check/route.ts's escapeLike.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`client-verify:${tenant.id}:${ip}`, 5, 10 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please wait 10 minutes.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({})) as { email?: string; code?: string; phone?: string }
    const { email, code, phone } = body
    if (!code || (!email && !phone)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const phoneDigits = phone ? phone.replace(/\D/g, '') : ''
    const lookupKeys: string[] = []
    if (email) lookupKeys.push(email.toLowerCase())
    if (phoneDigits) lookupKeys.push(`sms:${phoneDigits}`)

    // Atomic claim: check-and-burn in the same DELETE...RETURNING round trip
    // (scoped to non-expired rows via .gt('expires_at', ...)) so two
    // concurrent verifies racing the SAME code can no longer both pass --
    // whichever request's DELETE lands first removes the row and gets it
    // back; the loser's DELETE matches nothing and falls through to the
    // read-only lookup below. The prior SELECT-then-separate-DELETE shape
    // let both requests read the row before either burned it.
    let verification: { id: string; expires_at: string } | null = null
    let matchedKey: string | null = null
    for (const key of lookupKeys) {
      const { data } = await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('tenant_id', tenant.id)
        .eq('identifier', key)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .select()
      const rows = data as { id: string; expires_at: string }[] | null
      if (rows && rows.length > 0) {
        verification = rows[0]
        matchedKey = key
        break
      }
    }

    if (!verification) {
      // Nothing claimable: either the code never matched, or it matched but
      // is expired (the .gt() filter above deliberately left an expired row
      // undeleted). Read-only lookup, never mutates, just picks the message.
      let expiredMatch = false
      for (const key of lookupKeys) {
        const { data } = await supabaseAdmin
          .from('verification_codes')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('identifier', key)
          .eq('code', code)
          .maybeSingle()
        if (data) { expiredMatch = true; break }
      }
      return NextResponse.json(
        { error: expiredMatch ? 'Code expired' : 'Invalid code' },
        { status: 401 },
      )
    }

    // Burn any leftover code on the other channel too (unchanged cleanup —
    // e.g. both an email and an sms code were outstanding, only one matched).
    for (const key of lookupKeys) {
      if (key === matchedKey) continue
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('tenant_id', tenant.id)
        .eq('identifier', key)
    }

    // Find existing client (phone match first, email fallback).
    let client = null as null | Record<string, unknown> & { id: string; do_not_service?: boolean; email?: string | null }
    if (phoneDigits.length >= 10) {
      const { data: allClients } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('tenant_id', tenant.id)
      if (allClients) {
        // Exact match only. `endsWith` matching let a code verified for one
        // phone resolve a DIFFERENT client whose number was a suffix (or
        // superset) of it -- e.g. "5551234" matching "+1 (800) 555-1234",
        // handing the caller that other client's session. Compare the full
        // national number (last 10 digits, dropping a leading US "1") so
        // 10- vs 11-digit stored formats still match, but partials never do.
        const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
        const target = nat(phoneDigits)
        client = allClients.find(c => {
          const cDigits = nat(((c as { phone?: string }).phone || '').replace(/\D/g, ''))
          return cDigits.length >= 10 && cDigits === target
        }) as typeof client || null
      }
    }

    if (!client && email) {
      const { data: emailMatches } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('tenant_id', tenant.id)
        .ilike('email', escapeLike(email.trim()))
        .order('created_at', { ascending: true })
        .limit(1)
      client = (emailMatches?.[0] as typeof client) || null
    }

    // Update email on match if missing/different.
    if (client && email && (!client.email || String(client.email).toLowerCase() !== email.toLowerCase())) {
      await supabaseAdmin
        .from('clients')
        .update({ email: email.toLowerCase() })
        .eq('id', client.id)
        .eq('tenant_id', tenant.id)
    }

    // Create new client if still none — email flow only.
    if (!client && email) {
      const { data: newClient, error: createError } = await supabaseAdmin
        .from('clients')
        .insert({
          tenant_id: tenant.id,
          email: email.toLowerCase(),
          name: email.split('@')[0],
          phone: phone || '',
          pin: String(100000 + randomInt(0, 900000)),
        })
        .select()
        .single()

      if (createError && isUniqueViolation(createError)) {
        // Lost a create-race to a concurrent verify for the same
        // (tenant_id, email) — see idx_clients_tenant_email_unique
        // (2026_07_13_clients_tenant_email_unique.sql). Treat it as
        // success: fetch the row the winner just created instead of
        // surfacing a raw 500 to a client who is, from their perspective,
        // just logging in.
        const { data: winnerMatches } = await supabaseAdmin
          .from('clients')
          .select('*')
          .eq('tenant_id', tenant.id)
          .ilike('email', escapeLike(email.trim()))
          .order('created_at', { ascending: true })
          .limit(1)
        client = (winnerMatches?.[0] as typeof client) || null
        if (!client) {
          console.error('Create client race: 23505 but no existing row found', createError)
          return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
        }
      } else if (createError || !newClient) {
        console.error('Create client error:', createError)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      } else {
        client = newClient as typeof client
        await notify({
          tenantId: tenant.id,
          type: 'new_client',
          title: 'New Client (via Login)',
          message: `${email} • first-time login, auto-created`,
        })
      }
    }

    if (!client) return NextResponse.json({ error: 'Could not resolve account' }, { status: 500 })
    if (client.do_not_service) return NextResponse.json({ error: 'Invalid code' }, { status: 401 })

    const response = NextResponse.json({ client, do_not_service: false })
    const opts = clientSessionCookieOptions()
    response.cookies.set(opts.name, createClientSession(client.id, tenant.id), {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      maxAge: opts.maxAge,
      path: opts.path,
    })
    return response
  } catch (err) {
    console.error('Verify code error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
