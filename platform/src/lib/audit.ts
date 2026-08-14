import { supabaseAdmin } from './supabase'
import { alertOwner } from './telegram'

export type AuditAction =
  | 'client.created' | 'client.updated' | 'client.deleted' | 'client.data_exported' | 'client.merged'
  | 'client.dedupe_prevented'
  | 'client.gdpr_deletion_requested' | 'client.gdpr_deletion_cancelled' | 'client.gdpr_deletion_purged'
  | 'booking.created' | 'booking.updated' | 'booking.deleted' | 'booking.status_changed' | 'booking.batch_updated'
  | 'booking.duplicate_auto_cancelled'
  | 'client_contact.duplicate_merged'
  | 'team.created' | 'team.updated' | 'team.deleted' | 'team.deactivated'
  | 'schedule.created' | 'schedule.updated' | 'schedule.deleted' | 'schedule.paused'
  | 'campaign.created' | 'campaign.sent' | 'campaign.deleted'
  | 'payment.received' | 'payment.marked_paid'
  | 'review.requested' | 'review.created'
  | 'referral.created' | 'referral.paid'
  | 'expense.created' | 'expense.deleted'
  | 'settings.updated' | 'permissions.updated' | 'service.created' | 'service.updated' | 'service.deleted'
  | 'team_portal.login' | 'team_portal.checkin' | 'team_portal.checkout'
  | 'portal.login' | 'portal.booking_created' | 'portal.booking_cancelled'
  | 'auth.universal_pin_login'
  | 'admin.dashboard_login'
  | 'deal.created' | 'deal.updated' | 'deal.deleted'
  | 'board_item.note_added' | 'board_item.updated'
  | 'yinez.tool_call' | 'yinez.tool_blocked'
  | 'selena_legacy.tool_call'
  | 'admin_ai_chat.tool_call'
  | 'assistant.tool_call'
  | 'jefe.tool_call'
  | 'tenant.offboarded'

// Audit actions that warrant an immediate ping to the owner — irreversible,
// access-changing, or data-exfiltration-shaped. Everything else in
// AuditAction stays dashboard-only (audit_logs already records it; most
// actions are routine business ops that would just be Telegram noise).
const SENSITIVE_AUDIT_ACTIONS = new Set<AuditAction>([
  'permissions.updated',
  'client.deleted',
  'client.merged',
  'client.gdpr_deletion_requested',
  'client.gdpr_deletion_purged',
  'client.data_exported',
  'team.deleted',
  'campaign.sent',
])

const sensitiveAuditCooldowns = new Map<string, number>()
const SENSITIVE_AUDIT_COOLDOWN_MS = 10 * 60 * 1000

function alertSensitiveAudit(opts: {
  tenantId: string
  action: AuditAction
  entityType: string
  entityId?: string
  userId?: string
  details?: Record<string, unknown>
}): void {
  const key = `${opts.tenantId}:${opts.action}`
  const now = Date.now()
  const last = sensitiveAuditCooldowns.get(key) || 0
  if (now - last <= SENSITIVE_AUDIT_COOLDOWN_MS) return
  sensitiveAuditCooldowns.set(key, now)

  const detail = [
    `Tenant: ${opts.tenantId}`,
    `Entity: ${opts.entityType}${opts.entityId ? ` (${opts.entityId})` : ''}`,
    opts.userId ? `By: ${opts.userId}` : '',
    opts.details ? JSON.stringify(opts.details).slice(0, 300) : '',
  ].filter(Boolean).join('\n')

  alertOwner(`🛡️ ${opts.action}`, detail).catch((e) => console.error('Failed to send sensitive-audit alert to Telegram:', e))
}

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
    if (SENSITIVE_AUDIT_ACTIONS.has(action)) {
      alertSensitiveAudit({ tenantId, action, entityType, entityId, userId, details })
    }
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
