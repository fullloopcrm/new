// Draft permission map for the shared core's tool registry (agent.ts's TOOLS +
// tools.ts's runTool) — the first real piece of #3 (folding the dashboard
// assistant's RBAC-gated tools into the shared core).
//
// NOT YET WIRED IN. The shared core currently has no caller that carries a
// dashboard user's role (SMS/email/Telegram/admin-chat all resolve only
// "owner or not owner", never a granular Role). This map exists so the next
// session doesn't start from zero: it mirrors the mapping already proven live
// in src/app/api/ai/assistant/route.ts's TOOL_PERMISSIONS, extended to cover
// the shared core's larger tool set. Wiring it in requires:
//   1. Threading a Role (or null for non-dashboard channels) through
//      askSelena -> askSelenaCore -> runTool.
//   2. Gating runTool on hasPermission(role, TOOL_PERMISSIONS[name], overrides)
//      when role is present, and preserving today's "owner or nothing" gate
//      for SMS/email/Telegram/admin-chat where no Role exists.
//   3. Reconciling the DUPLICATE tools between the two systems (e.g.
//      query_bookings here vs. list_bookings there) rather than gating both
//      separately — see the contract-shape note in tools.ts.
import type { Permission } from '@/lib/rbac'

export const SHARED_TOOL_PERMISSIONS: Partial<Record<string, Permission>> = {
  // Bookings
  reschedule_booking: 'bookings.edit',
  cancel_booking: 'bookings.edit',
  create_manual_booking: 'bookings.create',
  update_booking: 'bookings.edit',
  list_bookings: 'bookings.view',
  // Clients
  update_account: 'clients.edit',
  block_client: 'clients.edit',
  create_client: 'clients.create',
  lookup_client: 'clients.view',
  get_at_risk_clients: 'clients.view',
  // Team ("cleaner" in tool names — see agent.ts's known naming debt)
  assign_cleaner_to_booking: 'team.edit',
  create_cleaner: 'team.create',
  update_cleaner: 'team.edit',
  deactivate_cleaner: 'team.delete',
  list_cleaners: 'team.view',
  lookup_cleaner: 'team.view',
  block_cleaner_dates: 'schedules.edit',
  list_cleaner_applications: 'team.view',
  approve_cleaner_application: 'team.create',
  reject_cleaner_application: 'team.edit',
  // Finance
  confirm_payment: 'finance.view',
  check_payment: 'finance.view',
  approve_refund: 'finance.payroll',
  process_stripe_refund: 'finance.payroll',
  mark_payment_received: 'finance.view',
  mark_payout_paid: 'finance.payroll',
  get_revenue: 'finance.view',
  get_outstanding_payments: 'finance.view',
  // Recurring schedules
  list_recurring: 'schedules.view',
  pause_recurring: 'schedules.edit',
  resume_recurring: 'schedules.edit',
  cancel_recurring: 'schedules.edit',
  // Sales pipeline
  list_deals: 'sales.view',
  create_deal: 'sales.edit',
  update_deal: 'sales.edit',
  // Messaging (owner broadcast/direct-send tools — high blast radius)
  send_message_to_client: 'campaigns.send',
  send_message_to_cleaner: 'campaigns.send',
  send_broadcast: 'campaigns.send',
  // Settings
  get_setting: 'settings.view',
  update_setting: 'settings.edit',
  list_service_types: 'settings.view',
  // Notifications
  list_notifications: 'notifications.view',
  mark_notification_read: 'notifications.view',
}

// Tools intentionally left OFF this map — either read-only + low-sensitivity
// (get_today_summary, get_briefing, recall, search_messages, get_smart_suggestion,
// score_cleaners, suggest_times, seo_status), Yinez's own memory/skills system
// (remember, recall, list/create/update/deactivate/activate_skill,
// record_skill_use), or owner-only by existing convention with no dashboard
// equivalent yet (trigger_cron, send_pin, resend_confirmation, request_callback,
// report_issue). Needs a real decision per tool before this map goes live, not
// a default-permissive assumption.
