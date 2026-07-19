# Handoff — Communications Gate + Job/Booking Forms (2026-07-16)

## State: merged to main, deployed to production (commit `00e479a9`)

## What's done and verified live
- **Comms gate**: `isCommEnabled()` wired into ~15 previously-ungated lead/booking/job send paths across all 22 active tenants. Verified via `scripts/verify-comms-gate.ts` (396 checks) — no regressions, nothing silently disabled.
- **Job application photo upload** — fixed/added and confirmed live for: we-pay-you-junk, mobile salon, theroadsidehelper, nycroadsideemergencyassistance, nyc-tow, the-home-services-company, the-nyc-exterminator, sunnyside-clean-nyc (new careers page).
- **Booking/lead gaps filled** per business-type audit: landscaping-in-nyc (new BookingForm), the-nyc-interior-designer/fla-dumpster-rentals/stretch-ny/stretch-service (added real date/time field to existing lead forms — they only had loose "timeline" dropdowns before).
- `toll-trucks-near-me` has code but **no tenant row in the DB** — not provisioned, can't be tested or used regardless of code state.

## Not yet done / open items
1. **`emailAdmins()` silent-failure bug** (`src/lib/admin-contacts.ts` ~line 129) — the primary send path uses `Promise.allSettled()` with no rejection handling, and unconditionally logs `email_logs.status = 'sent'` even when the send actually failed. Found, not fixed — user said "stop asking me to fix bugs," so left alone pending explicit instruction.
2. **Registry default mismatches** in `webhooks/stripe` and `cron/post-job-followup` — `payment_receipt`/`review_request` SMS defaults are `false` in `comms-registry.ts` but those routes send unconditionally today. Gating them as-is would silently kill live messages. Needs a deliberate default fix first, not a silent change.
3. **No actual inbox verification** — every check this session confirmed DB rows / `email_logs` / HTTP 200s, never a real email landing in a real inbox. Given finding #1, `email_logs` alone isn't fully trustworthy.
4. **Two duplicate crons** — `cron/payment-reminder` and `cron/payment-followup-daily` look like they may be redundant; never resolved, just both gated.
5. Scripts `scripts/verify-comms-gate.ts` and `scripts/check-admin-reachability.ts` are still in the repo — reusable diagnostics, user said keep them.

## Environment gotcha hit twice this session
This repo has ~35 active parallel worktrees (`~/flwork-*`, `~/fullloopcrm/scratchpad/*`) all pushing to `main` concurrently. `main` branch is usually checked out by another worktree, so you can't `git checkout main` directly — use `git worktree add /tmp/<name> origin/main`, merge there, `git push origin <tempbranch>:main`, then remove the worktree. Also: `vercel --prod` deploys whatever is in the **local filesystem**, not git history — always `git checkout <merged-commit-sha> -- .` first or you'll ship stale code (this bit me once this session).

## Git
- Branch: `fix/comms-gate-and-photo-upload` (all work), now merged into `main` at `00e479a9`.
- Production deployment: `https://fullloopcrm-a8z1131zo-fullloopcrms-projects.vercel.app`, aliased to all live domains.
