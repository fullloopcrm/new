/**
 * Monthly equipment depreciation posting. Idempotent per (equipment, month) —
 * safe to run more than once a month, and safe to re-run for a backfilled
 * month via ?month=YYYY-MM. Schedule via vercel.json. CRON_SECRET Bearer auth.
 *
 * See src/lib/finance/post-depreciation.ts for why this exists: depreciation
 * was documented as posting "on its own schedule" in two places in the
 * codebase, but nothing ever actually posted it.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { postEquipmentDepreciationForTenant } from '@/lib/finance/post-depreciation'
import { backfillUnpostedEquipmentAcquisitions } from '@/lib/finance/post-equipment-acquisition'
import { safeEqual } from '@/lib/secret-compare'

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') || ''
  if (!process.env.CRON_SECRET || !safeEqual(auth, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const monthKey = url.searchParams.get('month') || undefined

  const { data: tenants } = await supabaseAdmin.from('tenants').select('id').eq('status', 'active')
  const totals = { tenants: 0, unitsPosted: 0, unitsSkipped: 0, amountCents: 0, acquisitionsPosted: 0 }

  for (const t of tenants || []) {
    const id = t.id as string
    try {
      // Safety net: capitalize any equipment purchase that never got its
      // initial DR 1500 Equipment posted (e.g. rows created before this
      // existed) before running this month's depreciation against it.
      const acq = await backfillUnpostedEquipmentAcquisitions(id)
      totals.acquisitionsPosted += acq.posted

      const r = await postEquipmentDepreciationForTenant(id, monthKey)
      totals.unitsPosted += r.posted.length
      totals.unitsSkipped += r.skipped.length
      totals.amountCents += r.posted.reduce((a, p) => a + p.amountCents, 0)
      totals.tenants++
    } catch (e) {
      console.error('[cron/post-depreciation] tenant', id, e)
    }
  }

  return NextResponse.json({ ok: true, ...totals })
}
