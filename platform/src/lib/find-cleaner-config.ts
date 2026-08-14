// Shared constants for the find-cleaner broadcast pipeline. Pulled out of
// api/admin/find-cleaner/preview/route.ts (2026-08-14) -- Next's App Router
// route.ts files only allow a fixed set of exports (HTTP method handlers +
// a small config whitelist), so an arbitrary named export like TEST_MODE
// fails typed-route validation at build time. waitlist-broadcast.ts needs
// these too, so they live here instead of duplicating the values.

// HARD-CODED test mode. Flip to false ONLY after the broadcast pipeline is
// verified end-to-end with a single test team member. Mass-SMS guard
// (feedback_no_mass_sms): keep TEST_MODE on until explicitly cleared.
export const TEST_MODE = true
export const TEST_CLEANER_NAME_SUBSTRING = 'jeff tucker'
export const BROADCAST_CAP = 50
export const BUFFER_HOURS = 1
