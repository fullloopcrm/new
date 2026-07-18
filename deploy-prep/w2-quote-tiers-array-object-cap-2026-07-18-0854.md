# W2 gap/fluidity refresh — 2026-07-18 08:54

Leader's 08:47 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## Resolver lane — not re-swept

Confirmed dry many consecutive rounds. Leader's prior orders say the resolver lane is fully done, no need to keep checking. No resolver-lane work this round.

## (1) New fresh-ground surface — quote/quote-template `tiers` field bypassed the prior round's fix entirely

Last round's `normalizeLineItems` fix (`3ed4811c`) capped `line_items` on all 4 quote/invoice call sites, but missed its sibling field `tiers` — `quotes/route.ts` POST, `quotes/[id]/route.ts` PATCH, and `quote-templates/route.ts` POST all stored `body.tiers` raw (`tiers: body.tiers || null`) with zero cap on label/note string length, and — worse — each tier's own `line_items` array (the `QuoteTier` shape is `{ label, line_items, subtotal_cents, note? }`) never went through `normalizeLineItems` at all, so the exact same unbounded-array/unbounded-string class survived one level down inside an object the first fix didn't touch. `quotes/public/[token]/route.ts` serves `quote.tiers` straight to the public unauthenticated quote page, same reach as `line_items`.

Fixed with a new `normalizeTiers()` in `src/lib/quote.ts`: caps `label` to 200 chars, `note` to 2000 chars, reuses `normalizeLineItems` for each tier's `line_items`, and drops any key outside `good`/`better`/`best`. Truncate-not-reject, matching `normalizeLineItems`' own convention (same file, same session).

## (2) Continuation — closed in the same commit, not a separate pass

All 3 call sites affected by this same gap (`quotes/route.ts`, `quotes/[id]/route.ts`, `quote-templates/route.ts`) were fixed together rather than one-then-sweep, since the fix is a single shared helper and I already knew all 3 sites from tracing `tiers` usage before writing the fix. Also closed `quote-templates`' `line_items` gap in the same commit — this was the explicitly named carried-forward item from the 08:46 doc ("flagged for a future pass"), and since I already had `normalizeLineItems` imported into that file for the `tiers` fix, closing it took one line.

Checked one more candidate for the same class outside the quotes/invoices domain: `finance/periods/route.ts` POST and `finance/periods/[id]/route.ts` PATCH store `body.checklist` raw with no shape/size cap. Not fixed this round — `finance.expenses`-gated (owner/admin/manager only), `accounting_periods` rows are never rendered on any public page, same lower-priority "authenticated same-tenant staff actor" class this session has consistently deprioritized behind public-reachable gaps. Flagged here as a carried-forward candidate, not touched.

## (3) — gap/fluidity kept current

Carried-forward items unchanged from the 08:46 doc except the two closed above (`quote-templates` line_items, and now tiers everywhere): `PATCH /api/admin/websites` destination-tenant-status judgment call, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bot status-gate question, `detect.ts` migration (prepared as file, awaiting Jeff's approval), ComHub nav-parity, tenant self-serve domain config, item-33 (3 bespoke tenants' cross-contaminated static domain lists).

New carried-forward item this round: `finance/periods` `checklist` unbounded raw storage (same class, same authenticated/lower-priority shape) — not fixed, flagged for a future pass.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- 8 new unit tests (5 LOCK + 3 CONTROL) in new `src/lib/quote.tiers-cap.test.ts`.
- Updated the `@/lib/quote` mock in `quotes/route.witness.test.ts` to include `normalizeTiers` — its existing CONTROL test failed with "No normalizeTiers export" until fixed (expected: the mock enumerates every export by hand).
- RED/GREEN confirmed via `git diff src/lib/quote.ts > patch && git apply -R patch` (all 8 new tests failed with `normalizeTiers is not a function`), then `git apply patch` restored GREEN (`git stash` disabled in this worktree — shared `.git` dir across worker worktrees, blocked by the PreToolUse hook as in prior rounds).
- Full repo suite: 766 files, 3305/3343 tests passed (37 skipped), 1 pre-existing failure (`cron/payment-followup-daily/route.test.ts`'s CRON_SECRET auth test — same test-harness mock gap documented in the last several rounds' gap docs, zero diff on that file this round).

File-only, no push/deploy/DB write from this worker. 1 code commit this round (`992fe7dd`: tiers + quote-templates line_items cap) + this docs commit.
