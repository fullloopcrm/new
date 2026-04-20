import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import crypto from 'crypto'

const SECRET = process.env.TEAM_PORTAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!

function createToken(memberId: string, tenantId: string, payRate?: number | null): string {
  const payload = JSON.stringify({ id: memberId, tid: tenantId, pr: payRate || 0, exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

export function verifyToken(token: string): { id: string; tid: string } | null {
  try {
    const [payloadB64, sig] = token.split('.')
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig !== expected) return null
    const data = JSON.parse(payload)
    if (data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const { pin, tenant_slug } = await request.json()

  if (!pin || !tenant_slug) {
    return NextResponse.json({ error: 'PIN and tenant required' }, { status: 400 })
  }

  const rl = await rateLimitDb(`team_portal_auth:${tenant_slug}:${pin}`, 5, 15 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  // Look up tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, phone')
    .eq('slug', tenant_slug)
    .eq('status', 'active')
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Look up team member by PIN
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('id, name, preferred_language, pay_rate, avatar_url')
    .eq('tenant_id', tenant.id)
    .eq('pin', pin)
    .eq('status', 'active')
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = createToken(member.id, tenant.id, member.pay_rate)

  return NextResponse.json({
    token,
    member: {
      id: member.id,
      name: member.name,
      language: member.preferred_language,
      pay_rate: member.pay_rate,
      avatar_url: member.avatar_url,
    },
    tenant: { id: tenant.id, name: tenant.name, phone: tenant.phone },
  })
}
