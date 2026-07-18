# W2 gap/fluidity refresh — 2026-07-18 09:05

Leader's 08:55 order: fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## Resolver lane — not re-swept

Confirmed dry many consecutive rounds. Leader's prior orders say the resolver lane is fully done, no need to keep checking. No resolver-lane work this round.

## (1) New fresh-ground surface — finance/periods `checklist` stored raw with no cap

This was the explicit carried-forward candidate flagged in the 08:54 doc: `finance/periods/route.ts` POST and `finance/periods/[id]/route.ts` PATCH stored `body.checklist` raw (`body.checklist || {}` / `updates.checklist = body.checklist`) straight into `accounting_periods.checklist`, a JSONB column, with zero cap on key count, key length, or value type. The frontend (`dashboard/finance/close/page.tsx`) only ever toggles one of 6 known boolean keys, but the API itself enforced no shape.

Fixed with a new `normalizeChecklist()` in `src/lib/validate.ts`: caps at 50 keys, drops any key longer than 100 chars, coerces every surviving value to boolean. Truncate-not-reject, matching this lane's established `normalizeLineItems`/`normalizeTiers` convention.

## (2) Continuation — swept the same "unbounded array/object into a JSONB-ish column" class into the legacy `/api/cleaners` shim

Traced this class one level further: the modern `team/route.ts` POST already whitelists fields via `validate()`'s schema (mass-assignment protected, doesn't even accept `schedule`/`unavailable_dates`/`service_zones` at creation). But the legacy nycmaid-compat shim `/api/cleaners` (POST) and `/api/cleaners/[id]` (PUT) — still live, `team.create`/`team.edit`-gated, backing `team_members` directly — had the identical gap on 4 fields:

- `working_days` (string array) and `unavailable_dates` (string array) — unbounded length, unbounded per-item string size.
- `service_zones` (string array) — same.
- `schedule` (free-form object, keyed by day index/name with `{start,end}` values, consumed later by `normalizeWorkingHours` in `day-availability.ts`) — unbounded key count and size.

Added two new helpers to `validate.ts`:
- `capStringArray(raw, maxItems, maxItemLength)` — drops non-string items, truncates overflow items/strings. Applied to `working_days` (14/20), `unavailable_dates` (500/10), `service_zones` (200/50).
- `capJsonObject(raw, maxKeys, maxSerializedLength)` — rejects (returns `{}`) an object past a key-count or serialized-size ceiling rather than attempting a partial truncation of arbitrary `{start,end}` nesting. Applied to `schedule` (20 keys / 2000 chars).

Also hardened PUT's `unavailable_dates` handling while touching the same lines: the prior code did `(body.unavailable_dates || []).filter(...)` — a non-array truthy value (e.g. an object) would have thrown inside `.filter()` and surfaced as an unhandled 500 instead of failing closed to an empty list. Now guarded with `Array.isArray()` first, matching the same hardening pattern applied to `documents/public/[token]/sign` two rounds ago.

PUT's undefined-passthrough semantics (only touch `schedule`/`service_zones` when the caller actually sent them) are preserved — the cap only applies when the field is present, not injected as a default on partial updates.

## (3) — gap/fluidity kept current

Carried-forward items unchanged from the 08:54 doc, minus the now-closed `finance/periods checklist` item: `PATCH /api/admin/websites` destination-tenant-status judgment call, seo-* verify-revert/alerts/health judgment calls, backup-cron retention question, owner/admin Telegram bot status-gate question, `detect.ts` migration (prepared as file, awaiting Jeff's approval), ComHub nav-parity, tenant self-serve domain config, item-33 (3 bespoke tenants' cross-contaminated static domain lists).

No new carried-forward item this round — both fields in scope for this class (`/api/cleaners` create + update) were closed in the same commit.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- 17 new unit tests in `src/lib/validate.test.ts` (3 new `describe` blocks: `normalizeChecklist`, `capStringArray`, `capJsonObject` — LOCK + CONTROL each).
- RED/GREEN confirmed: `git diff src/lib/validate.ts > patch && git apply -R patch` (14 of the 17 new tests failed with "is not a function" — the other 3 exercised only pre-existing `validate`/`pick` behavior and correctly stayed green), then `git apply patch` restored GREEN (32/32 in that file).
- Full repo suite: 766 files, 3320/3357 tests passed (37 skipped), **0 failures** — the CRON_SECRET test-harness mock gap flagged in the last several rounds' docs (`cron/payment-followup-daily/route.test.ts`) did not reproduce this run; not touched by this round's diff either way.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (`f76e4491`: checklist + cleaners array/object caps, 6 files) + this docs commit.
