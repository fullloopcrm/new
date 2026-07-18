import { supabaseAdmin } from '@/lib/supabase'

const MAX_CAS_ATTEMPTS = 5

export interface LedgerDriftContext {
  relatedType: 'referral_commission' | 'booking'
  relatedId: string
  referrerName?: string | null
}

/**
 * Atomically add `delta` to a referrer's total_earned/total_paid column.
 *
 * referrers.total_earned/total_paid are shown directly to the referrer as
 * money owed/paid (src/app/referral/[code]/page.tsx and every tenant clone
 * compute pendingAmount = total_earned - total_paid from them), so a lost
 * update here understates real money. A plain `update({ field: read + delta
 * })` loses updates when two commissions for the SAME referrer are
 * created/paid concurrently (different bookings, so the existing
 * UNIQUE(booking_id) dedup on referral_commissions doesn't help) -- both
 * requests read the same starting value and the second write clobbers the
 * first. This does a compare-and-swap retry loop instead: read the current
 * value, write WHERE field still equals what we read, retry on conflict.
 */
export async function bumpReferrerTotal(
  tenantId: string,
  referrerId: string,
  field: 'total_earned' | 'total_paid',
  delta: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const { data: current, error: readError } = await supabaseAdmin
      .from('referrers')
      .select(field)
      .eq('id', referrerId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (readError || !current) return false

    const currentValue = ((current as Record<string, number | null>)[field]) ?? 0
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('referrers')
      .update({ [field]: currentValue + delta })
      .eq('id', referrerId)
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
 * Same as bumpReferrerTotal, but every one of its 3 call sites
 * (referral-commissions create/mark-paid, team-portal checkout) previously
 * awaited or fire-and-forgot the result without checking it -- a false
 * return (read error, or all MAX_CAS_ATTEMPTS retries lost the race) left
 * referrers.total_earned/total_paid silently out of sync with the
 * referral_commissions row that WAS created/paid, with zero trace anywhere.
 * This wraps the call so a failure always leaves an admin_tasks row instead
 * of vanishing.
 */
export async function bumpReferrerTotalOrFlag(
  tenantId: string,
  referrerId: string,
  field: 'total_earned' | 'total_paid',
  delta: number,
  context: LedgerDriftContext,
): Promise<boolean> {
  const ok = await bumpReferrerTotal(tenantId, referrerId, field, delta)
  if (ok) return true

  console.error(
    `[referrer-ledger] bumpReferrerTotal failed after ${MAX_CAS_ATTEMPTS} attempts -- referrer ${referrerId} (tenant ${tenantId}) ${field} is missing a ${delta} cent adjustment`
  )
  await supabaseAdmin.from('admin_tasks').insert({
    tenant_id: tenantId,
    type: 'referrer_ledger_drift',
    priority: 'high',
    title: `Referrer ${field} out of sync${context.referrerName ? ` — ${context.referrerName}` : ''}`,
    description: `Failed to apply a ${delta} cent adjustment to referrers.${field} for referrer ${referrerId} after ${MAX_CAS_ATTEMPTS} retries. The underlying ${context.relatedType} record was saved correctly -- reconcile referrers.${field} manually.`,
    related_type: context.relatedType,
    related_id: context.relatedId,
  }).then(() => {}, (err) => console.error('[referrer-ledger] admin_tasks flag insert failed:', err))

  return false
}
