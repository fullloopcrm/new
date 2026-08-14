// Re-exports the platform-wide arrival-window helpers. This file used to be
// a byte-for-byte duplicate of ../time-window.ts (nycmaid's own copy, ported
// platform-wide, then never de-duplicated) — two independent copies of the
// same naive-ET-timestamp-handling logic drifting in comments only, which is
// exactly the pattern that let real timezone bugs recur across the codebase.
// Kept as a re-export (not deleted) so the 6 existing '@/lib/nycmaid/time-window'
// imports don't need to change.
export {
  clientArrivalWindow,
  nycmaidWallClockTime,
  bookingWallClockDate,
  ARRIVAL_WINDOW_NOTE,
  ARRIVAL_WINDOW_NOTE_SMS,
  ARRIVAL_WINDOW_NOTE_ES,
} from '@/lib/time-window'
