# W2 gap/fluidity refresh — 2026-07-17 10:04

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-explicit-secret-column-select-sweep-2026-07-17-0949.md`.

Leader's fresh 3-deep queue this round: (1) continue project archetype depth, (2) pivot fresh-ground hunting to a new bug class entirely (raw-secret-exposure thread closed), (3) keep gap/fluidity current.

## (2) Fresh-ground hunting — 6 candidate bug classes checked, all already closed, zero new bugs

Went in class-by-class rather than a blind file sweep, since the raw-secret-exposure thread's closure removes the obvious next target. Checked, in order:

1. **Admin-route auth consistency (RBAC bypass).** Grepped all 119 `src/app/api/admin/*/route.ts` files for `requireAdmin`/`requirePermission`/`verifyAdminToken`. 39 initially looked ungated; read all 9 that had zero auth-helper match anywhere in the file (`ai-chat`, `selena`, `smart-schedule`, `translate`, `broadcast-guidelines`, `analytics/live-feed`, `selena/monitor`, `google/callback`, `payments/finalize-match`). Every one authenticates a different way: `getTenantForRequest()` (tenant-session), a bearer/internal-key check (`safeEqual` against `ELCHAPO_MONITOR_KEY`/`INTERNAL_API_KEY`), or signed OAuth state (`verifyOAuthState`). No gap.
2. **Cross-tenant/cross-client caller-supplied FK ownership (IDOR).** Read `POST /api/bookings`, `POST /api/quotes`, `POST /api/projects`, `POST /api/jobs/[id]/sessions`, `PUT /api/bookings/batch-update`, `POST/PATCH /api/client/properties` — every caller-supplied FK (`client_id`, `property_id`, `team_member_id`, `service_type_id`) is already verified tenant-owned (and, on `client_properties`, client-owned) before use, each with a comment citing the exact prior round that added the guard. Thoroughly closed.
3. **PIN/login brute-force rate limiting.** `team-portal/auth`, and by extension the sibling PIN routes it explicitly cites (`admin-auth`, `auth/login`, `client/login`), all key their rate-limit bucket by caller identity (tenant+IP), not by the guessed value — the one shape that would make throttling ineffective. Already fixed, with a comment explaining why.
4. **PostgREST `.or()` filter injection.** Grepped every `.or(\`...${var}...\`)` call site (13 files). Initially looked like 6 unsanitized sites (`clients/route.ts`, `admin/clients/route.ts`, `admin/comhub/search-recipients`, `admin/activity`, `admin/ai-chat`, `ai/assistant`) — false alarm from grepping only the `.or(` line: every one of the 6 defines its interpolated variable via `sanitizePostgrestValue(...)` on the line directly above. Re-read each in full to confirm. No gap.
5. **Webhook signature verification.** All 9 webhook handlers (`telnyx`, `telnyx-voice`, `stripe`, `stripe-platform`, `telegram` x3, `clerk`, `resend`) verify a signature or secret token before processing (`verifyTelnyx`/`stripe.webhooks.constructEvent`/`verifySvix`/`verifyTelegramSecretToken`). No gap.
6. **Payment/money-field bounds validation.** `POST /api/invoices/[id]/record-payment` and `POST /api/payments/checkout` both reject non-positive amounts before insert/checkout. No gap.
7. **SSRF on tenant/user-controlled fetch targets.** `src/lib/ssrf.ts`'s `safeFetch()`/`assertPublicUrl()` is used everywhere a fetch target derives from tenant input (SEO/site-audit libs: `site-readiness`, `onboarding-verify`, `seo/remediate`, `seo/health`, `tenant-health`, `site-export`, `seo/enrich`, `seo/technical`). The other `fetch()` call sites found (`social.ts`, `selena/tools.ts`, `seo/gsc.ts`, rest of `onboarding-verify.ts`) all hit fixed, trusted vendor hosts (`graph.facebook.com`, `api.telnyx.com`, `googleapis.com`, `api.resend.com`) with tenant data only ever in the body/query value, never the fetch target itself — not SSRF-prone. No gap.

**Zero new bugs found.** Same honest-negative-result shape as the prior round's 76-site secret-column sweep — this round's breadth was 6 full bug classes read end-to-end rather than a single-class file inventory, and all 6 were already closed by the ~40 prior rounds' work. No code changes from this thread.

## (1) Project archetype depth — new probe added, NOT run (leader must confirm)

Since fresh-ground hunting found no new fix to confirm, extended archetype depth on a different axis: an **unprobed angle of an already-shipped guard**, not a fix-confirmation. `POST /api/bookings`' `property_id` ownership check filters on `.eq('client_id', …)` in addition to `.eq('tenant_id', …)` — sim-all-trades.ts runs one tenant per pass so it can't build a true cross-*tenant* probe (documented limitation, see 5a-36's note), but a cross-*client*-same-tenant probe needs only a second client row and was never exercised.

Added **5a-41** (`platform/scripts/sim-all-trades.ts`, after 5a-40, before the 5b. CHANGE ORDER section): creates a second real client + a real `client_properties` row under it in the archetype tenant, then runs the exact guard-shape query from `bookings/route.ts` twice — once with the archetype's real client_id (must reject, proving cross-client rejection works against the live schema) and once as a control with the foreign property's own client_id (must accept, proving the rejection above is the `client_id` filter doing its job, not a broken query). Cleans up both rows after.

`npx tsc --noEmit` clean. **NOT run** — `scripts/sim-all-trades.ts` is blocked for worker execution by `~/.claude/hooks/block-worker-sim-scripts.sh` ("leader-run-only... touches live prod Supabase"). Per the hook's own instruction, flagging to the leader instead of bypassing it.

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm the 5a-41 checks pass before relying on them.**

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (items 1-21, all closed or already flagged). No new items this round — the fresh-ground hunt's 6 classes were all closed on read, not partially-closed-with-a-flagged-remainder.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (sim-all-trades.ts archetype-depth probe, not run by me — see above) + 1 docs commit.
