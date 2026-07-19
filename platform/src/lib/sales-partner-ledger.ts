import { supabaseAdmin } from '@/lib/supabase'

const MAX_CAS_ATTEMPTS = 5

export interface PartnerLedgerDriftContext {
  relatedType: 'sales_partner_commission' | 'booking'
  relatedId: string
  partnerName?: string | null
}

/**
 * Atomically add `delta` to a sales partner's total_earned/total_paid column.
 * Same compare-and-swap retry loop as bumpReferrerTotal (src/lib/referrer-ledger.ts)
 * -- a plain `update({ field: read + delta })` loses updates when two
 * commissions for the SAME partner are created/paid concurrently (different
 * bookings, so UNIQUE(booking_id, sales_partner_id) on
 * sales_partner_commissions doesn't help).
 */
export async function bumpSalesPartnerTotal(
  tenantId: string,
  salesPartnerId: string,
  field: 'total_earned' | 'total_paid',
  delta: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const { data: current, error: readError } = await supabaseAdmin
      .from('sales_partners')
      .select(field)
      .eq('id', salesPartnerId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (readError || !current) return false

    const currentValue = ((current as Record<string, number | null>)[field]) ?? 0
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('sales_partners')
      .update({ [field]: currentValue + delta })
      .eq('id', salesPartnerId)
      .eq('tenant_id', tenantId)
      .eq(field, currentValue)
      .select('id')
      .maybeSingle()
    if (updateError) return false
    if (updated) return true
    // else: field changed between our read and write (concurrent bump) -- retry
  }
  return false
}

/**
 * Same as bumpSalesPartnerTotal, but leaves an admin_tasks row instead of
 * vanishing when every retry loses the race -- mirrors
 * bumpReferrerTotalOrFlag (src/lib/referrer-ledger.ts).
 */
export async function bumpSalesPartnerTotalOrFlag(
  tenantId: string,
  salesPartnerId: string,
  field: 'total_earned' | 'total_paid',
  delta: number,
  context: PartnerLedgerDriftContext,
): Promise<boolean> {
  const ok = await bumpSalesPartnerTotal(tenantId, salesPartnerId, field, delta)
  if (ok) return true

  console.error(
    `[sales-partner-ledger] bumpSalesPartnerTotal failed after ${MAX_CAS_ATTEMPTS} attempts -- partner ${salesPartnerId} (tenant ${tenantId}) ${field} is missing a ${delta} cent adjustment`
  )
  await supabaseAdmin.from('admin_tasks').insert({
    tenant_id: tenantId,
    type: 'sales_partner_ledger_drift',
    priority: 'high',
    title: `Sales partner ${field} out of sync${context.partnerName ? ` — ${context.partnerName}` : ''}`,
    description: `Failed to apply a ${delta} cent adjustment to sales_partners.${field} for partner ${salesPartnerId} after ${MAX_CAS_ATTEMPTS} retries. The underlying ${context.relatedType} record was saved correctly -- reconcile sales_partners.${field} manually.`,
    related_type: context.relatedType,
    related_id: context.relatedId,
  }).then(() => {}, (err) => console.error('[sales-partner-ledger] admin_tasks flag insert failed:', err))

  return false
}
