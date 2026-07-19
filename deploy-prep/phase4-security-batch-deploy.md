# PHASE 4 — SECURITY-FOCUSED BATCH DEPLOY, for Jeff (approve to execute)

> Author: leader session-10 · 2026-07-14 ~10:40 · Requested by consultant, authored per Jeff's standing gate authority.
> **Nothing here has been executed. All commits below are branch-local on p1-w1/w2/w3/w4 individually — none merged, none deployed.**

## PREREQUISITE — cannot skip

**None of sub-batches A-E can deploy independently.** Every fix lives on one of 4 separate worktree branches (p1-w1, p1-w2, p1-w3, p1-w4). Per the existing WAVE 1 process (`deploy-prep/gated-wave-plan.md`), a real deploy requires re-integrating those branches into one buildable tree first (fresh-merge p1-w4 → p1-w1 → p1-w3 → p1-w2, rebuild green, 3-way reconcile vs main) before any sub-batch below can actually ship. This session's ~28 new fixes are additional stranded commits on top of whatever WAVE 1 already covers — re-integration needs to happen once, current, not per sub-batch.

**Recommendation: re-integrate once, then cherry-pick sub-batches A→E in order off the re-integrated tree**, rather than 5 separate re-integration passes.

---

## Sub-batch A — True live-exploitability fixes for real customers
No dependencies on other sub-batches.
- Push notification identity spoofing (`/api/push/subscribe` + 2 follow-on `getCurrentTenant()` misuse sites: `clients/[id]/activity`, `team-availability`) — p1-w1, commits `27d19c54`, `c251dcf3`
- Document e-signature cross-document signer overwrite (`documents/[id]/fields`) — p1-w2, commit `5e0a508c`
- Portal/request stored-XSS to tenant admin inbox — p1-w2, commit `f1db43d0`

## Sub-batch B — Public unauthenticated booking form fixes
No dependencies on other sub-batches.
- Wrong-customer contact via foreign `client_id` on public booking form (`/api/client/book`) — p1-w2, ~10:07 report (exact commit not captured in channel, verify on branch before cherry-pick)
- ILIKE wildcard account-hijack-via-booking + 7 other exact-match sites (client/check, referrers, referrers/auth, pin-reset) — p1-w1, commit `4b940cd7`; plus W4's follow-on client/check + pin-reset instances — p1-w4, commits `c30d8410`, `62c8a358`

## Sub-batch C — Business-authz fixes (money/data-moving)
No dependencies on other sub-batches.
- payments/checkout + payments/link zero RBAC (live Stripe calls) — p1-w3, commit `4106abb7`
- team-members/[id]/stripe-status zero auth — p1-w4, ~09:58 report (commit not captured in channel, verify on branch)
- referrer OTP hijack-by-wildcard — p1-w1, part of commit `4b940cd7` (same commit as sub-batch B's wildcard fix — **note: B and C share a commit, cannot deploy independently, must go together**)
- referral-commissions zero RBAC (money-moving) — p1-w2, commit `5531a490`
- team-portal/15min-alert zero auth (unauthed SMS + live Stripe pay link trigger) — p1-w3, commit `bd6d4799`

## Sub-batch D — SMS bot cross-tenant/cross-client IDOR (both engines)
No dependencies on other sub-batches.
- New Selena engine (`selena/core.ts`, nycmaid only) — p1-w3, commit `9bf17de7`
- Legacy engine (`selena-legacy-handlers.ts`, every non-nycmaid tenant) — p1-w3, commit `bf96fe91`

## Sub-batch E — Admin auth (Item 1, CRITICAL, biggest structural change)
**NOT READY.** This is JEFF-MORNING-QUEUE.md's item 1 — legacy nycmaid admin auth has zero tenant binding at all. It still needs your decision on approach (tenant_id column+filter on admin_users vs. accelerating the Clerk cutover) before any lane can build the fix. Do not include in this deploy round; separate gate, separate timeline.

---

## Suggested sequence once re-integration is done
1. Re-integrate (once, covers all of A-D)
2. Rebuild green (full vitest + tsc, matching WAVE 1's gate)
3. Deploy A (isolated, no shared commits, lowest risk)
4. Deploy B+C together (they share commit `4b940cd7`)
5. Deploy D (SMS bot, customer-facing live surface — recommend a short monitoring window after, since this touches the live chatbot path)
6. E stays gated on your separate decision

## What I have NOT done
Not verified every commit hash against the actual current branch state (some were read from channel reports, not re-confirmed via `git log`). Not run a fresh full-suite build on any re-integrated tree. Not touched git in any way preparing this — this is a plan, not an action. Recommend a real `git log`/`git show` verification pass per commit before cherry-picking, same discipline as prior sessions' PR merges.
