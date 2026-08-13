// Shared row/entity types for the Bookings admin page (BookingsAdmin.tsx and
// its extracted sub-components). Extracted verbatim from BookingsAdmin.tsx.
import type { CrewRow } from '@/lib/crew'

export interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
  payment_status: string
  payment_method: string | null
  notes: string | null
  client_id: string
  team_member_id: string
  team_member_token: string | null
  hourly_rate: number | null
  recurring_type: string | null
  schedule_id: string | null
  actual_hours: number | null
  team_member_pay: number | null
  tip_amount: number | null
  partial_payment_cents: number | null
  check_in_time: string | null
  fifteen_min_alert_time: string | null
  check_out_time: string | null
  check_in_location: Record<string, unknown> | null
  check_out_location: Record<string, unknown> | null
  job_seq: number | null
  clients: { id: string; name: string; phone: string; address: string; customer_number: number | null } | null
  team_members: { id: string; name: string } | null
  booking_team_members?: CrewRow[] | null
  team_member_paid: boolean | null
  team_member_paid_at: string | null
  pay_rate: number | null
  discount_percent: number | null
  one_time_credit_cents: number | null
  one_time_credit_reason: string | null
  walkthrough_video_url: string | null
  final_video_url: string | null
  suggested_team_member_id: string | null
  suggested_reason: string | null
  created_at: string
  source: string
  referrer_id: string | null
  sales_partner_id: string | null
}

export interface Client { id: string; name: string; phone: string; email: string; address: string; created_at: string; do_not_service?: boolean; preferred_team_member_id?: string | null }
export interface Cleaner { id: string; name: string; pay_rate?: number; working_days?: string[]; unavailable_dates?: string[]; schedule?: Record<string, unknown>; active?: boolean; status?: string; max_jobs_per_day?: number }
export interface Referrer { id: string; name: string; ref_code: string; active: boolean }
export interface SalesPartner { id: string; name: string; referral_code: string; active: boolean }
