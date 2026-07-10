// Shared constants + types for the applicant-broadcast routes. Extracted from
// preview/route.ts because Next 16 rejects non-standard exports from a route
// file. Values are unchanged — do not alter the safety gates here.

// HARD-CODED test mode. While true, the send route only delivers to an applicant
// row whose name contains TEST_APPLICANT_NAME_SUBSTRING. Flip to false ONLY after
// Jeff confirms the pipeline end-to-end with his own test applicant row.
export const TEST_MODE = true
export const TEST_APPLICANT_NAME_SUBSTRING = 'jeff tucker'

// Cap per send stays at/under the SMS circuit breaker so a broadcast never trips
// it. More than this → run again.
export const BROADCAST_CAP = 25

export type EligibleApplicant = {
  id: string
  name: string
  phone: string | null
  status: string | null
  created_at: string
  reasons_excluded: string[]
  eligible: boolean
}
