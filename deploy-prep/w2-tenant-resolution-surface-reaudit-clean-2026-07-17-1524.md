# W2 gap/fluidity refresh — 2026-07-17 15:24

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-telnyx-sms-credential-fallback-gap-2026-07-17-1523.md`.

Leader's fresh 3-deep queue this round (15:21 LEADER->W2): (1) new fresh-ground surface — hold off on the remaining telnyx_phone call sites pending Jeff's compliance answer. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) Fresh-ground hunt — full re-audit of the tenant-resolution surface itself (middleware + every caller), independently re-verified line-by-line. Result: genuinely clean, no new bug.

Since the telnyx carry-forward is paused on Jeff's compliance call, went back to first principles on my own original lane (tenant resolution: middleware + callers) rather than mirror another credential column, on the theory that 5+ rounds of "read-side resolver-precedence" and "write-side single-primary" fixes might have left the *core* resolution functions themselves unchecked as a whole (as opposed to their individual read-side callers, which were the target of rounds 1-9 today). Re-read every one, cold, from scratch — not trusting the doc trail, actually re-verifying the code:

- **`middleware.ts`** — subdomain + custom-domain branches, `applyProtectedRouteGate`, `STATIC_TENANT_MAP` hardcoded fallback. Clean.
- **`tenant-lookup.ts`'s `getTenantByDomain`** (the edge/middleware-facing resolver) — tenant_domains-first, tenants.domain-fallback, TRANSITION divergence guard, dangling-pointer refusal. Clean, already hardened.
- **`tenant.ts`'s `getTenantByDomain`** (the app-side twin) — confirmed byte-for-byte consistent precedence/guard logic with the edge version. Clean.
- **`tenant.ts`'s `getCurrentTenant()` / `getHeaderTenant()`** — confirmed `getHeaderTenant()` intentionally returns on a valid *signed* header alone, no session check — then traced every one of its 9 callers (`terms/page.tsx`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `client-analytics`, `tenants/route.ts`, `team-availability`, `push/subscribe`, plus `tenant.ts`/`tenant-query.ts` internals) to confirm none of them treat "resolves a tenant" as "is authenticated as that tenant's staff" without an additional `admin_token`/Clerk check layered on top. All already correctly gated (this exact vulnerability class — `getCurrentTenant()` alone does NOT authenticate — was already found and fixed in `client-analytics`, `team-availability`, and `push/subscribe` in an earlier round today; re-confirmed those fixes are real and still in place, not reverted).
- **`tenant-query.ts`'s `getTenantForRequest()`** (the ~195-importer API auth+tenant gate) — re-verified the header/admin_token branch ordering rationale (header checked before impersonation cookie, requires an admin_token to actually return via that branch — unlike `getHeaderTenant()`), the PIN-impersonation branch, the Clerk-membership branch, and the `tenantServesSite` gate. Clean, internally consistent with `tenant.ts`.
- **`tenant-site.ts`'s `tenantSiteUrl()`**, **`domains.ts`** (all 4 exports — `getTenantDomains`, `getOwnedDomainSet`, `getPrimaryTenantDomain`, `getDomainsForNeighborhood`, `getNeighborhoodFromZip`), **`seo/ingest.ts`'s `linkTenant()`**, and the **Resend inbound-email webhook**'s tenant resolution — all confirmed already on the tenant_domains-first/tenants.domain-fallback contract, all already carrying the masked-error fixes from prior rounds.
- **Every direct reader of the raw `x-tenant-id` header** (`api/chat`, `api/errors`, `api/pin-reset`, `api/yinez`, `api/admin-auth`, plus the lib files above) — re-grepped the full list (13 files) and confirmed each one calls `verifyTenantHeaderSig()` before trusting the header value; none trust a caller-supplied `x-tenant-id` unsigned. This is the same class of bug as the `getCurrentTenant()`-as-auth issue but one layer lower (forged header vs. missing session) — also already closed everywhere.
- **`tenants.domain_name`** — checked whether this column (a candidate "is this ANOTHER dual-column resolver gap the domain-fallback rounds missed") needed its own fallback chain. It doesn't: confirmed via `grep` that it's deliberately excluded from the routing resolvers (`tenantSiteUrl()`'s type doesn't even carry the field) and is intentionally treated as display/registrar-only, per an explicit comment already in `api/admin/businesses/[id]/route.ts` PUT (from an earlier round) — `activate-tenant.ts` uses it only as a last-resort seed *into* `tenant_domains` at activation time, which is the correct place for it to enter the routing system.
- **`payment_method`/`payment_methods`** and **`google_business`** — checked as candidate dual-column pairs (mirroring the telnyx/domain shape). Neither is: `payment_method` (tenant billing method) and `payment_methods` (client-facing accepted-methods array) are different concepts on different semantic axes, not a legacy/current pair; `google_business` is a single JSONB cache blob with no sibling column.

**No new bug found.** This confirms the leader's 13:25 assessment (resolver-precedence exhausted after round 5) at the *architecture* level, not just the caller-by-caller level — re-verified independently rather than taken on faith from the doc trail.

## (2) Nothing to continue — (1) opened no new surface

Per the queue's own framing ("continue whichever surface (1) opens up"), there's nothing to advance since (1) came back clean rather than opening new ground. Did not force a manufactured finding to fill this slot.

## NOTICED — none new this round

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward unchanged from prior rounds. Nothing new this round.

## Remaining candidates, not yet fixed (fresh ground for a future round)

Unchanged from the prior round: the ~35-file telnyx direct-read carry-forward list (`w2-telnyx-sms-credential-fallback-gap-2026-07-17-1523.md`) is the concrete next-round queue once Jeff answers the `bookings/batch` platform-fallback-vs-skip-if-unconfigured compliance question. With the tenant-resolution surface itself now re-confirmed clean end-to-end, the honest read is that a genuinely NEW bug class (outside telnyx and outside tenant-resolution) is more likely to turn up than another pass over already-hardened resolver code — recommend the leader's next queue either unblock telnyx or point this lane at a different feature surface entirely.

## Verification this round

- Zero code changes — this was a read-only re-audit. No `tsc`/test run needed; `git status` on `platform/src` confirms no working-tree changes.
- File-only, no push/deploy/DB write.
