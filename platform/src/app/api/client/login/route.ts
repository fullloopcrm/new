/**
 * Client PIN login. Called from the copied nycmaid /site/book/dashboard flow.
 * Tenant resolved from middleware-signed x-tenant-id so clients log in to the
 * business whose subdomain/domain they're visiting.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createClientSession, clientSessionCookieOptions } from '@/lib/client-auth'

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`client-login:${tenant.id}:${ip}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const { pin } = await request.json().catch(() => ({ pin: '' }))
  if (!pin || typeof pin !== 'string' || pin.length !== 6) {
    return NextResponse.json({ error: 'Enter your 6-digit PIN' }, { status: 400 })
  }

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, do_not_service')
    .eq('tenant_id', tenant.id)
    .eq('pin', pin)
    .maybeSingle()

  if (!client || client.do_not_service) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = createClientSession(client.id, tenant.id)
  const opts = clientSessionCookieOptions()
  const jar = await cookies()
  jar.set(opts.name, token, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  })

  return NextResponse.json({ client_id: client.id })
}
