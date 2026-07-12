# Correction — the owner_phone backfill "premise" in the Q3 readiness index was wrong

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — a correction note. Nothing pushed, deployed, or run against any DB. This note supersedes the owner_phone rows in [`Q3-readiness-index.md`](./Q3-readiness-index.md); those rows are being patched to point here.

---

## TL;DR

The Q3 readiness index asserted, as its central owner_phone claim, that the
**backfill file "does not exist yet — biggest DB-side gap / the single hardest
DB-side blocker for Wave C."** **That premise is false.** The backfill and its
fail-loud verify gate already existed **in this same worktree, in the same commit
that made the claim.** The index inherited a stale "file TBD" marker from
`BATCH-REVIEW-MANIFEST.md` and never checked it against `platform/migrations/`.
Two secondary claims in the index were also imprecise (blast radius and scope) —
corrected below.

---

## 1. The primary wrong premise: "the file does not exist yet"

The index (`Q3-readiness-index.md`, §A row 5, Wave C, the Collisions section, and
the one-line status) states the owner_phone backfill is `file TBD` / "does not
exist yet" / "still absent here" / "biggest DB-side gap."

It exists. It has existed since **the day before** the index was written:

| Artifact | Path | Created |
|---|---|---|
| Backfill | `platform/migrations/2026_07_11_owner_phone_backfill.sql` | commit `9fccb574`, 2026-07-11 **16:52** (expanded `4b84eae5`, 17:29) |
| Fail-loud verify gate | `platform/migrations/2026_07_11_owner_phone_backfill.verify.sql` | commit `e0868d6a`, 2026-07-12 **11:10** |
| Q3 readiness index (made the false claim) | `deploy-prep/Q3-readiness-index.md` | commit `5f04d171`, 2026-07-12 **12:20** |

`git ls-tree 5f04d171 platform/migrations/` lists **both** files. The index
claimed a missing artifact that was present in its own commit, authored ~19 hours
(backfill) and ~70 minutes (verify gate) earlier.

### Why it was wrong (root cause, not just the fact)

Assumption-stacking. The index's *source of truth* line credits
`BATCH-REVIEW-MANIFEST.md` for sequencing, and the manifest still carried the old
`owner_phone backfill … file TBD` marker from before the file was authored. The
index copied that marker forward and built "**biggest DB-side blocker**" on top of
it **without running the one check that would have refuted it** — a `ls`/grep of
`platform/migrations/` in the very worktree it was describing. An unverified base
("file TBD") propagated into a headline conclusion ("hardest blocker for Wave C").

The manifest describes cross-branch work W1 cannot see; W1 correctly flagged
*those* rows `⧉ cross-branch (unverified here)`. The mistake was applying the same
blind trust to an artifact that lives **inside W1's own lane and worktree**, where
it is directly verifiable and should never have been marked "absent."

---

## 2. What actually exists (so the index rows can be replaced with the truth)

- **Backfill** (`…owner_phone_backfill.sql`): idempotent, transactional. Fills
  `tenants.owner_phone` only where currently NULL/blank, from three derived sources
  in trust order — (2) `tenant_members(role='owner').phone`, (3) the converted
  lead's phone (`leads.converted_tenant_id`), (4) `tenants.phone`. Never overwrites
  an existing value; excludes the flagship (nycmaid UUID + slug). Deliberately
  excludes `telnyx_phone`/`sms_number` (outbound system numbers) and
  `apple_cash_phone` (a false-positive owner grant = privilege escalation).
- **Blocking list**: the backfill's final `SELECT` emits every tenant with **no
  derivable phone** — the residual set a human must populate. That residual set —
  not "the missing file" — is the actual, and **bounded**, Wave C risk.
- **Verify gate** (`…verify.sql`): read-only, `RAISE EXCEPTION` (nonzero exit) if
  **any `status='active'`, non-flagship** tenant still has NULL/blank owner_phone.
  This is the Part-0 precondition — it mechanically blocks the booking-owner deploy
  rather than leaving "run the backfill first" as a hope. Suspended/cancelled
  tenants are reported, not fatal.

Net: the DB-side owner_phone work is **prepared and self-gating**, not missing. The
only open item is operational — populate the blocking-list residual (owners with no
phone anywhere in the data), which no SQL can invent.

---

## 3. Secondary imprecisions in the index (corrected)

These do not change the deploy order but were stated too strongly:

**(a) "non-nycmaid owners lose _admin tooling_ (fail-closed)."** Overstated blast
radius. The fail-closed gate in `017043fa` is `isOwnerOfTenant()` in
`platform/src/lib/selena/agent.ts`, consulted in exactly two places: the
`loadContext` owner hint and the `runTool` owner-only-tool gate
(`selena/tools.ts`). That gate governs the **Selena/Yinez conversational agent's
owner-only tools over SMS/voice** — not the web admin dashboard. `/admin/*` and
`/dashboard/*` authenticate by login/session, **not** by matching
`tenants.owner_phone`. Correct statement: a NULL owner_phone means the owner is not
recognized *by the SMS/voice assistant* and owner-only **agent** tools refuse — a
real degradation, but not a dashboard lockout.

**(b) "Populate owner_phone for _every_ non-nycmaid tenant."** Wrong scope. Only
tenants whose owner_phone is currently NULL/blank are affected; tenants created via
the normal lead→tenant path already carry it
(`create-tenant-from-lead.ts:157`). The backfill fills most of the rest from the
three sources above. The true remaining scope is **only the blocking-list residual**
(active tenants with no phone in any source), which the verify gate enumerates and
fails on.

**(c) The consequence premise itself is _correct_.** To be precise about what was
NOT wrong: the fail-closed behavior (NULL owner_phone → that tenant's owner is
locked out of owner-only agent tooling; ordering the backfill before the
booking-owner deploy) is accurate and confirmed by both `017043fa` and the
backfill/verify headers. The error was the *artifact-existence* premise and the
*blast-radius/scope* wording — not the direction of the dependency.

---

## 4. Corrected Q3-index rows (what those rows should now say)

- §A pre-wave, row 5 (owner_phone backfill): change `⚠️ file TBD … biggest DB-side
  gap` → **✅ present** (`2026_07_11_owner_phone_backfill.sql` + `.verify.sql`,
  p1-w1). Remaining risk = the **blocking-list residual**, gated fail-loud by
  `…verify.sql`; still 🔒 (Jeff runs the DB write) and still ordered **before**
  the booking-owner deploy `017043fa`.
- Wave C "Prereq DB writes" and "Missing / open": drop "backfill file does not
  exist yet (hard blocker)"; replace with "backfill + verify gate present; the
  Part-0 verify gate must pass (zero active-tenant NULLs) before `017043fa`."
  Reword "lose admin tooling" → "lose owner-only **conversational-agent** tooling."
- Collisions/staleness section, owner_phone bullet: remove "still absent here — the
  single hardest DB-side blocker"; replace with "present; the residual blocking
  list is the bounded open item."
- One-line status: owner_phone is no longer a "real gap … file"; the residual
  blocking-list population is the only open owner_phone item.

*(These edits are being applied to `Q3-readiness-index.md` alongside this note so
the index stops asserting a refuted claim; this note is the authoritative
rationale.)*

---

## 5. Process takeaway

Trust the manifest for what lives on **other** branches; verify **your own lane's**
artifacts against the worktree before calling them missing. One `ls
platform/migrations/` would have prevented a headline "biggest DB-side blocker" that
was contradicted by a file in the same commit.
