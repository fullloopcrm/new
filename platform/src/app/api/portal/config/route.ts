import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPortalToken } from '../auth/route'
import { getSettings } from '@/lib/settings'

// Tells the client portal which funnel this tenant runs so the booking UI can
// adapt: 'booking' = self-serve hourly/flat scheduling (cleanings, appointments);
// 'pipeline'/'lead_only' = request a quote/appointment that drops into the sales
// pipeline instead of self-booking a time. Same funnel_mode the core sale
// process and Selena already key off of.
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const settings = await getSettings(auth.tid)
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, phone')
    .eq('id', auth.tid)
    .single()

  const activeServices = (settings.service_types || []).filter((s) => s.active)
  // Self-serve hourly is only real when the tenant runs the booking funnel AND
  // has an hourly rate configured; otherwise prices are flat/per-unit/quote.
  const hasHourly = settings.funnel_mode === 'booking' && activeServices.length > 0 && settings.standard_rate > 0
  const bookingMode =
    settings.funnel_mode === 'lead_only' ? 'lead_only'
    : settings.funnel_mode === 'pipeline' ? 'quote_first'
    : hasHourly ? 'hourly' : 'appointment'

  return NextResponse.json({
    funnel_mode: settings.funnel_mode,
    booking_mode: bookingMode,
    has_hourly: hasHourly,
    currency_symbol: settings.currency_symbol || '$',
    tenant_name: tenant?.name || '',
    tenant_phone: tenant?.phone || '',
  })
}
