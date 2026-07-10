# NYC Maid ind build — 100% review (spec for FL parity)

**Source:** `~/Desktop/nycmaid` (the standalone live build). **Goal:** know exactly what NYC Maid does so the FL `nycmaid` tenant matches 100%.
**Surface:** 236 API routes · 48 libs (7,647 lines) · 24 crons · Yinez agent (4,566 lines: agent 693 / core 2,543 / tools 1,330).
**Method:** reading actual code, not greps. Status per section: ✅ read / ⏳ pending.

---

## 1. Yinez — the agent brain ✅ (read `src/lib/yinez/agent.ts`)

**What it is:** ONE agent, all channels, all clients, full ops + memory. Replaced Maria/Selena/Selena2. Entry: `askYinez(channel, message, conversationId, phone, ctx)`, channel ∈ sms/web/email/telegram. Model **`claude-sonnet-4-6`**, max_tokens 1024, **5-turn tool loop**, 45s timeout, SMS reply capped 600 / web 4000 chars.

**System prompt (`YINEZ_PROMPT`, ~250 lines) — the hard rules that DEFINE the business:**
- **Zero-hallucination:** never quote a number/name/date/status unless a tool returned it this turn.
- **Context-over-priors:** a `CONTEXT` block (last_outbound, linked_booking, expected_balance) overrides the model's read of a short reply ("5" = rating, "paid" = payment claim).
- **Never confirm a slot on client channels:** does NOT say a time is open/full/works — redirects EVERY availability question to `thenycmaid.com/book/new` ($10 off first clean). Owner (Telegram) can ask calendar Qs.
- **Zero-fake-save:** never says "saved/noted/updated" without a tool returning ok.
- **First message flow:** collect NAME only (SMS already has phone; web asks both) → `create_client` + `remember(observation)` → send self-book link. NO booking-detail collection over chat (form does it, owner confirms within the hour). `create_booking`/`score_cleaners` BANNED on client channels.
- **Escalation triggers (fire immediately, even turn 1):** refund, lawyer/BBB/chargeback, theft, damage, no-show, discount demand, cleaner-behavior, threats → say canned line + call BOTH `request_callback` AND `remember(issue)` same turn. Commercial property (office/restaurant/2000+sqft) → custom pricing via Jeff.
- **Pricing (hourly, never flat totals):** $69/hr we-supply · $59/hr client-supplies · $89/hr same-day emergency. 30-min increments. 2hr min. Multi-cleaner (2+) = 48hr notice + 4hr min + NO discount; under-48hr multi = $89. Recurring discounts only AFTER first visit (20% weekly / 10% biweekly-monthly). Arrival = 2-HOUR WINDOW to clients (exact start internal). Insured $1M. NEVER invent totals.
- **Policies:** first-time can't cancel/reschedule; recurring 7-day notice. Payment = texted Stripe link only (Apple Pay/card/Cash App — NO Zelle/Venmo). Tips: never bring up; if asked "100% goes to cleaner." Reviews only after completed service.
- **Voice:** older Latin tía — warm, funny, sharp, Spanglish when matched. Banned phrases: "certainly/absolutely/great question/happy to help/I understand/rest assured/feel free/kindly/as per". 😊 max once. Plain text, <300 chars typical.
- **10-stage pipeline awareness:** lead → conversation → booking(self-serve) → confirmation[auto] → pre-arrival[auto] → service[auto] → payment[auto] → payout[auto] → rating[auto] → retention[auto].

**Context loading (`loadContext`):** owner detection via `OWNER_PHONES`; client match by phone (canonical = active>potential, newest); booking count + notes + **preferred cleaner**; per-client **`yinez_memory`** (last 10); **global lessons/rules** (`yinez_memory` client_id NULL, types lesson/rule/instruction, last 50); **`yinez_skills`** (active, auto-loaded as procedures).

**Tools (~60):** booking (create/lookup/reschedule/cancel), payments (confirm/check/mark_received/approve_refund/process_stripe_refund), account (send_pin/resend_confirmation/update_account), CS (request_callback/report_issue), memory (remember/recall), owner analytics (today_summary/revenue/outstanding/at_risk/search_messages/briefing), CRUD (clients/cleaners/recurring/deals/notifications/cleaner-applications/settings/service-types), scheduling (score_cleaners/get_smart_suggestion/suggest_times), skills CRUD, trigger_cron, send_broadcast, block_client/cleaner_dates. **Client channels = TOOLS minus create_booking + score_cleaners**; owner gets all; safety gate in `runTool`.

**Resilience:** `alertOnAnthropicFailure` — SMS + notify Jeff on credit-low/auth/rate-limit, 30-min dedup (Yinez going silent = revenue-critical).

