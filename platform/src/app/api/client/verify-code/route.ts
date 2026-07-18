import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createClientSession, clientSessionCookieOptions, randomClientPin, MAX_CLIENT_PIN_ATTEMPTS } from '@/lib/client-auth'
import { escapeLikeValue } from '@/lib/postgrest-safe'

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

    let verification = null
    for (const key of lookupKeys) {
      const { data } = await supabaseAdmin
        .from('verification_codes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('identifier', key)
        .eq('code', code)
        .maybeSingle()
      if (data) { verification = data; break }
    }

    if (!verification) return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 401 })
    }

    // Burn the code atomically. verification_codes is UNIQUE(tenant_id,
    // identifier), so exactly one row exists per key — but this delete used
    // to be unconditional on `identifier` alone (not `code`) and its result
    // was never checked. Two concurrent verify-code calls for the same
    // still-valid code both passed the SELECT above before either DELETE
    // ran, and an unconditional delete "succeeds" (0 rows or 1, no error
    // either way) regardless of who got there first — both requests fell
    // through to mint a session from one single-use code, same TOCTOU class
    // already closed for portal_auth_codes and member_pin_reset_codes this
    // session. Scoping the delete by the exact matched identifier+code and
    // requiring a row back closes it here too; the loser gets a clean 401.
    const { data: burned } = await supabaseAdmin
      .from('verification_codes')
      .delete()
      .eq('tenant_id', tenant.id)
      .eq('identifier', verification.identifier)
      .eq('code', code)
      .select()
    if (!burned || burned.length === 0) {
      return NextResponse.json({ error: 'Code already used — request a new one' }, { status: 401 })
    }
    // Best-effort cleanup of the OTHER lookup key's code (both email + sms
    // keys can be seeded when both were sent) — not the consumed code
    // itself, so no CAS needed here.
    for (const key of lookupKeys) {
      if (key === verification.identifier) continue
      await supabaseAdmin.from('verification_codes').delete().eq('tenant_id', tenant.id).eq('identifier', key)
    }

    // Find existing client (phone match first, email fallback).
    let client = null as null | Record<string, unknown> & { id: string; do_not_service?: boolean; email?: string | null }
    if (phoneDigits.length >= 10) {
      const { data: allClients } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('tenant_id', tenant.id)
      if (allClients) {
        // Exact match only. The old `endsWith` matching let a code verified for
        // one phone resolve a DIFFERENT client whose number was a suffix (or
        // superset) of it — e.g. "5551234" matching "+1 (800) 555-1234". Compare
        // the full national number (last 10 digits, dropping a leading US "1")
        // so 10- vs 11-digit stored formats still match, but partials never do.
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
        .ilike('email', escapeLikeValue(email.trim()))
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
      // idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql)
      // uniquely constrains (tenant_id, pin) with no application-layer check
      // before this insert. This runs mid-login, after the caller already
      // proved ownership of the email by supplying the code just sent to it --
      // a collision here shouldn't fail their login outright when a fresh PIN
      // is trivially safe to regenerate and retry, same pattern POST
      // /api/invoices uses for invoice_number/public_token collisions.
      let newClient, createError
      for (let attempt = 0; attempt < MAX_CLIENT_PIN_ATTEMPTS; attempt++) {
        ;({ data: newClient, error: createError } = await supabaseAdmin
          .from('clients')
          .insert({
            tenant_id: tenant.id,
            email: email.toLowerCase(),
            name: email.split('@')[0],
            phone: phone || '',
            pin: randomClientPin(),
          })
          .select()
          .single())
        if (!createError || createError.code !== '23505') break
      }
      if (createError || !newClient) {
        console.error('Create client error:', createError)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      }
      client = newClient as typeof client
      await notify({
        tenantId: tenant.id,
        type: 'new_client',
        title: 'New Client (via Login)',
        message: `${email} • first-time login, auto-created`,
      })
    }

    if (!client) return NextResponse.json({ error: 'Could not resolve account' }, { status: 500 })
    if (client.do_not_service) return NextResponse.json({ error: 'Invalid code' }, { status: 401 })

    // Only the fields the client-side UI needs -- never the raw row. `clients`
    // carries secrets (pin, the standalone client-portal login credential) and
    // internal fields (selena_memory_summary, apology_credit_*, etc.) that
    // must not cross the wire in a JSON response.
    const safeClient = {
      id: client.id,
      name: client.name as string | undefined,
      email: client.email,
      phone: client.phone as string | undefined,
    }

    const response = NextResponse.json({ client: safeClient, do_not_service: false })
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
