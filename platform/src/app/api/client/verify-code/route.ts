import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createClientSession, clientSessionCookieOptions } from '@/lib/client-auth'
import { randomInt } from 'crypto'

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`client-verify:${tenant.id}:${ip}`, 5, 10 * 60 * 1000)
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

    // Burn the code — both email + sms keys if both were sent.
    for (const key of lookupKeys) {
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
        client = allClients.find(c => {
          const cDigits = ((c as { phone?: string }).phone || '').replace(/\D/g, '')
          return cDigits && (cDigits === phoneDigits || cDigits.endsWith(phoneDigits) || phoneDigits.endsWith(cDigits))
        }) as typeof client || null
      }
    }

    if (!client && email) {
      const { data: emailMatches } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('tenant_id', tenant.id)
        .ilike('email', email.trim())
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
