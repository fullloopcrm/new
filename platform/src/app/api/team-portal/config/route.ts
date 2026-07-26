import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../auth/token'
import { getSettings } from '@/lib/settings'

// Config the team portal needs to render trade-agnostically: whether this tenant
// pays hourly (so the rate card shows "$X/hr" vs a per-job model), and the
// configured payout rails (instead of a hardcoded "Zelle / Apple Pay").
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const settings = await getSettings(auth.tid)
  const activeServices = (settings.service_types || []).filter((s) => s.active)
  const hasHourly = settings.funnel_mode === 'booking' && activeServices.length > 0 && settings.standard_rate > 0

  const methods = [
    settings.zelle_email ? 'Zelle' : null,
    settings.apple_cash_phone ? 'Apple Pay' : null,
  ].filter(Boolean) as string[]

  return NextResponse.json({
    funnel_mode: settings.funnel_mode,
    has_hourly: hasHourly,
    currency_symbol: settings.currency_symbol || '$',
    payment_label: methods.length ? methods.join(' / ') : 'Ask office',
  })
}
