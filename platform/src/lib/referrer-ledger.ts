import { supabaseAdmin } from '@/lib/supabase'

const MAX_CAS_ATTEMPTS = 5

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