**FL parity note (to verify):** FL's agent is `selena-legacy.ts` (SMS path) + `src/lib/selena/`. Must confirm FL has: this exact prompt ruleset, the ~60 tools, `yinez_memory` per-client + global lessons, `yinez_skills` auto-load, owner gating, context-over-priors block, escalation dual-tool rule, self-review. **This is the riskiest parity surface.**

---

## 2. Client-side engine (core.ts, 2,543 lines) ✅ mapped
Two-layer legacy Selena engine, still present alongside the self-book redirect:
- **17-intent router** (`Intent` type, `detectIntent`): casual, not_interested, human_request, schedule_change, cleaner_request, dispute, feedback_negative/positive, account_help, referral, emergency, payment_question/confirm, question, rebook, greeting, booking.
- **Deterministic booking checklist** (`loadChecklist`/`updateChecklist`/`getNextStep`/`buildChecklistPrompt`/`getQuickReplies`) — service_type→bedrooms→rate→day→time→name→phone→address→email→notes→recap. Identity LAST.
- **Layer-1 extraction** (`extractAndSave`, `isValidName` blocks "Just paid via Zelle" as a name), per-step micro-prompts (`buildStepPrompt`), `getToolsForIntent` (focused 5-6 tool sets).
- **`handleCreateBooking`** (573 lines) — the deterministic booking creator. `handleTool` dispatches client-side tools: create_booking, add_to_waitlist, get_quote, get_account, update_account, send_pin, resend_confirmation, check_payment, confirm_payment, get_invoice, lookup_bookings, reschedule, cancel, manage_recurring, booking_details, report_issue, request_callback, remember.
- `generateNonBookingResponse` — canned per-intent replies (dispute shows check-in/out+GPS+billed math; cleaner_request = ack not booking).
- **FL parity Q:** FL uses `selena-legacy.ts`. Confirm the intent router + deterministic layer + extraction + `getClientProfile` all ported.

## 3. Owner tools (tools.ts, 1,330 lines) ⏳ (implements the ~40 owner-only tools from agent.ts)

## 4. Booking money loop (/api/client/book) ✅
Read fully. Matches FL's `/api/client/book` closely. **The one real diff: ind build resolves `property_id`** (`resolveProperty(clientId, address, unit)` + `applyPropertyToBookingClient`) and inserts it on the booking; ind also creates `booking_cleaners` team rows for requested extras + `createPrimaryContact` for fan-out. FL's version has neither property_id nor booking_cleaners on this path. Pricing/emergency/promo logic is otherwise identical.

## 5. Payment chain ✅ (billing-hours, cleaner-pay, stripe webhook)
**This is a full auto-payout money loop — the most important parity surface after the agent.**
- **`billing-hours.ts`:** client billed rounding up PAST **10 min**, cleaner paid PAST **15 min** (`clientBilledHours`/`cleanerPaidHours`, half-hour blocks). Different grace on purpose — drift here overpaid cleaners historically.
- **`cleaner-pay.ts`:** **flat $35/hr** for jobs in NJ / Long Island / Westchester (`REGION_PREMIUM_RATE=35`, `PREMIUM_ZONES` + LI ZIP `115/117/118/119xx` backstop). `effectiveCleanerRate(base, jobAddress)` — job-location based. **← THE $35 FLOOR. Confirmed ABSENT from FL `src/lib/nycmaid/*` (grep). REAL GAP.**
- **Stripe webhook (`/api/stripe/webhook`)** on `checkout.session.completed`:
  1. bookingId from `client_reference_id`; if missing → **recover by matching payer email → most-recent unpaid booking**, else notify+SMS admin for manual match (never drops a payment).
  2. Idempotency via `payments.stripe_session_id`.
  3. Mark booking paid → compute expected balance → **detect tip** (amount − expected).
  4. **Auto-pay cleaner via Stripe Connect**: `transfers.create` → `payouts.create({method:'instant'})` on connected account, using `effectiveCleanerRate` (the $35 rule) + `cleanerPaidHours` (15-min grace). **Tip 100% to cleaner.** Record `cleaner_payouts`, mark `cleaner_paid`.
  5. Bilingual (EN/ES) SMS to cleaner with pay+tip; confirmation SMS to client; admin SMS + notify.
- **FL parity Q:** does FL's stripe webhook do instant Connect payout + tip + $35 rate + email-recovery? FL has `payment-processor.ts` — must diff. **HIGH-STAKES: this pays cleaners automatically.**

## 6. Payment trigger — 30-min alert (`/api/team/30min-alert`) ✅
Fires ~30 min before completion (cleaner checked in via team app). Completes the loop:
- Computes hours check_in→check_out/now; **client billed 10-min grace, cleaner paid 15-min grace**; honors `max_hours` cap.
- **$10 self-booking discount** applied (detected via `/self-booking discount/i` in `booking.notes`, flag set at booking time).
- Cleaner-pay preview uses `effectiveCleanerRate` ($35 region).
- SMS admin the full breakdown (collect $X / pay cleaner $Y), then **SMS client the Stripe pay link** `buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03?client_reference_id=<bookingId>` + "reply 1-5" rating ask (`pre_payment_rating` state). Retries 2× (60s gap); on total failure → `admin_tasks` high-priority "CALL manually" + admin SMS.
- 5 min later triggers email-monitor (Zelle/Venmo backstop, now retired).

