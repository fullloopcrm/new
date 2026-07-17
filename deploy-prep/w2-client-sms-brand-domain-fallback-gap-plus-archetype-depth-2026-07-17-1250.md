# W2 gap/fluidity refresh — 2026-07-17 12:50

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-selena-agent-domain-fallback-gap-plus-archetype-depth-2026-07-17-1236.md`.

Leader's fresh 3-deep queue this round (12:39 LEADER->W2): (1) continue project archetype depth. (2) continue fresh-ground hunting. (3) keep gap/fluidity current.

## (1) Fresh-ground — third mirror of the resolver-precedence bug class, and the first one that's LIVE today (not Q4-gated)

Continued sweeping every remaining direct `.domain`/`website_url` read in `src/lib`/`src/app` for the same shape as NOTICED #26/#29's bug: reads the legacy `tenants.domain`/`website_url` columns only, never consults `tenant_domains`. Found it in `src/lib/messaging/brand.ts`'s `tenantBrand()` — the resolver that builds every client-facing SMS/email brand string (`name`, `phone`, `site`, `bookUrl`, `reviewUrl`) for cleaning-industry tenants (nycmaid, the-florida-maid, and any future `industry:'cleaning'` tenant).

**This one is live today, not a landmine.** `tenantBrand()` is called by `clientSmsTemplates()`/`clientSmsTemplatesFor()` (`src/lib/messaging/client-sms.ts`), which feed the SMS body for:
- `client/book`, `client/reschedule/[id]`, `bookings`, `bookings/[id]`, `bookings/batch`, `client/recurring` (booking-received/confirmed/cancelled/rescheduled/rebook SMS)
- `cron/confirmation-reminder`, `cron/reminders`, `cron/rating-prompt` (the three SMS crons)

Previous behavior: `bareHost(tenant.website_url, tenant.domain || tenant.domain_name)` — website_url first, then the legacy domain columns, `tenant_domains` never consulted. A cleaning tenant whose custom domain lives only in `tenant_domains` (added via the `admin/websites` panel, which never touches `tenants.domain` or `website_url` — confirmed by reading that route) got:
- `brand.site` = `''` → `sms-cleaning.ts`'s `bookingReceived()` silently drops the "Tap to confirm: https://.../c/{token}" line entirely (its own `booking.client_confirm_token && brand.site` guard no-ops).
- `brand.bookUrl` = the literal string `"the booking link we sent you"` instead of a real URL → every `bookingConfirmation`/`cancellation`/`reschedule`/`thankYou` SMS reads e.g. "Portal: the booking link we sent you" — broken, customer-visible text on every touch after the initial booking.

**Fixed:** `tenantBrand()` now resolves via `getPrimaryTenantDomain()` first, same precedence as `getAgentConfig()`/`buildBrandOverride()` (`tenant_domains` PRIMARY row, then `tenants.domain`/`domain_name`, then `website_url`-derived). It's now async (was sync) — `clientSmsTemplates()` and `clientSmsTemplatesFor()` updated to await it (`BRAND_COLUMNS` also gained `id`, without which the `tenant_domains` lookup could never fire for the majority of this file's call sites, which only ever had a bare `tenantId` in scope). The two direct sync call sites that build a `clientSmsTemplates(tenant)` from a full tenant row (`client/book/route.ts`, `client/reschedule/[id]/route.ts`) now `await` it too. The `ClientSmsTemplates` interface itself is unchanged (all methods still return `string` synchronously) — only the outer resolver functions became properly async, matching `clientSmsTemplatesFor()`'s pre-existing async shape.

13 new vitest cases: `messaging/brand.test.ts` (new file, 7 cases: PRIMARY-wins, tenants.domain fallback, website_url fallback, a BUG-CLASS PROBE naming the exact broken-bookUrl failure mode, no-domain-anywhere degrade case, wrong-tenant probe, no-id skip-lookup case) and `messaging/client-sms.test.ts` (new file, 6 cases: SMS-body-level PRIMARY-wins/fallback/BUG-CLASS/wrong-tenant probes through the real `clientSmsTemplatesFor()` resolver, a non-cleaning-tenant regression check confirming neutral templates are unaffected, and a direct `clientSmsTemplates()` case covering the sync call sites). Mutation-verified: reverted the `brand.ts`/`client-sms.ts`/`book/route.ts`/`reschedule/[id]/route.ts` diff via `git diff` + `git apply -R` — 5 of the 13 new tests went RED for the right reason (all failures asserted the reverted code's output still contained the stale legacy/website_url domain instead of the seeded `tenant_domains` one, i.e. exercised the actual fixed codepath). The other 8 passed unchanged even reverted — expected, not a gap: those cases exercise the tenants.domain/website_url fallback paths and the "no domain anywhere" degrade case, which the pre-fix code already handled identically since it already read those two columns; only the tenant_domains-PRIMARY-wins and BUG-CLASS/wrong-tenant cases actually exercise the new codepath. Reapplied, confirmed all 13 GREEN.

## (2) Archetype depth — 5a-52, proving the reverse-lookup precedence against the live schema

Added **5a-52** to `platform/scripts/sim-all-trades.ts` (after 5a-51, before `5b. CHANGE ORDER`). Same shape as 5a-49's `tenantSiteUrl()` and 5a-51's `buildBrandOverride()`/`applyBrandRewrite()` probes: seeds a real legacy `tenants.domain` value (website_url cleared), confirms fallback; seeds a real active PRIMARY `tenant_domains` row alongside it, confirms it wins; creates a real second tenant with its own PRIMARY `tenant_domains` row and confirms the first tenant's `tenantBrand()` never resolves to the second tenant's domain. Restores both tables' original state (including `website_url`) and deletes the throwaway second tenant (the run's primary tenant is shared by every later phase).

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-52 (and the still-pending 5a-35 through 5a-51) pass before relying on them.**

## (3) NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-29). Nothing new to add this round — the fresh-ground sweep this round landed on a real, live-blast-radius bug (closed above) rather than surfacing another dead/unwired NOTICED candidate.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, incl. `sim-all-trades.ts`).
- `npx eslint` on all touched/new app files (`brand.ts`, `client-sms.ts`, `brand.test.ts`, `client-sms.test.ts`, `client/book/route.ts`, `client/reschedule/[id]/route.ts`): 0 warnings.
- Full suite: 582/583 files, 2541/2542 non-skipped tests passing (37 pre-existing skipped, up from 581/2529 last round — the +13 new test cases across the 2 new test files). 1 pre-existing, unrelated failure: `finance-export.test.ts`'s 200k-row pagination case timed out at its 5000ms budget — confirmed via `git diff --name-only` that this round's diff never touches `finance-export.ts` or any file it imports; a perf-sensitive/slow-generation test timing out under this session's load, not a regression from this fix. Flagging for the leader/Jeff, not fixing (out of lane, unrelated to tenant resolution).
- Fix mutation-verified (see above).
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

File-only, no push/deploy/DB write from this worker.
