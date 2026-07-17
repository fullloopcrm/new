# W2 gap/fluidity refresh — 2026-07-17 09:40

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenants-settings-vendor-secret-sweep-2026-07-17-0930.md`.

Leader's fresh 3-deep queue this round: (1) continue the `select(*)`-leak sweep against the remaining ~120 `tenants` call sites, (2) fresh-ground hunting once (1) has a checkpoint, (3) keep gap/fluidity current.

## (1) Continued the tenants vendor-secret sweep — 2 more real instances found and fixed, plus a methodology gap identified and closed

This round widened the sweep two ways past prior rounds' approach:

**a) Multiline regex sweep for the actual bug shape, across the FULL consumer set (not a sample).** Prior rounds sampled ~35 `getTenantFromHeaders()` consumers via grep-for-raw-spread. This round used ripgrep multiline mode to search for `...tenant`/`...ctx.tenant` spreads inside `NextResponse.json({...})` calls across ALL ~331 `getTenantForRequest()` importers and all `getCurrentTenant()`/`getTenantBySlug()`/`getTenantByDomain()` consumers at once — zero hits beyond the 1 already-reviewed-clean site (`POST /api/tenants` onboarding). This is a materially stronger claim than last round's sample-based "spot check" — the raw-full-object-spread shape is now confirmed absent across the *entire* resolver consumer surface, not just a subset.

**b) Found the actual grep-pattern gap from prior rounds — and 2 real bugs hiding in it.** Prior rounds' `select('*')`-hunting grep required `select('*')` to be the *entire* argument. That pattern silently skips `select('*, joined_table(cols))` — same "select all columns from tenants" behavior, just with an additional joined table tacked on. Broadening the grep to catch `.from('tenants').select('*, ...)` turned up exactly 2 real hits, both previously missed:

1. **`GET /api/admin/tenants`** — `.select('*, tenant_members(id))`, returned wholesale as `{ tenants }`: an ARRAY of every tenant's full row (all 8 `ENCRYPTED_TENANT_FIELDS` + `google_tokens`) in one unauthenticated-to-non-admins-but-fully-open-to-any-admin call. This is the LIST sibling of the already-fixed `admin/tenants/[id]` DETAIL route — same bug class, missed because it sits one route level up from where the last 2 rounds looked, and the grep pattern used to close out that route's siblings didn't match this one's `select('*, ...)` shape.
2. **`GET /api/admin/businesses`** — same shape, `.select('*, tenant_members(id), tenant_invites(id, accepted))')` → `{ businesses }`. LIST sibling of the already-fixed `admin/businesses/[id]` DETAIL route.

Checked both routes' real consumers before fixing (not assumed): grepped all 4 consumers of `admin/tenants` (admin/settings, admin/tenants, admin/team, admin/finance pages) and all 8 consumers of `admin/businesses` (businesses, clients, calendar, bookings, activity, social, ai, google-profile admin pages) for any of the 8 `ENCRYPTED_TENANT_FIELDS` names or `google_tokens` — zero hits in any of the 12. Unlike `admin/businesses/[id]`'s own edit form (a documented exception that legitimately prefills several raw values), neither list route has any such consumer — full redaction, zero booleans needed, zero UX regression.

**Fixed** (2 files): `src/app/api/admin/tenants/route.ts` (GET — `omit()` mapped over the tenants array), `src/app/api/admin/businesses/route.ts` (GET — same, mapped over the businesses array). Both reuse the existing `ENCRYPTED_TENANT_FIELDS` constant + `omit()` helper the `[id]` routes already established. 2 new `route.vendor-secret-redaction.test.ts` files, 6 tests total (3 each: no-secret-fields, no-google_tokens, CONTROL non-secret-fields-still-present).

**Also checked and clean this round (ruled out, not assumed)**:
- 3 admin `page.tsx` server components that query `tenants` directly with explicit secret-field selects: `admin/ai-usage` (`anthropic_api_key` — used only as `!!t.anthropic_api_key` boolean, never rendered raw), `admin/security` (`stripe_api_key`/`telnyx_api_key`/`resend_api_key` — explicitly comment-documented "booleans only, never the values", verified the JSX only renders `encrypted`/`plaintext`/`—` badges), `admin/analytics` (no secret columns at all).
- 6 public unauthenticated routes with explicit secret-field selects for legitimate server-side vendor calls: `api/quotes/public/[token]/deposit-checkout` and `api/invoices/public/[token]/checkout` (both join `stripe_api_key`/`stripe_account_id` to construct a Stripe client server-side; response is `{ url: session.url }` only), `api/documents/public/[token]/sign` (joins `telnyx_api_key`/`resend_api_key` etc. to notify the next signer; response is `{ ok, all_done }` only), `api/pin-reset` (fetches `telnyx_api_key`/`resend_api_key` to deliver a reset code; responses are `{ sent, via }`/`{ success }` only), `api/portal/auth` (fetches `telnyx_api_key`/`resend_api_key` for OTP delivery; the one tenant object actually returned to the browser — `tenantInfo` — uses an explicit narrow `id, name, primary_color, logo_url` select, no secrets), `api/referrers/auth/request` (fetches `resend_api_key`/`resend_domain` to send the OTP email; always responds `{ ok: true }` regardless of outcome, by design, to avoid email enumeration).
- 7 more admin aggregate routes checked for the same list-dump shape (`admin/billing`, `admin/finance`, `admin/sales`, `admin/leads`, `admin/invites`, `admin/tenant-chats`, `admin/impersonate`) — all already use explicit narrow column selects (`id, name`, `id, name, slug, plan, status, ...`), never `select('*')` in any shape, on every `tenants` reference. Confirms the 2 fixed routes were the only remaining `select('*, ...)` shape in the admin-aggregate-route family.
- Re-ran the full `.from('tenants')` / `.from('tenant_domains')` inventory (155 files, 253 occurrences) against both the exact-`select('*')` and the `select('*, ...)` shapes combined — no further un-audited `select('*')`-on-tenants call sites of either shape remain.

`npx tsc --noEmit`: clean. Full existing suite for both touched directories (`api/admin/tenants`, `api/admin/businesses`, recursively including `[id]` and nested routes): 14 test files, 48 tests, all green — 0 regressions.

No DB migration needed — pure response-shape redaction, no schema change.

## (2) Fresh-ground hunting

Not reached this round — the widened (1) sweep (multiline consumer-wide regex pass + the list-route bug class + the aggregate-route re-check) filled the round given the depth needed to responsibly claim "no `...tenant` spread across all 331+ resolver consumers" rather than another sample.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list, items 1-19 (all now closed or already flagged), except:

20. **Updated, and materially narrower now.** This round's multiline regex sweep for `...tenant`/`...ctx.tenant` spreads inside `NextResponse.json()` covered ALL ~331 `getTenantForRequest()` + all `getCurrentTenant()`/`getTenantBySlug()`/`getTenantByDomain()` consumers directly (not a sample) — zero hits. Combined with re-running both the exact-`select('*')` and `select('*, ...)` grep shapes across the full 155-file/253-occurrence `tenants`/`tenant_domains` inventory, the **raw-full-object-return bug class specifically is now believed closed** for this codebase, modulo: (a) explicit-narrow-secret-column selects used for legitimate server-side vendor calls — spot-checked ~15 of these, all clean, but not all ~75 such sites were individually read this round, so a narrower "explicit secret column leaks into an unrelated response field" variant of this bug (as opposed to a full-object spread) can't yet be ruled out with the same confidence; (b) the `admin/businesses/[id]`/`tenant-profile.ts` documented edit-form exception, which is a real live path to a raw secret value by design and depends on that route's own access control staying correct, not re-audited this round. Recommend this NOTICED can drop to a narrower follow-up ("the explicit-secret-column-select sites") rather than the original open-ended "~130 unaudited tenants call sites" framing — the highest-confidence risk categories (full-object spread, list-route siblings) are now covered.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 2 commits this round (1× `fix`+tests, 1× `docs`).