**➡️ FULL MONEY LOOP (ind build):** self-book/Yinez → `pending` → admin confirms + assigns cleaner → cleaner check-in (team app) → **30-min alert** sends pay link + rating ask → client pays → **Stripe webhook** marks paid, detects tip, **auto-pays cleaner (Connect instant payout, $35 region rate, 15-min grace, tip 100%)** → bilingual SMS to cleaner + client + admin. **Payment is collected NEAR COMPLETION, not at booking — this matches; my earlier "no pay at booking" is NOT a gap.**

---

## CONFIRMED PARITY GAPS SO FAR (FL nycmaid tenant vs ind build)
1. **$35 region cleaner-pay floor** — `cleaner-pay.ts` (`effectiveCleanerRate`/`REGION_PREMIUM_RATE`/`isPremiumPayZone` + LI ZIP backstop). Absent from FL `src/lib/nycmaid/*`. Used in 30-min alert AND Stripe payout. **Cleaners in NJ/LI/Westchester would be paid the wrong rate on FL.**
2. **`property_id` on bookings** — ind resolves + attaches property (multi-address); FL `/api/client/book` doesn't. Multi-address clients misroute to `client.address`.
3. **VERIFY:** FL Stripe webhook does Connect instant payout + tip detection + email-recovery?
4. **VERIFY:** FL 30-min alert exists with $10 promo + pay-link + rating-ask + retry/escalation?
5. **VERIFY (biggest):** FL agent (selena-legacy) has the full Yinez ruleset, ~60 tools, `yinez_memory`, `yinez_skills`, self-review, context-over-priors, escalation dual-tool.

---
## 7. Scheduling ✅ mapped (`smart-schedule.ts` `scoreCleanersForBooking`)
Hard filters (score −1, unavailable): not scheduled that day / outside set hours / time conflict (names the clashing client+time) / outside service zone / needs-a-car zone. Scoring from base **100**: preferred cleaner **+200**, zone match **+50**, has-zones-but-not-this **−30**, labor-only on a supply job **−100** (hard DQ), proximity `+max(0,30−dist×3)`, cluster bonus (already-nearby job), travel-from-prev `+max(0,20−travel×0.5)`, can't-make-home-by-time **−50**. Sort: available (highest score) first. `service-zones.ts` = 9 zones; **60-min travel buffer**. Day/hour availability = one canonical model (`day-availability.ts`) — every read/write path uses its helpers (numeric + day-name formats both normalized; "no days set = NOT available").

## 8. Crons — 24 (mapped) ✅
- **payment-reminder** (5 min) — 2 stages, gated on unpaid, nudges client. **rating-prompt** (5 min) — one Q1 SMS 30+ min after checkout. **confirmation-reminder** — SMS confirm reminders (CONFIRM-reply intercept). **reminders** — client reminder + thank-you emails, admin pending/daily digests.
- **generate-recurring** — materializes recurring bookings (`generateScheduleDates`). **schedule-monitor** — per-cleaner works-day/hours sanity alerts. **late-check-in** — job reminder / late-check-in alerts. **post-job-followup**, **payment-followup-daily** (daily unpaid-completed follow-up).
- **retention** — dormant-client SMS win-back. **outreach** — SMS outreach. **sync-google-reviews**, **refresh-job-postings**, **sales-follow-ups**, **daily-summary**.
- **health/ops:** anthropic-health (credit/auth/rate-limit ping), health-check, health-monitor (system checks), comms-monitor (15 min, scans notifications for comms_fail), email-monitor (Zelle/Venmo IMAP heartbeat — RETIRED), phone-fixup (invalid cleaner phones → signed re-entry link), backup, cleanup-videos, comhub-email.

## 9. Recurring engine ✅ mapped — `recurring.ts`: `generateRecurringDates`, `generateScheduleDates`, `getRecurringDisplayName`. Weekly/biweekly/monthly; discounts (20%/10%) only after first visit; children generated by cron skip the self-book promo path.

## 10. Owner tools (tools.ts, 1,330 lines) ✅
`runTool(name, input, conversationId, phone, result)` — **the safety gate**: `create_booking`/`score_cleaners` owner-only; whitelists `CLIENT_TOOLS`/`SELF_TOOLS`/`CLIENT_LOCAL_TOOLS`; everything else rejected on non-owner phones. ~40 owner implementations: analytics (today_summary, revenue, outstanding, at_risk, search_messages, briefing), booking/client/cleaner/recurring/deal/notification/application CRUD, settings/service-types, assign_cleaner, send_message/broadcast, approve_refund/process_stripe_refund/mark_payment_received/mark_payout_paid, block_client/cleaner_dates, trigger_cron, skills CRUD, scheduling (score_cleaners/suggest_times/get_smart_suggestion).

