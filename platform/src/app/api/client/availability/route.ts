import { NextResponse } from 'next/server'
import { checkAvailability } from '@/lib/availability'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`client-availability:${ip}`, 30, 5 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const duration = Math.min(Math.max(parseInt(searchParams.get('duration') || '2') || 2, 1), 8)

  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const result = await checkAvailability(tenant.id, date, duration)
  return NextResponse.json(result)
}
