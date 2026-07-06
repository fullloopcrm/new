/**
 * Simulation / verification: run the REAL ledger report functions (the exact
 * code the app uses, incl. the Supabase FK-embed query) against NYC Maid and
 * check they reproduce the numbers proven via raw SQL. Read-only.
 *
 *   npx tsx --env-file=.env.local scripts/verify-ledger.ts
 */
import { ledgerProfitAndLoss, ledgerBalanceSheet, ledgerTrialBalance } from '../src/lib/finance/ledger-reports'
import { backfillRevenueFromBookings } from '../src/lib/finance/post-revenue'

const T = '00000000-0000-0000-0000-000000000001' // The NYC Maid
const FROM = '2020-01-01'
const TO = '2030-12-31'

async function main() {
  const pnl = await ledgerProfitAndLoss(T, FROM, TO)
  console.log('== ledgerProfitAndLoss (real PostgREST embed) ==')
  console.log('  revenue_cents:', pnl.revenue_cents, '(expect 11721000)')
  console.log('  cost_of_service_cents:', pnl.cost_of_service_cents, '(expect 4582300)')
  console.log('  net_profit_cents:', pnl.net_profit_cents)
  console.log('  REVENUE MATCH:', pnl.revenue_cents === 11721000, '| COGS MATCH:', pnl.cost_of_service_cents === 4582300)

  const tb = await ledgerTrialBalance(T, FROM, TO)
  console.log('== ledgerTrialBalance ==')
  console.log('  debits:', tb.total_debits_cents, 'credits:', tb.total_credits_cents, 'balanced:', tb.balanced)

  const bs = await ledgerBalanceSheet(T, TO)
  console.log('== ledgerBalanceSheet ==')
  console.log('  assets:', bs.total_assets_cents, 'liab+equity:', bs.total_liabilities_cents + bs.total_equity_cents, 'balanced:', bs.balanced)

  // TS write path + idempotency: NYC Maid is already backfilled, so the real
  // posting function must scan the bookings and post ZERO new entries.
  const bf = await backfillRevenueFromBookings(T)
  console.log('== backfillRevenueFromBookings (TS write path, idempotency) ==')
  console.log('  scanned:', bf.scanned, 'revenuePosted:', bf.revenuePosted, 'cogsPosted:', bf.cogsPosted)
  console.log('  IDEMPOTENT (0 new):', bf.revenuePosted === 0 && bf.cogsPosted === 0)
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e); process.exit(1) })
