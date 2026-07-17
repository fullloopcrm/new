# W2 gap/fluidity refresh — 2026-07-17 09:30

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenants-google-oauth-vendor-secret-redaction-2026-07-17-0920.md`.

Leader's fresh 3-deep queue this round: (1) continue the `select(*)`-leak sweep against NOTICED #20's remaining ~130 `tenants` call sites — priority, vendor-secret exposure outranks the rest of tonight's backlog, (2) continue fresh-ground hunting once (1) has a checkpoint, (3) keep gap/fluidity current.

## (1) Continued the tenants vendor-secret sweep — 2 more real instances found and fixed

Widened last round's coverage past the 2 single-tenant-detail `GET` routes (`admin/tenants/[id]`, `admin/businesses/[id]`) to the rest of NOTICED #20's ~130 `.from('tenants')` call sites. Approach: (a) grepped every `.from('tenants')`/`.from('tenant_domains')` call combined with `select('*')` across `src/app` + `src/lib` — 8 hits total; (b) grepped every `NextResponse.json(...)` call across `src/app/api/**` for a literal secret-field name on the same line, and separately for a raw `{ tenant }`/`{ ...tenant }` spread — catches the exact shape all 4 prior-round bugs took; (c) specifically checked every consumer of `getTenantFromHeaders()` (the resolver backing ~35 **public**, unauthenticated site/portal/client routes — the highest-blast-radius category) for a raw tenant spread, since that's the one category not yet covered by the `select('*')` grep alone.

Found 2 real instances, both matching the established bug class exactly (raw `select('*')` tenant row shipped to the browser, unredacted):

1. **`GET /api/admin/settings?tenant_id=X`** — `select('*')` on `tenants`, returned as `NextResponse.json({ tenant })` with **zero** redaction (not even the partial guard `GET /api/settings` already applies to itself). Checked the actual frontend consumer (`admin/settings/page.tsx`) before fixing: it calls this same route with `scope=platform`/`scope=tenant` query params — this handler doesn't implement `scope` at all (a pre-existing, separate mismatch between frontend and backend, not touched here, not a secret leak in itself). That means the `tenant_id`-only branch has no real UI consumer today, but it's still a live `requireAdmin()`-gated endpoint any admin can hit directly with `?tenant_id=X` and get every vendor secret + `google_tokens` back raw. Redacted the same way as `admin/tenants/[id]` (zero known raw-secret consumer → full `ENCRYPTED_TENANT_FIELDS` + `google_tokens` strip via `omit()`).
2. **`PUT /api/settings`** — the tenant-owner's own settings save. This route's `GET` already has a `NEVER_RETURNED_FIELDS` allowlist (`google_tokens`/`telegram_bot_token`/`telegram_webhook_secret`) with a comment explaining exactly why those 3 (and only those 3) are stripped even for the authorized tenant owner. `PUT`'s response, built from `.update(...).select().single()` (or the empty-payload fallback `select('*')` re-fetch), never applied that same strip — every successful settings save re-exposed the 3 fields `GET` deliberately guards against, on the response body of the very save request that triggered it. Applied the identical `NEVER_RETURNED_FIELDS` strip to `PUT`'s response.

**Checked and clean, not a leak (ruled out, not assumed)**:
- `GET /api/team-members/[id]/stripe-status` — `select('*')` on `tenants`, but the tenant object is only ever used server-side to construct a Stripe client (`getStripe(tenant.stripe_api_key)`); the response body only ever contains `ready`/`charges_enabled`/`payouts_enabled`/`details_submitted`. No raw field reaches the response.
- `POST /api/tenants` (onboarding) — `.insert(...).select().single()` returns the brand-new tenant row as `{ tenant }`. Not flagged: at insert time none of `ENCRYPTED_TENANT_FIELDS`/`google_tokens` have ever been set (a fresh onboarding signup carries no vendor keys yet), so every one of those fields is `null` in the response regardless.
- `lib/tenant.ts` (`getCurrentTenant`/`getTenantBySlug`/`getTenantByDomain`) and `lib/tenant-query.ts` (`getTenantForRequest`) — the core resolver + auth-gate lane I own. Both correctly return the full row server-side (by design — callers need it for permission checks, vendor API calls, etc.); the leak risk lives entirely in whether each of their ~195+35 combined importers redacts before calling `NextResponse.json`. Spot-checked `dashboard/layout.tsx` (the highest-traffic consumer of `getCurrentTenant()`): only passes `tenantName`/`primaryColor`/`industry`/`agentName` to the client component, never the raw tenant. Did not re-audit all ~230 importers individually this round — see updated NOTICED #20 below.
- `lib/tenant-profile.ts`'s `getTenantProfile()` (`select('*')`, backs `GET /api/admin/businesses/[id]/profile`) — this IS a live secrets-edit form (the route's own docstring: "Secrets... are encrypted at rest via `encryptTenantSecrets`"). Its `PROFILE_FIELDS` registry explicitly reads back `stripe_api_key`/`resend_api_key`/`telnyx_api_key`/`telegram_bot_token`/`anthropic_api_key`/`indexnow_key` as prefilled editable values — the same documented "edit form needs the raw value to prefill an input" tradeoff already established for `admin/businesses/[id]` and `/api/settings`. Not a new bug, a repeat of the accepted pattern.
- `lib/settings.ts`'s `getSettings()` (`select('*')`) — builds a curated `TenantSettings` interface field-by-field (no raw spread), confirmed no secret field is copied into the returned shape.
- `lib/tenant-site.ts`'s `getTenantFromHeaders()` (`select('*')`, backs ~35 public routes) — grepped every one of those ~35 route files for a raw `{ ...tenant }`/`{ tenant }` spread into `NextResponse.json`: zero hits. `GET /api/tenant/public` (the one route literally named for public tenant exposure) already returns an explicit safe-field list only.
- `src/app/api/referrals/track/route.ts` — explicit `select('id, name, slug')`, no secrets in the query at all.

**Fixed** (2 files): `src/app/api/admin/settings/route.ts` (GET — `omit()` with full `ENCRYPTED_TENANT_FIELDS` + `google_tokens`, matching `admin/tenants/[id]`'s zero-consumer redaction), `src/app/api/settings/route.ts` (PUT — reuses the existing `NEVER_RETURNED_FIELDS` constant GET already defines in the same file). 2 new `route.vendor-secret-redaction.test.ts` files, 5 tests total (3 for admin/settings, 2 for settings — one probe + one CONTROL each, admin/settings gets an extra CONTROL for non-secret fields).

`npx tsc --noEmit`: clean. Full existing suite for all 4 touched/adjacent route directories (`api/settings`, `api/admin/settings`, `api/admin/tenants`, `api/admin/businesses`): 26 files, 87 tests, all green — 0 regressions, confirms this round doesn't collide with the prior 2 rounds' redaction fixes on the sibling `tenants/[id]`/`businesses/[id]` routes.

No DB migration needed — pure response-shape redaction, no schema change.

## (2) Fresh-ground hunting

Not reached this round — the (1) sweep against NOTICED #20 was the leader's stated priority and filled the round. Picking this back up next round per the leader's own ordering.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list, items 1-19 (all now closed or already flagged), except:

20. **Updated.** This round widened coverage from 2 to 10 `tenants` call sites actually read line-by-line (8 `select('*')` sites + the ~35 public `getTenantFromHeaders()` consumers checked via grep-for-raw-spread, which is a shallower check than a full manual read), and found 2 more real bugs at roughly the same hit rate as last round (2-for-2, now 4-for-10). The remaining ~120 sites are overwhelmingly narrow explicit-column selects or server-only consumers (vendor API calls, cron jobs, webhook handlers) that a first-pass grep for "secret field name on the same line as `NextResponse.json`" didn't flag — but, same caveat as last round, that grep-based pass is not the same as individually reading each one the way the 4 confirmed bugs were found. Still worth a dedicated follow-up rather than assuming this round closed the surface, though the marginal hit rate suggests the remaining sites are lower-density for this specific bug shape.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 2 commits this round (1× `fix`+tests, 1× `docs`).