## 11. Team app + money-loop coupling ✅ (`/api/team/[token]/check-in` + `check-out`)
Token-based (no login — signed `cleaner_token` per booking).
- **Check-in:** blocks future-date + double check-in. **GPS OFF** — records location if the phone sends it (`gps_disabled:true`), computes distance-to-address for display but does NOT enforce ("location unverified" allowed). Sets `status:in_progress`, `check_in_time`. → the 30-min alert keys off this.
- **Check-out:** computes **billed client hours (10-min grace) × rate × team_size** → `price` (cents); **cleaner_pay (15-min grace × `effectiveCleanerRate`)**; sets `status:completed`, `actual_hours`, `check_out_time`. Optional cleaner-reported payment (card/CashApp/ApplePay only — no Zelle/Venmo) funnels through **`processPayment`** (shared pipeline: mark paid + insert payment row + Stripe Connect transfer to cleaner + notify). Checkout without payment → loud admin warning. `processPayment` (payment-processor.ts) is the shared pay path used by BOTH check-out (cleaner-reported) and Stripe webhook (client self-pay).

## 12. Memory / skills / self-review ✅
- **`yinez_memory`** — per-client facts (preference/observation/issue/payment/instruction) + global lessons/rules (client_id NULL, auto-loaded every convo). Backfilled 1,174 rows from selena_memory.
- **`yinez_skills`** — Jeff-authored procedures (name/when_to_use/body/active/hit_count), active rows auto-load into the system prompt; Yinez calls `record_skill_use` after following one.
- **Self-review** (`conversation-scorer.ts`) — rule-based scorer + AI self-review (`selfReviewConversation`: brutally-honest 0-100 + improvements, saved to `yinez_memory` type `self_review`). Fires on SMS + web after `bookingCreated` (NOT admin/Telegram — Jeff isn't training data).
- **Telegram** — Jeff's private owner bot: terse, no warmth/emojis, `get_briefing` on vague opener; teaching → `remember`(lesson/rule) or `create_skill`; only-after-tool-ok confirmations.

---

# REVIEW COMPLETE — FL verified against ind build

## THE GAP (real, confirmed present on ind / missing on FL)
**Multi-address properties (`property_id`)** — ind resolves + attaches a property to each booking and threads it through 12 files; FL threads it through 8 and **does NOT** attach it on the core write paths:
- `api/client/book/route.ts` — no `resolveProperty` / `property_id` insert (+ no `booking_cleaners` extras, no `createPrimaryContact`)
- `api/bookings/route.ts`, `api/bookings/batch` — no property_id
- `lib/smart-schedule.ts` — doesn't take propertyId for per-property geocode
- `lib/attribution.ts`, Yinez `tools.ts` — no property_id
- **Effect:** a multi-address client's booking uses `client.address`, not the property they picked. This is the one that bites at cutover.

## NOT gaps — verified PRESENT + wired on FL (leave alone)
1. **$35 region cleaner-pay floor** — `cleaner-pay.ts` (REGION_PREMIUM_RATE=35, same zones), wired into webhook + checkout + 15-min alert + processPayment. *(Corrected — I wrongly called this missing mid-review.)*
2. **Stripe webhook** — Connect `transfers.create` + `payouts.create({instant})` + tip detection. ✅
3. **30-min alert** (`team-portal/15min-alert`) — $10 self-book promo, Stripe pay-link, `pre_payment_rating` ask. ✅
4. **Agent** (`src/lib/selena/`) — reads `yinez_memory` (per-client + global) + `yinez_skills` (auto-load), skills CRUD tools, self-review (`conversation-scorer.ts`). ✅
5. **processPayment** shared pipeline ✅ · **team check-in/out** (`team-portal/checkin`+`checkout`, `billing-hours` 10/15 grace) ✅ · **crons** 43 (superset of NYC Maid's 24) ✅
6. Booking pricing/emergency/$10-promo/holiday/duplicate/DNS/rate-limit, smart-schedule scoring, recurring generation — all match. Payment-at-completion (not at booking) is CORRECT.

## Still worth a line-level diff (not verified exhaustively)
- Agent **system prompt** text: does FL's Selena prompt carry the exact Yinez ruleset (escalation triggers, banned phrases, never-confirm-slot, context-over-priors)? Structure is ported; wording not diffed line-by-line.
- Which of the 24 NYC-Maid crons are actually in FL's 43 + scheduled for the nycmaid tenant.
