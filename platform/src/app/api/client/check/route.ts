import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Escape LIKE/ILIKE wildcards so an input is matched literally (Postgres
// default LIKE escape char is backslash) -- this endpoint is unauthenticated,
// so an unescaped '%'/'_' let a caller with no prior knowledge of any client
// turn a single-address lookup into a broad enumeration of the tenant's
// client emails. Same pattern as lib/inbound-email-tenant.ts.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

async function findClient(tenantId: string, input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null

  const { data: byEmail } = await supabaseAdmin
    .from('clients')
    .select('id, phone, email, name')
    .eq('tenant_id', tenantId)
    .ilike('email', escapeLike(trimmed))
    .maybeSingle()
  if (byEmail) return byEmail

  // Phone must match in FULL (not a 7+ digit prefix/suffix substring) -- the
  // prior fuzzy match let a caller who only knew a partial number (e.g. an
  // area code + a few guessed digits) confirm a real client and pull back
  // their full name/phone/email with zero authentication.
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 10) {
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, phone, email, name')
      .eq('tenant_id', tenantId)
    if (clients) {
      const match = clients.find(c => {
        const cDigits = (c.phone || '').replace(/\D/g, '')
        if (!cDigits) return false
        return cDigits === digits
      })
      if (match) return match
    }
  }

  return null
}

export async function GET(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`client-check:${tenant.id}:${ip}`, 10, 10 * 60 * 1000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })

  const { searchParams } = new URL(request.url)
  const input = searchParams.get('email') || searchParams.get('input') || ''
  const client = await findClient(tenant.id, input)
  return NextResponse.json({
    exists: !!client,
    phone: client?.phone || null,
    email: client?.email || null,
    name: client?.name || null,
  })
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`client-check:${tenant.id}:${ip}`, 10, 10 * 60 * 1000)
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const input = (body.email || body.input || '') as string
  const client = await findClient(tenant.id, input)
  return NextResponse.json({
    exists: !!client,
    phone: client?.phone || null,
    email: client?.email || null,
    name: client?.name || null,
  })
}
