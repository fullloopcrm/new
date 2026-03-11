// Shared types for Supabase join results
// These replace `as unknown as` casts throughout the codebase

// ============================================
// Base record types (fields commonly selected in queries)
// ============================================

export interface ClientRecord {
  name: string
  email: string
  phone: string
  address: string
}

export interface TeamMemberRecord {
  name: string
  email: string
  phone: string
}

export interface TenantRecord {
  id: string
  name: string
  telnyx_api_key: string | null
  telnyx_phone: string | null
  resend_api_key: string | null
  status: string
}

// ============================================
// Partial join types (for narrower selects)
// ============================================

export type ClientName = Pick<ClientRecord, 'name'> | null
export type ClientNamePhone = Pick<ClientRecord, 'name' | 'phone'> | null
export type ClientNameEmail = Pick<ClientRecord, 'name' | 'email'> | null
export type ClientNameAddress = Pick<ClientRecord, 'name' | 'address'> | null
export type ClientNamePhoneEmail = Pick<ClientRecord, 'name' | 'phone' | 'email'> | null
export type ClientNamePhoneAddress = Pick<ClientRecord, 'name' | 'phone' | 'address'> | null

export type TeamMemberName = Pick<TeamMemberRecord, 'name'> | null
export type TeamMemberNamePhone = Pick<TeamMemberRecord, 'name' | 'phone'> | null
export type TeamMemberNamePhoneEmail = Pick<TeamMemberRecord, 'name' | 'phone' | 'email'> | null

// ============================================
// Booking with joined relations
// Each variant matches a specific .select() query shape
// ============================================

/** reminders/route.ts — day-based reminders query */
export interface BookingWithClientAndTeam {
  id: string
  client_id: string | null
  team_member_id: string | null
  service_type: string | null
  start_time: string
  end_time: string
  clients: ClientNamePhoneEmail
  team_members: TeamMemberNamePhoneEmail
}

/** reminders/route.ts — 2-hour reminders query */
export interface BookingWith2HourReminder {
  id: string
  client_id: string | null
  team_member_id: string | null
  service_type: string | null
  start_time: string
  clients: ClientNamePhoneEmail
  team_members: TeamMemberNamePhone
}

/** reminders/route.ts — payment alert query */
export interface BookingWithPaymentAlert {
  id: string
  client_id: string | null
  start_time: string
  end_time: string
  hourly_rate: number | null
  clients: ClientName
  team_members: TeamMemberName
}

/** reminders/route.ts — thank-you query */
export interface BookingWithThankYou {
  id: string
  client_id: string | null
  service_type: string | null
  clients: ClientNameEmail
}

/** reminders/route.ts — pending bookings query */
export interface BookingPending {
  id: string
  start_time: string
  clients: ClientName
}

/** confirmations/route.ts — unconfirmed jobs query */
export interface BookingUnconfirmed {
  id: string
  start_time: string
  end_time: string
  team_member_id: string | null
  clients: ClientNameAddress
  team_members: TeamMemberNamePhone
}

/** confirmations/route.ts — tomorrow bookings query */
export interface BookingTomorrowConfirm {
  id: string
  client_id: string | null
  start_time: string
  service_type: string | null
  clients: ClientNamePhone
  team_members: TeamMemberName
}

/** daily-summary/route.ts — team lookahead query */
export interface BookingTeamLookahead {
  id: string
  start_time: string
  end_time: string
  service_type: string | null
  clients: ClientNamePhoneAddress
}

/** daily-summary/route.ts — recurring schedules query */
export interface RecurringScheduleWithClient {
  id: string
  client_id: string | null
  recurring_type: string | null
  clients: ClientName
}
