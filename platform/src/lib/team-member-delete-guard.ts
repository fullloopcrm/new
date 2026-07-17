/**
 * Guard against hard-deleting a team member who has real financial or HR
 * compliance history attached. Two live doors delete team_members rows
 * (DELETE /api/team/[id], DELETE /api/cleaners/[id]), and neither checked
 * this before calling it: payroll_payments, hr_documents, and hr_notes all
 * carry ON DELETE CASCADE to team_members (migrations 008, 053) — a hard
 * delete silently destroys real paid-payroll records and filed compliance
 * documents/write-ups with no trace, no confirmation, no way back.
 * team_member_payouts has no cascade (NO ACTION), so it would 500 with a raw
 * FK-violation error instead of cascading — still worth catching cleanly here
 * rather than leaking a Postgres error to the client.
 *
 * team_members.status already has an 'inactive' value used exactly for this
 * ("remove from the roster, keep the record") — this guard steers callers
 * there instead of guessing a new soft-delete mechanism.
 */
import { supabaseAdmin } from '@/lib/supabase'

export interface DeleteGuardResult {
  deletable: boolean
  reason?: string
}

export async function checkTeamMemberDeletable(
  tenantId: string,
  teamMemberId: string,
): Promise<DeleteGuardResult> {
  const [payroll, payouts, docs, notes] = await Promise.all([
    supabaseAdmin.from('payroll_payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
    supabaseAdmin.from('team_member_payouts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
    supabaseAdmin.from('hr_documents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
    supabaseAdmin.from('hr_notes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('team_member_id', teamMemberId),
  ])

  if ((payroll.count || 0) > 0 || (payouts.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This team member has payroll or payout history and cannot be deleted — set status to inactive instead to preserve the financial record.',
    }
  }
  if ((docs.count || 0) > 0 || (notes.count || 0) > 0) {
    return {
      deletable: false,
      reason: 'This team member has HR documents or notes on file and cannot be deleted — set status to inactive instead to preserve the compliance record.',
    }
  }
  return { deletable: true }
}
