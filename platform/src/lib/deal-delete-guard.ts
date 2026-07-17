/**
 * Guard against hard-deleting a deal that carries real sales/revenue
 * history. DELETE /api/deals/[id] is the only door that hard-deletes a
 * deals row, and it never checked this: deal_activities carries a NOT NULL
 * ON DELETE CASCADE to deals (migration 011) — deleting a deal silently
 * wipes its entire activity/audit trail, including the stage-change log
 * entry POST /api/deals/[id]/stage writes when a deal closes 'sold' and the
 * "Deposit $X paid — closed to Sold" note the Stripe webhook writes on
 * deposit payment.
 *
 * quotes.deal_id is ON DELETE SET NULL by design ("deleting a deal never
 * destroys the revenue record" — migration 2026_07_03_quote_deal_link), so
 * the quote itself survives a deal delete. But that's exactly the case that
 * most needs blocking: a deal that converted to a real, accepted/paid quote
 * (and possibly a real job via convertSaleToJob) can still be hard-deleted
 * today, permanently destroying the only sales-pipeline record that the
 * deal ever existed and closed — the quote just quietly loses its
 * deal_id and looks like it was never part of a pipeline at all.
 *
 * Mirrors booking-delete-guard/client-delete-guard: block on the deal's own
 * row carrying real closed-business signal (stage 'sold') or a linked quote
 * with real accept/deposit/conversion history, not on the mere existence of
 * routine activity-log rows (a lead that logged a follow-up note and went
 * nowhere should stay deletable).
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface DeleteGuardResult {
  deletable: boolean
  reason?: string
}

export async function checkDealDeletable(
  tenantId: string,
  dealId: string,
): Promise<DeleteGuardResult> {
  const [dealRow, quotes] = await Promise.all([
    supabaseAdmin.from('deals').select('stage').eq('tenant_id', tenantId).eq('id', dealId).maybeSingle(),
    supabaseAdmin
      .from('quotes')
      .select('id, status, deposit_paid_at, converted_job_id')
      .eq('tenant_id', tenantId)
      .eq('deal_id', dealId),
  ])

  const deal = dealRow.data as { stage?: string } | null
  if (deal?.stage === 'sold') {
    return {
      deletable: false,
      reason: 'This deal is marked Sold and cannot be deleted — mark it Lost or leave it as-is to preserve the sales record.',
    }
  }

  const hasRealQuoteHistory = (quotes.data || []).some((q) => {
    const row = q as { status?: string; deposit_paid_at?: string | null; converted_job_id?: string | null }
    return row.status === 'accepted' || row.status === 'converted' || !!row.deposit_paid_at || !!row.converted_job_id
  })
  if (hasRealQuoteHistory) {
    return {
      deletable: false,
      reason: 'This deal has an accepted, deposit-paid, or converted quote on file and cannot be deleted — mark it Lost instead to preserve the record.',
    }
  }

  return { deletable: true }
}
