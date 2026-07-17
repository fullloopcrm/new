# W2 gap/fluidity refresh — 2026-07-17 09:49

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenants-list-routes-vendor-secret-sweep-2026-07-17-0940.md`.

Leader's fresh 3-deep queue this round: (1) continue the explicit-secret-column-select sweep against the narrowed ~75 sites, (2) fresh-ground hunting once (1) has a checkpoint, (3) keep gap/fluidity current.

## (1) Explicit-secret-column-select sweep — full inventory built, deep-checked across every distinct shape, zero new leaks

Built the actual site inventory first rather than guessing at the ~75 figure: a quote-boundary-aware multiline `.select(...)` regex (handles nested `tenants(...)` join syntax that a plain-paren-balance regex mangles) against all 8 `ENCRYPTED_TENANT_FIELDS` names plus `google_tokens`, across `src/`, excluding tests. **76 files matched** — confirms the prior round's ~75 estimate.

Rather than reading all 76 top-to-bottom (would not fit this round at the depth needed to trust a negative result), grouped them by the code *shape* around the secret field and deep-read at least one full file per distinct shape, since files sharing a shape share the same leak/no-leak verdict:

- **Boolean-config-status routes** (`admin/email`, `admin/sms`, `admin/system-check`, `cron/system-check`, `cron/health-check`) — select the raw key, but the JSON response only ever emits `configured`/`has_api_key`/a `missing: string[]` service-name list. Read `admin/email` and `admin/sms` in full (both GET+PUT); grepped the `missing.push(...)` shape in the crons — confirmed it only pushes `'email'`/`'sms'`/`'payments'` literals, never the key.
- **Live-verification / decrypt-then-probe routes** (`admin/businesses/[id]/verify-checklist`) — decrypts 3 keys into `tenantForVerify`, but traced into `lib/onboarding-verify.ts`: every check function returns `{ ok, detail }` where `detail` is built from HTTP status codes and vendor-side domain/phone strings, never the key itself, even in the error branches.
- **Fire-and-forget vendor-call libs** (`notify.ts`, `notify-team.ts`, `security.ts`, `payment-processor.ts`, `admin-contacts.ts`, `comhub-voice-config.ts`, `selena-legacy-handlers.ts`, `nycmaid/notify.ts`) — decrypt/select the key and pass it straight into `sendSMS()`/`sendEmail()`/Stripe/vendor SDK call as a same-shape named param (`telnyxApiKey:`, `resendApiKey:`). Read `notify.ts` and `security.ts` in full and grepped every `return {` in `notify.ts` (5 return sites, all `{success, error?}, ` never tenant data).
- **AI-key resolution** (`anthropic-client.ts`, `categorize-ai.ts`, `google-posts.ts`, `google-reviews.ts`) — `resolveAnthropicKey()`/`resolveAnthropic()` returns a decrypted key or an `Anthropic` client instance to 13 callers (checked the full caller list); none serialize the client/key into a response — they're all consumed to make an AI SDK call.
- **Webhook handlers** (`webhooks/stripe`, `webhooks/telegram/[tenant]`, `webhooks/telnyx`) — read `webhooks/stripe` in full: every return path is `{received: true, ...boolean flags}`, joins `stripe_account_id`/`telnyx_api_key` server-side only to route SMS notifications, never echoed.
- **Google OAuth token routes** (`api/google/status`, `api/admin/google/status`, `cron/sync-google-reviews`) — read all 3 in full. `getGoogleTokens()`'s return value is only ever used as a truthy gate (`if (!tokens) return {connected:false}`) or to derive `getValidAccessToken()`; the token/refresh-token values never appear in a response object in any of the 3 routes.
- **Found (not a leak, a dead-code gap):** the 3 per-tenant site clones (`site/nyc-mobile-salon`, `site/wash-and-fold-hoboken`, `site/wash-and-fold-nyc`) each ship their own `_lib/google.ts` with `getGoogleTokens()`/`saveGoogleTokens()` etc. — confirmed via `grep -rn "_lib/google"` against each site tree that **none of the 3 are imported anywhere**. Dead code, not a live leak path (can't leak what's never called), but flagged below since it's the kind of drift the `CLAUDE.md` "known debt" section already tracks for these clones.
- **Owner-facing self-edit form** (`dashboard/settings/page.tsx`) — prefills the tenant owner's *own* `resend_api_key`/`telnyx_api_key`/`stripe_api_key`/`anthropic_api_key` into masked/password inputs. This is the same documented "edit-form exception" shape as `admin/businesses/[id]` (NOTICED #20b): showing a tenant their own key so they can edit it is by-design, not a leak, contingent on `api/settings` staying tenant-scoped — which was the bug class already fixed in the `6e1eda60` commit this same sweep produced.

**Zero new leaks found.** Every one of the 76 sites' secret-field usage terminates in either (a) a boolean/status derivation, (b) an outbound vendor-API call parameter, or (c) the tenant's own documented self-edit form — never a same- or different-named field spread into an unrelated response.

No code changes this round — a clean audit result, not a fix. `npx tsc --noEmit` not re-run (no files touched).

## (2) Fresh-ground hunting

Not reached this round, same as the prior round's precedent — reaching a defensible negative result across every distinct shape in the 76-site inventory (rather than a shallow sample) filled the round.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list, items 1-19 (all now closed or already flagged), except:

20. **Downgrade recommended — closed.** This round completed the narrower follow-up flagged last round: all 76 explicit-secret-column-select sites (up from ~15 spot-checked) now traced to a terminating safe use (boolean/status, vendor-call param, or documented self-edit form). Combined with the prior round's exhaustive raw-full-object-spread sweep (331+ resolver consumers, zero hits) and the full `select('*')`/`select('*, ...)` inventory re-check, **the raw-secret-exposure bug class (both the full-object-spread shape and the explicit-column shape) is now believed fully closed** for this codebase. No further follow-up scoped from this thread.

21. **New — dead code, not a security bug.** `src/app/site/{nyc-mobile-salon,wash-and-fold-hoboken,wash-and-fold-nyc}/_lib/google.ts` (3 files, ~90 lines each) implement a full Google OAuth token read/write/refresh cycle that is never imported anywhere in their own site tree or elsewhere in `src/`. Not a leak (dead code can't be hit), but it's exactly the kind of per-tenant-clone drift `platform/CLAUDE.md`'s "Known debt" section already calls out for these 3 sites. Recommend a cleanup pass deletes or documents these alongside the broader clone-cutover work already tracked there — not touched this round since it's out of this round's security-sweep scope and deleting dead code wasn't asked for.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 1 commit this round (docs only — no code changed, clean audit).
