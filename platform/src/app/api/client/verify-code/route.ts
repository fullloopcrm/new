import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createClientSession, clientSessionCookieOptions } from '@/lib/client-auth'
import { randomInt } from 'crypto'

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  try {
    const body = await request.json().catch(() => ({})) as { email?: string; code?: string; phone?: string }
    const { email, code, phone } = body
    if (!code || (!email && !phone)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const phoneDigits = phone ? phone.replace(/\D/g, '') : ''
    const lookupKeys: string[] = []
    if (email) lookupKeys.push(email.toLowerCase())
    if (phoneDigits) lookupKeys.push(`sms:${phoneDigits}`)

    // Throttle code verification so a 6-digit code can't be brute-forced.
    // Primary cap is per-identifier (email/phone): once wrong guesses land in
    // the window, further attempts against THAT identifier's code are blocked
    // regardless of source IP — rotating IPs can't bypass it. A looser per-IP
    // cap adds defense against one host spraying codes across many
    // identifiers. Mirrors portal/auth/route.ts and pin-reset/route.ts.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rlIp = await rateLimitDb(`client-verify-ip:${tenant.id}:${ip}`, 30, 10 * 60 * 1000, { failClosed: true })
    const rlIdentifiers = await Promise.all(
      lookupKeys.map((key) => rateLimitDb(`client-verify:${tenant.id}:${key}`, 5, 10 * 60 * 1000, { failClosed: true })),
    )
    if (!rlIp.allowed || rlIdentifiers.some((r) => !r.allowed)) {
      return NextResponse.json({ error: 'Too many attempts. Please wait 10 minutes.' }, { status: 429 })
    }

    let verification = null
    for (const key of lookupKeys) {
      const { data } = await tenantDb(tenant.id)
        .from('verification_codes')
        .select('*')
        .eq('identifier', key)
        .eq('code', code)
        .maybeSingle()
      if (data) { verification = data; break }
    }

    if (!verification) return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 401 })
    }

    // Burn the code — both email + sms keys if both were sent.
    for (const key of lookupKeys) {
      await tenantDb(tenant.id)
        .from('verification_codes')
        .delete()
        .eq('identifier', key)
    }

    // Find existing client (phone match first, email fallback).
    let client = null as null | Record<string, unknown> & { id: string; do_not_service?: boolean; email?: string | null }
    if (phoneDigits.length >= 10) {
      const { data: allClients } = await tenantDb(tenant.id)
        .from('clients')
        .select('*')
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
      const { data: emailMatches } = await tenantDb(tenant.id)
        .from('clients')
        .select('*')
        .ilike('email', email.trim())
        .order('created_at', { ascending: true })
        .limit(1)
      client = (emailMatches?.[0] as typeof client) || null
    }

    // Update email on match if missing/different.
    if (client && email && (!client.email || String(client.email).toLowerCase() !== email.toLowerCase())) {
      await tenantDb(tenant.id)
        .from('clients')
        .update({ email: email.toLowerCase() })
        .eq('id', client.id)
    }

    // Create new client if still none — email flow only.
    if (!client && email) {
      const { data: newClient, error: createError } = await tenantDb(tenant.id)
        .from('clients')
        .insert({
          email: email.toLowerCase(),
          name: email.split('@')[0],
          phone: phone || '',
          pin: String(100000 + randomInt(0, 900000)),
        })
        .select()
        .single()
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
