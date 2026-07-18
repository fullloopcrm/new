# W2 gap/fluidity refresh — 2026-07-18 08:46

Leader's 08:33 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## Resolver lane — not re-swept

Confirmed dry 4+ consecutive rounds. Leader's prior orders explicitly say the resolver lane is fully done, no need to keep checking. No resolver-lane work this round.

## (1) New fresh-ground surface — a known, previously-flagged-not-fixed instance of the "unbounded caller array" class

The 08:31 gap doc's carried-forward list named a specific known gap that had been found but deliberately left untouched: `PUT/POST /api/documents/[id]/fields`' `body.fields` array and `label` string had no size cap, same class as the already-fixed `documents/public/[token]/sign` `field_values` (`35669d92`) and `sales-applications` `target_segments` (`d42fcaf7`) — flagged "admin-authenticated, `sales.edit`-gated — lower priority, not touched" rather than fixed blind.

Closed it this round: `PUT` now rejects (400) a `fields` array over 200 entries (matching the sibling sign route's cap); `label` (shared by `POST` + `PUT` via `normalizeField`) is capped at 5000 characters. Also hardened `body.fields` to an `Array.isArray()` guard instead of `|| []` — the old form let any non-array truthy value (a number, boolean, or plain object) reach a `for...of` and throw, degrading to a 500 instead of a clean 400; a non-array string specifically happened to still work by accident (iterating its characters each failed `signer_id required`). This was needed to safely check `.length` before the new cap, not a separate fix.

## (2) Continuation — swept for the same class elsewhere, found + fixed one more real instance

Grepped every other caller-supplied-array site (`Array.isArray(body.*)` / `body.* || []`) across `src/app/api` not covered by prior rounds. Most hits (`crews`, `bookings/[id]/team`, `jobs/[id]/sessions`, `routes`, `routes/[id]`) are `member_ids`/`assignee_ids`/`stops`-shaped arrays naturally bounded by a tenant's real roster/route size and already FK-validated downstream — not touched, no realistic abuse surface for a same-tenant staff actor.

One real hit: `normalizeLineItems` (`src/lib/quote.ts`) — shared by **4 call sites** (`quotes/route.ts`, `quotes/[id]/route.ts`, `invoices/route.ts`, `invoices/[id]/route.ts` via `lib/invoice.ts`'s re-export) — had no cap on the `line_items` array length or each item's `name`/`description` string length, and each item flows into the generated quote/invoice PDF and public accept page. Fixed at the shared helper (closes all 4 call sites in one place, same "fix the helper, not each caller" pattern this session has used repeatedly): truncated (not rejected, matching `prospects`' existing `cap()` truncate-not-reject convention for this kind of internal/semi-trusted field) to 500 items / 500-char name / 5000-char description.

Checked `quote-templates` (`line_items`/`tiers` stored raw, same shape) — authenticated `sales.edit` template CRUD, same lower-priority class as documents/fields; not touched this round given diminishing severity for staff-authenticated same-tenant surfaces already well down this session's priority list, flagged here for a future pass if this class gets revisited.

## (3) — gap/fluidity kept current

Carried-forward items unchanged from the 08:31 doc except the one closed above: `PATCH /api/admin/websites` destination-tenant-status judgment call, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bot status-gate question, `detect.ts` migration (prepared as file, awaiting Jeff's approval), ComHub nav-parity, tenant self-serve domain config, item-33 (3 bespoke tenants' cross-contaminated static domain lists).

New carried-forward item this round: `quote-templates`' `line_items`/`tiers` unbounded storage (same class, same authenticated/lower-priority shape as the now-fixed documents/fields gap) — not fixed, flagged for a future pass.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide), after each of the 2 fixes.
- 16 new tests: 11 in `documents/[id]/fields/route.witness.test.ts` (4 new LOCK cases + array/label boundary controls, existing 7 FK-injection cases untouched) + 5 in new `src/lib/quote.line-items-cap.test.ts` (3 LOCK + 2 CONTROL).
- RED/GREEN confirmed for both commits via `git diff > patch && git apply -R patch` (git stash disabled in this worktree — shared `.git` dir across worker worktrees, blocked by the PreToolUse hook as in prior rounds).
- Full repo suite after both fixes: 765 files, 3297/3335 tests passed (37 skipped), 1 pre-existing failure (`cron/payment-followup-daily/route.test.ts`'s CRON_SECRET auth test — same test-harness mock gap documented in the last several rounds' gap docs, zero diff on that file this round).

File-only, no push/deploy/DB write from this worker. 2 code commits this round (`0566154c`: documents/[id]/fields cap, `3ed4811c`: normalizeLineItems cap) + this docs commit.
