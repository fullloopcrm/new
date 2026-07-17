# W2 gap/fluidity refresh — 2026-07-17 03:48

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-calendar-availability-terminated-crew-guard-2026-07-17-0327.md`.

## Pivot, per leader order 03:32: terminated-crew sweep declared exhausted last round — fresh bug class this round

Last round's NOTICED #6 confirmed the terminated-crew hunt looked exhausted across scheduling/notification write-paths, and the leader's 03:32 order explicitly called for a genuinely different bug class or subsystem this round rather than squeezing more out of a dry thread. Also distinct from the other major exhausted thread this branch already ran (the RBAC missing-`requirePermission` hunt, P1–P90 in `cross-tenant-leak-register.md`, last active 2026-07-16 09:44). Picked a third, unrelated subsystem: the GDPR/CCPA right-to-be-forgotten purge workflow (`src/lib/gdpr-deletion.ts`), itself only ~3 days old in this repo.

## Fresh ground (real bug) — GDPR purge's own anonymize set was incomplete on two tables

`purgeDueDeletions()` → `purgeOne()` anonymizes `clients`, `client_sms_messages`, and `invoices` on any due right-to-be-forgotten request. It never touched two sibling tables that carry the exact same class of denormalized client PII:

1. **`client_contacts`** — not a display-only miss. This table is the *actual* fan-out source every outbound client SMS/email send reads: `getClientContacts()` in `src/lib/nycmaid/client-contacts.ts` (13 call sites tenant-wide via `sendClientSMS`/`sendClientEmail`) checks `client_contacts.receives_sms`/`receives_email` + `phone_e164`/`email`, not anything on the `clients` row itself beyond the account-level `do_not_service` gate. A client who completed the 30-day erasure flow kept their secondary contacts' real name/phone/email sitting in this table forever, readable via `GET /api/clients/[id]/contacts`, **and** kept receiving SMS/email indefinitely from any future booking/notification event — the purge's entire purpose (erase PII, stop contact) was silently defeated for anyone with a contact row, since neither the PII columns nor the channel-opt flags were ever touched.
2. **`quotes`** — found while scoping the fix, same investigation: `quotes.contact_name/contact_email/contact_phone/service_address` is the identical denormalized contact-snapshot shape `invoices` already carries (and `invoices` was already correctly anonymized) — `quotes` was the one sibling table with the same shape that never got the same treatment.

**Fixed**: `purgeOne()` now also:
- redacts `client_contacts` (name → `'Deleted User'`, `phone_e164` → `null`, `email` → a placeholder, since the table's own `contact_has_channel` CHECK constraint requires phone_e164 OR email non-null) and forces `receives_sms`/`receives_email` off, so the channel gate excludes the contact regardless of field content going forward;
- redacts `quotes.contact_name/contact_email/contact_phone/service_address` to `null`, mirroring the existing `invoices` treatment exactly (money fields — `total_cents` etc. — untouched, same "row not deleted, only PII overwritten" invariant every other table in this purge already follows).

2 new commits' worth of regression lock in `gdpr-deletion.test.ts` (extends the existing `purgeDueDeletions` test with BLOCKED assertions on both tables + a not-due CONTROL on each, plus a dedicated wrong-tenant probe for `client_contacts`). Mutation-verified via `git apply -R`/`git apply` (fixed file reverted → the new assertions went RED for the exact right reason — `expected 'Alice A' to be 'Deleted User'` / `expected 'Alice A' to be null` — restored, all green). `npx tsc --noEmit` clean. Full suite: 516/516 files, 2286/2323 passed + 37 skipped (up from 2285/2322 last round — exactly +1 net test file count unchanged, assertions added to the existing purge test plus one new wrong-tenant `it`), no regressions.

No DB migration needed — both fixes use columns that already exist (`client_contacts` and `quotes` were both created by pre-existing migrations; nothing new to apply).

## Archetype depth — GDPR purge anonymize-set guard on client_contacts + quotes

Extended `sim-all-trades.ts` with a new section 5a-17 (after 5a-16, same archetype block, first archetype coverage of a bug class outside terminated-crew/consent/RBAC). Calls the real `requestDeletion`/`purgeDueDeletions` functions directly against a real throwaway client + `client_contacts` row + `quotes` row created in this archetype tenant — no route call needed, since neither function depends on request/header context. Asserts the due request's contact/quote get redacted (money total preserved on the quote) and a second, not-due CONTROL client's contact survives the same sweep untouched.

**Not yet executed**: leader-run-only (touches live prod Supabase). Verified statically: `tsc --noEmit` clean project-wide.

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call, still open.
2. Carried forward, unchanged: retroactive-repair-of-already-drifted-`monthly_date`-prod-data question (gap #19's NOTICED) — needs a live-DB audit, not guessed at.
3. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) is still open — staying with Jeff per the leader's explicit instruction.
4. Carried forward, unchanged: the client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic).
5. Carried forward, unchanged: calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member (display-layer gap, see UX-FRICTION #5 below).
6. **New this round**: `document_signers` (the e-signature feature's signer table — name/email/phone/`signature_png`/`signature_name`, keyed by `document_id` only, no `client_id` FK) is also outside the GDPR purge's reach. Deliberately NOT added to the fix alongside client_contacts/quotes — this one is a materially different question: (a) there's no direct `client_id` column to join on (would need an email/phone match against the client being purged, which is fuzzier and could mis-match), and (b) signed legal agreements/consent records are the kind of thing many jurisdictions' erasure exemptions specifically carve out for retention (contract evidence, audit trail) — anonymizing a signature record after the fact could itself be a compliance problem, not a fix. Needs Jeff's call on whether/how this should ever be touched by right-to-be-forgotten, not a unilateral build.
7. **New this round**: the terminated-crew hunt (item 3 above) and the RBAC missing-`requirePermission` hunt (P1–P90, `cross-tenant-leak-register.md`) are both confirmed still dry as of this round's pivot — no new instances of either surfaced despite this round's investigation touching adjacent code. This round's fresh ground came from a third subsystem entirely (GDPR purge), per the leader's explicit steer.

## MISSING-FEATURE GAPS (carried forward, unchanged)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — fully closed (prior rounds).
6. `GET /api/finance/payroll-prep`'s `?year=YYYY` 1099 mode is dead code (no frontend caller) and undercounts if invoked. Not fixed — product decision needed.
7. `job_payments.invoice_id` exists but nothing sets/reads it — Job detail page's "$X collected" is fully disconnected from the real invoice/payment/ledger rail. Not fixed — feature decision needed.
8. `recurring_expenses` has no manual "run now" / catch-up mechanism for missed periods — still open, deliberately not building it.
9. `GET /api/finance/payroll-prep` structurally blind to `payroll_payments` — HIGH priority (compliance-adjacent). Flagged to Jeff alongside #10.
10. No working UI writer for `payroll_payments` anywhere in the product — flagged to Jeff at the same priority as #9.
11. ~~No scheduling-conflict guard~~ — RETRACTED (real DB trigger already blocks it).
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (all callers).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call.
14. ~~`service_type` free-text field may be silently unset/stale~~ — CLOSED (prior round).
15. ~~`recurring_type` free-text field may go stale~~ — VERIFIED NON-ISSUE (prior round).
16. ~~Mass-SMS find-cleaner broadcast had no HR-termination check~~ — CLOSED (prior round).
17. ~~`bookings/broadcast`'s mass SMS/email had no HR-termination check~~ — CLOSED (prior round).
18. `POST /api/reviews/request` has no SMS-consent check — open, product call needed.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted~~ — CLOSED (prior round). Retroactive-repair question still open — see NOTICED #2.
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call.
21. **New this round**: GDPR erasure requests do not (and per NOTICED #6, arguably should not without a policy call) reach `document_signers` — a purged client's signed-document signer rows (name/email/phone/signature) survive indefinitely with no `client_id` join path to even find them by. Needs Jeff's call on scope before any code gets written.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member — same root cause and "flag, don't fix without Jeff's call" treatment as item #4 above and gap #20.

File-only, no push/deploy/DB. All 5 commits this round (2× `fix`, `test`, 2× `test(sim)` — client_contacts then the quotes extension) local to this worktree.
