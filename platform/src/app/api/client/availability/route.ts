import { NextResponse } from 'next/server'
import { checkAvailability } from '@/lib/availability'
import { getTenantFromHeaders } from '@/lib/tenant-site'

export async function GET(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const duration = Math.min(Math.max(parseInt(searchParams.get('duration') || '2') || 2, 1), 8)

  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const result = await checkAvailability(tenant.id, date, duration)
  return NextResponse.json(result)
}
