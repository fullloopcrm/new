/**
 * Safety-net finance posting. Idempotently posts any unposted revenue/labor/
 * commissions to the ledger so the books stay correct even if a real-time hook
 * ever misses. Schedule via vercel.json. CRON_SECRET Bearer auth.
 *
 * NOTE: runs backfillRevenueFromBookings (source='booking') — do NOT also run
 * backfillUnpostedRevenue here; both would post the same job under different
 * keys and double-count.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { backfillRevenueFromBookings } from '@/lib/finance/post-revenue'
import { backfillUnpostedLabor } from '@/lib/finance/post-labor'
import { backfillUnpostedCommissions } from '@/lib/finance/post-adjustments'

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') || ''
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenants } = await supabaseAdmin.from('tenants').select('id').eq('status', 'active')
  const totals = { tenants: 0, revenue: 0, cogs: 0, labor: 0, commissions: 0 }

  for (const t of tenants || []) {
    const id = t.id as string
    try {
      const r = await backfillRevenueFromBookings(id)
      totals.revenue += r.revenuePosted
      totals.cogs += r.cogsPosted
      const l = await backfillUnpostedLabor(id)
      totals.labor += l.payouts + l.payroll
      const c = await backfillUnpostedCommissions(id)
      totals.commissions += c.accrued + c.paid
      totals.tenants++
    } catch (e) {
      console.error('[cron/finance-post] tenant', id, e)
    }
  }

  return NextResponse.json({ ok: true, ...totals })
}
