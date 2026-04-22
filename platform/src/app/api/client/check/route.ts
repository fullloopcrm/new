import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'

async function findClient(tenantId: string, input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null

  const { data: byEmail } = await supabaseAdmin
    .from('clients')
    .select('id, phone, email, name')
    .eq('tenant_id', tenantId)
    .ilike('email', trimmed)
    .maybeSingle()
  if (byEmail) return byEmail

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 7) {
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('id, phone, email, name')
      .eq('tenant_id', tenantId)
    if (clients) {
      const match = clients.find(c => {
        const cDigits = (c.phone || '').replace(/\D/g, '')
        if (!cDigits || cDigits.length < 7) return false
        return cDigits === digits || cDigits.endsWith(digits) || digits.endsWith(cDigits)
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
