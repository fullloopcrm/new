# Merge-Conflict Dry-Run: p1-w1 → main

**Author:** W4 (verification-harness lane, running the fleet-wide refresh
per LEADER order 16:34) · **Date:** 2026-07-13 16:38 EDT
**Note:** No conflict-risk report existed for p1-w1 vs main before this pass —
this is the first one. p1-w6's cross-lane audit (`cross-lane-merge-conflict-audit.md`)
covered w1-vs-other-lanes pairwise conflicts but not w1-vs-main directly.
**Method:** `git merge-tree --write-tree origin/main origin/p1-w1` (git 2.39
real merge-ort simulation). Read-only — no ref updated, no working tree
touched, nothing merged/pushed.
**Merge base:** `2cca5daa0fe953b8be89b541ff7e7488c4bb4a14`
**origin/main HEAD:** `6a052a58` · **p1-w1 vs merge-base:** 340 files changed ·
**origin/main vs merge-base:** 81 files changed · **files touched by both
sides:** 5 · **real conflicts:** 3

## Result: 3 files conflict

### 1. `platform/src/app/api/team-portal/auth/route.ts` — same root cause as w4/w2

**Why:** Same PIN-enumeration rate-limit bug three lanes independently
touched (see `conflict-risk-p1-w4.md` for the full writeup). `origin/main`
deletes the vulnerable pre-lookup rate-limit call and replaces it with a
post-failure dual-bucket check. `p1-w1`'s only change here is adding
`{ failClosed: true }` to the *same vulnerable pre-lookup call*
(`team_portal_auth:${tenant_slug}:${pin}` — still keyed on the PIN itself, so
it does **not** fix the enumeration bypass, just makes the rate-limiter itself
fail closed on Redis/DB errors).

**Suggested resolution:** take `origin/main`'s version. Unlike w4, p1-w1's
side isn't even a competing fix for the enumeration bug — it's an orthogonal
hardening (`failClosed`) bolted onto the code main is deleting. Confirm
`rateLimitDb`'s `failClosed` option (if still relevant) gets applied to
main's replacement post-failure buckets instead, since that's a real
improvement worth keeping if `main`'s version doesn't already fail closed.

### 2. `platform/src/lib/escape-html.ts` — added in both, different scope

**Why:** Both sides created this file from scratch, independently, with
different implementations of `escapeHtml`:
- `origin/main`'s version (from the admin-notification-email XSS fix):
  simple char-map replace, includes a doc comment describing use for
  admin-notification email bodies.
- `p1-w1`'s version: same behavior, different implementation (chained
  `.replace()` calls) and a broader doc comment describing general
  text/attribute-context use, explicitly scoped to text/attribute contexts
  (not URL/script/JS contexts).

Functionally equivalent (both escape `& < > " '` the same way), so this is a
**cosmetic add/add conflict, not a logic conflict** — unlike the w3 version of
this same file, which adds extra functions (`safeUrl`, `safeJsonLd`) main
doesn't have.

**Suggested resolution:** if integrating w1 alongside w3 (which also touches
this file — see `conflict-risk-p1-w3.md`), take w3's version since it's a
strict superset covering the extra sinks. If integrating w1 alone, either
version works; prefer main's (fewer moving parts, already reviewed on main).

### 3. `platform/src/app/site/consortium-nyc/_lib/schema.tsx` — real conflict, main deleted a function p1-w1 still has

**Why:** `origin/main` removed a fabricated `aggregateRatingSchema()` function
(a "CRITICAL-1" fix per p1-w3's own commit history: self-serving/fabricated
AggregateRating structured-data markup with no real review source — an SEO/
legal-risk issue, not just code cleanup). `p1-w1` never picked up that
removal and still defines the function.

**Suggested resolution:** take `origin/main`'s side (the deletion). This
isn't a stylistic call — shipping fabricated review-aggregate schema is the
kind of thing that draws Google manual-action penalties or FTC scrutiny for
deceptive advertising. Verify nothing on `p1-w1`'s side still calls
`aggregateRatingSchema()` elsewhere before dropping it (a quick grep away).

## Non-conflicting overlap

2 more files are touched by both branches but merge cleanly (no manual
resolution needed): `platform/src/app/api/webhooks/stripe/route.ts` and
`platform/src/lib/payment-processor.ts`. Worth a post-merge sanity test run
on payments regardless, since both are payment-critical paths, but git's
auto-merge here is non-overlapping hunks, not a guess.

## Net assessment

All 3 conflicts resolve the same direction: **take `origin/main`'s side** in
every case. None require picking p1-w1's logic. This lane is low-risk to
integrate — the conflicts exist because main moved faster on the same three
issues (PIN rate-limit, HTML escaping, fabricated schema) that p1-w1 also
touched earlier and less completely.
