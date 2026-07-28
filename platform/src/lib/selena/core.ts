// Yinez "core" engine — barrel module.
//
// This file used to be a single 2729-line file, split (2026-07-28) into
// cohesive modules by responsibility, same directory, `core-` prefix:
//
//   core-types.ts            shared types/constants, sendSMS, yinezError, isCleanerPhone
//   core-intent.ts           intent detection + checklist state machine
//   core-extraction.ts       deterministic field extraction from chat messages
//   core-tools-booking.ts    booking/quote tool handlers
//   core-tools-account.ts    account/payment tool handlers
//   core-tools-schedule.ts   schedule/dispute/callback tool handlers + handleTool dispatch
//
// Dead-code cleanup (2026-07-28, same day): the original split also produced
// core-ask.ts (buildMessages + this module's OWN askSelena/tool loop),
// core-profile.ts (getClientProfile/buildCalendarContext, used only by
// core-ask's askSelena), and core-responses.ts (deterministic response
// generators, same), plus ALL_TOOLS/getToolsForIntent in core-tools-booking.ts
// (the Anthropic tool-schema list core-ask's askSelena fed the model) and four
// tool handlers only reachable via that same dead loop's dynamic dispatch
// (add_to_waitlist, get_invoice, manage_recurring, booking_details). All of
// that was verified to have ZERO callers anywhere in the repo — the real,
// production askSelena is `@/lib/selena/agent.ts`, which dispatches tools
// through `@/lib/selena/tools.ts`'s runTool, not through this module's now-
// removed askSelena. That verification (grepping the whole repo, not trusting
// the original dead-code claim) is what's captured in this doc note — a
// version of this file's askSelena/ALL_TOOLS/handleTool/getToolsForIntent
// path was ALSO the subject of an earlier audit claim that turned out to be
// wrong for `handleTool` and several of its tool branches (still live via
// this module's `handleTool`, called directly by
// `src/lib/voice-agent/customer-tools.ts` for the voice channel AND bridged
// from `tools.ts`'s CLIENT_TOOLS set for the main SMS/web/telegram channel) —
// only the pieces listed above were confirmed to have no live caller either
// way before being deleted.
//
// This barrel re-exports the CURRENT public surface of `@/lib/selena/core` —
// narrower than before the cleanup. `handleTool` and `EMPTY_CHECKLIST` (plus
// the `YinezResult` type) are the only symbols any file outside this
// directory actually imports from `@/lib/selena/core`; the rest are kept
// exported here only because sibling modules in this directory import them
// via the barrel-adjacent relative paths, not because of a real external
// caller.

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
  handleCreateBooking,
} from './core-tools-booking'

export {
  handleTool,
} from './core-tools-schedule'
