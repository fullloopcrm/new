import { supabaseAdmin } from './supabase'

type AuditAction =
  | 'client.created' | 'client.updated' | 'client.deleted'
  | 'booking.created' | 'booking.updated' | 'booking.deleted' | 'booking.status_changed' | 'booking.batch_updated'
  | 'team.created' | 'team.updated' | 'team.deleted'
  | 'schedule.created' | 'schedule.updated' | 'schedule.deleted' | 'schedule.paused'
  | 'campaign.created' | 'campaign.sent' | 'campaign.deleted'
  | 'payment.received' | 'payment.marked_paid'
  | 'review.requested' | 'review.created'
  | 'referral.created' | 'referral.paid'
  | 'expense.created' | 'expense.deleted'
  | 'settings.updated' | 'service.created' | 'service.updated' | 'service.deleted'
  | 'team_portal.login' | 'team_portal.checkin' | 'team_portal.checkout'
  | 'portal.login' | 'portal.booking_created' | 'portal.booking_cancelled'

export async function audit({
  tenantId,
  action,
  entityType,
  entityId,
  userId,
  details,
  ip,
}: {
  tenantId: string
  action: AuditAction
  entityType: string
  entityId?: string
  userId?: string
  details?: Record<string, unknown>
  ip?: string
}): Promise<{ success: boolean }> {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      tenant_id: tenantId,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      user_id: userId || null,
      details: details || null,
      ip_address: ip || null,
    })
    if (error) throw error
    return { success: true }
  } catch (e) {
    // Fallback: try inserting a simpler error record so the failure is visible in the DB
    try {
      await supabaseAdmin.from('audit_logs').insert({
        tenant_id: tenantId,
        action,
        entity_type: entityType,
        details: { _audit_error: String(e), originalDetails: details || null },
      })
    } catch (fallbackError) {
      // Last resort — both inserts failed, log to console
      console.error('Audit log error (primary + fallback both failed):', e, fallbackError)
    }
    return { success: false }
  }
}
