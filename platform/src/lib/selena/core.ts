// Yinez "core" engine — barrel module.
//
// This file used to be a single 2729-line file. Split (2026-07-28) into
// cohesive modules by responsibility, same directory, `core-` prefix:
//
//   core-types.ts            shared types/constants, sendSMS, yinezError, isCleanerPhone
//   core-intent.ts           intent detection + checklist state machine
//   core-extraction.ts       deterministic field extraction from chat messages
//   core-tools-booking.ts    tool defs (ALL_TOOLS) + booking/waitlist/quote handlers
//   core-tools-account.ts    account/payment tool handlers
//   core-tools-schedule.ts   schedule/dispute/callback tool handlers + handleTool dispatch
//   core-profile.ts          client profile + calendar context builders
//   core-responses.ts        deterministic non-booking/booking response generators
//   core-ask.ts              buildMessages + askSelena (main entry point)
//
// Pure refactor — behavior unchanged. This barrel re-exports exactly the
// same public surface `@/lib/selena/core` had before the split, so every
// existing import path (`import { X } from '@/lib/selena/core'`) keeps
// working unchanged; nothing outside this directory needed to change.
// Symbols that were already module-private (e.g. NYCMAID_TENANT_ID,
// sendSMS, several tool handlers) are now exported from their new home
// file so sibling modules here can import them, but are NOT re-exported
// here — the external public API is unchanged.

export {
  yinezError,
  type BookingChecklist,
  type Intent,
  type YinezResult,
  type NextStep,
  EMPTY_CHECKLIST,
  isCleanerPhone,
} from './core-types'

export {
  detectIntent,
  getNextStep,
  buildChecklistPrompt,
  getQuickReplies,
  loadChecklist,
  updateChecklist,
} from './core-intent'

export {
  isValidName,
  type ExtractionResult,
  extractAndSave,
} from './core-extraction'

export {
  ALL_TOOLS,
  getToolsForIntent,
  handleCreateBooking,
} from './core-tools-booking'

export {
  handleBookingDetails,
  handleTool,
} from './core-tools-schedule'

export {
  getClientProfile,
  buildCalendarContext,
} from './core-profile'

export {
  generateNonBookingResponse,
  generateBookingResponse,
} from './core-responses'

export {
  buildMessages,
  askSelena,
} from './core-ask'
