# Telnyx 401 root cause — 2026-07-07 cutover attempt

**Status: already root-caused and written up by W6 — this file is a pointer + independent
verification, not a duplicate investigation.** W6 committed the full analysis at 10:44am
today (commit `7f535968` on branch `p1-w6`, file `deploy-prep/PARITY-REPORT.md` §"W6 —
INTEGRATIONS/WEBHOOKS + 3 FLAGGED DRIFTS + TELNYX-401 ROOT-CAUSE"), 10 minutes before this
task was assigned to W3 at 10:54am. That commit is not yet merged into `p1-w3` — different
worker branch — which is presumably why the task was dispatched again.

## What I independently checked before writing this (did not just trust the commit message)

1. Read nycmaid's actual signature-verify code (`~/Desktop/nycmaid/src/app/api/webhook/telnyx/route.ts:21-31`, read-only): it checks that `telnyx-signature-ed25519` / `telnyx-timestamp` headers are *present* and the timestamp isn't stale — **it never cryptographically verifies the signature against a public key at all**. So "port nycmaid's behavior" doesn't apply here; nycmaid's real behavior is *no crypto check*, which is why it never 401'd in production — not because it's more correct.
2. Read FL's `verifyTelnyx()` (`platform/src/lib/webhook-verify.ts:77-115`): reads `request.text()` for raw bytes before any JSON parsing in the route (`platform/src/app/api/webhooks/telnyx/route.ts:15`), signs `${timestamp}|${rawBody}`, correctly DER-wraps the raw 32-byte Ed25519 public key into SPKI, verifies with `crypto.verify(null, ...)`. This matches Telnyx's own signing scheme — rawBody handling and header names are correct, not the bug.
3. Ran the test suite in the `p1-w6` worktree (where W6's added "WITNESS" test lives): `npx vitest run src/lib/webhook-verify.test.ts` → **10/10 passing**, `npx tsc --noEmit` → clean. In my own `p1-w3` worktree (pre-merge, without W6's added test) the pre-existing 9 tests also pass.

Both checks confirm W6's conclusion holds.

## Root cause (per W6, verified above)

Not a bug in `verifyTelnyx()`'s crypto — it was checked byte-for-byte against Telnyx's own
official SDK reference and is correct. The defect is **architectural**: `TELNYX_PUBLIC_KEY`
is a single **global** env var, but Telnyx signing keys are per-**account**, and
`tenant.telnyx_api_key` / `tenant.telnyx_phone` are already **per-tenant** columns (nycmaid
runs its own separate Telnyx account, predating FL). If the global env var holds any account's
key other than nycmaid's, every genuinely valid, untampered, correctly-timed request from
nycmaid's real account 401s indistinguishably from a forged one. W6's new witness test
reproduces exactly this: a validly-signed, untampered payload verified against a different
(but equally valid) public key reproduces the same `signature mismatch` 401 seen on 2026-07-07.

W6 flags the identical global-secret-vs-per-tenant-account shape as latent risk in the Resend
inbound webhook (`RESEND_WEBHOOK_SECRET`) and the Stripe tenant webhook (`STRIPE_WEBHOOK_SECRET`)
— untested against nycmaid traffic since neither has been repointed yet.

## Remediation options (W6's proposal, not applied — judgment call for Jeff/leader)

1. Re-fetch and re-paste nycmaid's own `/v2/public_key` value (via nycmaid's own
   `tenant.telnyx_api_key` credential) into `TELNYX_PUBLIC_KEY`, byte-exact, no whitespace —
   cheapest, but only fixes nycmaid and re-breaks if another tenant needs the global slot.
2. Add a nullable per-tenant `telnyx_public_key` column; route tries tenant-specific value
   first, falls back to the current global env var — backward-compatible, same shape applies
   to Resend/Stripe. Schema change — prepare as a migration file only if directed, do not run.

No code, route, prod env, or webhook changes were made by W3 for this task — read-only
diff/verification only, per lane rules.

## Recommendation for the leader

Don't re-dispatch this lane again — the analysis is complete and verified twice now (W6's
own SDK cross-check + witness test, and this independent re-check). What's actually
outstanding is procedural: merge `p1-w6`'s `deploy-prep/PARITY-REPORT.md` section (or this
file) into the branch that becomes canonical, and get Jeff's decision on remediation option
1 vs 2 above.
