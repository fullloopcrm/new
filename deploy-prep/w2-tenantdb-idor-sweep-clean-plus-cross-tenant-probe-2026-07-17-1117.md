# W2 gap/fluidity refresh — 2026-07-17 11:17

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-doc-completion-copy-sender-gap-plus-archetype-depth-2026-07-17-1109.md`.

Leader's fresh 3-deep queue this round (11:14 LEADER->W2): (1) continue project archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current.

## (1) Fresh-ground — a new class hunted, clean sweep, zero live bugs

Last round's class (tenant email-credential scoping on `sendEmail`) was checked further first: swept every remaining `sendEmail(` call site OUTSIDE `src/app/api` (60 files — `src/lib/*` and `src/app/site/<tenant>/_lib/*`) that last round's 32-file `src/app/api`-only sweep didn't cover. All clean: `src/lib/{notify,notify-team,admin-contacts,security,team-provisioning,jefe/actions,selena-legacy-email,selena-legacy-handlers}.ts` already pass `resendApiKey`/`from` from the tenant row at every call site. `login-alert.ts`'s bare `sendEmail()` call is the platform-super-admin-only branch (no `tenantId`) — correctly not tenant-branded, by design. `src/lib/selena/{core,tools}.ts` and `src/lib/nycmaid/*` import a DIFFERENT, nycmaid-specific `sendEmail(to, subject, html)` from `@/lib/nycmaid/email` — legacy single-tenant helper already carrying a `tenant-scope-ok` comment from a prior round; not this class. `src/app/site/<tenant>/_lib/*` (nyc-mobile-salon, wash-and-fold-hoboken, the-nyc-interior-designer, wash-and-fold-nyc) are the already-documented per-tenant operator-clone debt in `platform/CLAUDE.md` ("Known debt... do NOT extend") — each is a single hardcoded tenant, so there's no cross-tenant credential mix-up possible in that shape. **Class fully closed — no new instance found.**

Pivoted to a genuinely new class: **GET-by-`[id]` cross-tenant IDOR** (a caller passing another tenant's row id to a `[id]` route and getting the data back) — distinct from every write-side FK-ownership class checked in prior rounds (5a-41's `client_id` FK gate, the `team_members.sms_consent` sends, the vendor-secret redaction sweep). Statically enumerated all 36 `src/app/api/**/[id]/route.ts` files' `GET` handlers; a bare grep for the string `tenant_id` flagged 4 as suspicious:

- `clients/[id]` — false alarm. Uses `tenantDb(tenantId).from('clients').select('*').eq('id', id)`; the wrapper auto-injects `.eq('tenant_id', tenantId)` (confirmed by reading `lib/tenant-db.ts`), so the grep just didn't see the literal string.
- `dashboard/import/batch/[id]` — false alarm. `ownsBatch()` (a helper defined above `GET`, outside the grep's function-body window) checks ownership via `tenantDb(tenantId).from('import_batches')` before returning any batch data.
- `changelog/[id]` — false alarm. Reads `platform_announcements`, a platform-global table with no `tenant_id` column (a published changelog entry is meant to be readable by any authenticated tenant) — not tenant-scoped data, so there's no cross-tenant boundary to violate.
- `admin/prospects/[id]` — false alarm. Gated by `requireAdmin()` (platform super-admin only, not a tenant session), and `prospects` is a pre-tenant table (leads that haven't become a tenant yet) — no tenant to cross.

Cross-checked the other 32 files with a stricter guard-presence grep (`tenantDb(` / `.eq('tenant_id'` / `requireAdmin` / `getTenantForRequest` anywhere in the `GET` body) — all 32 pass; the only miss was `dashboard/import/batch/[id]` again, for the same function-body-window reason, already hand-verified safe above. **All 36 `[id]` GET routes are correctly tenant-scoped. Zero live bugs in this class.**

## (2) Archetype depth — 5a-44, proving the mechanism the whole sweep above relies on

Every false-alarm verdict above (and this session's earlier write-side FK-ownership probes: 5a-36, 5a-41) ultimately rests on one assumption: that `tenantDb()`'s auto-injected `.eq('tenant_id', tenantId)` actually rejects a row belonging to a DIFFERENT tenant, at the live database level. That mechanism itself had never been probed against a real second tenant — every prior cross-tenant-shaped probe in `sim-all-trades.ts` (5a-36's note, 5a-41) was cross-CLIENT-*same*-tenant only, because the harness runs one tenant per pass end-to-end and building a full second tenant via the whole onboarding flow was out of scope.

Added probe 5a-44: creates one minimal, throwaway SECOND `tenants` row (not run through the full onboarding flow — just the bare insert needed to get a real second `tenant_id`), inserts a `clients` row directly under it via `supabaseAdmin` (bypassing `tenantDb`, so ownership is unambiguous), then runs the exact query shape `clients/[id]`'s `GET` (and every other `tenantDb`-backed `[id]` route) uses: `tenantDb(thisRun'sTenantId).from('clients').select('id').eq('id', foreignClientId)`. Asserts it returns nothing. Control: the same query with `tenantDb(theOWNINGtenant'sId)` returns the row, proving the null result above is the `tenant_id` filter at work, not a broken query. Deletes the foreign client row and the throwaway tenant row immediately after (`.eq('tenant_id', foreignTenant.id)` on the delete, so no accidental cross-tenant delete either).

**Not run this round** — `sim-all-trades.ts` is leader-run-only (per prior rounds' convention); flagging for a live run.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, including the new `sim-all-trades.ts` probe).
- No source-code fix this round (fresh-ground class came back clean) — no route/lib files touched, so no vitest suite to run/mutate. One `deploy-prep` docs commit + one `sim-all-trades.ts` probe commit.
- File-only, no push/deploy/DB write.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-23; #22 stays closed). No new NOTICED items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker.
