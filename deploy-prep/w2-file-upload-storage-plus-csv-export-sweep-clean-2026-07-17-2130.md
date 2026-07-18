# W2 gap/fluidity refresh — 2026-07-17 21:30

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-activate-tenant-stale-primary-domain-gap-2026-07-17-2102.md`.

Leader's fresh 3-deep queue this round (21:08 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: file-upload/storage access-control class, read end-to-end

Own lane (tenant resolution / domains) was declared exhaustively closed last round (`is_primary` write-side + read-side resolvers both hardened, only 2 write sites, both now share `reconcilePrimaryDomain()`). Per that doc's own recommendation, pivoted fresh-ground hunting to a bug class outside tenant-resolution entirely, mirroring the 10:04 round's approach (whole-class read, not blind file grep). Picked **storage/file-upload access control** — cross-tenant path leakage, path traversal, MIME/content-type validation — since it hadn't been named as checked by any worker tonight (unlike RBAC, IDOR, CSRF, SSRF, webhook-sig, counter-races, which all have explicit closure entries in the channel).

Read every upload/signed-url/storage-remove/storage-download call site in `src/app/api` + `src/lib` (18 files): `lead-media/signed-url`, `apply/signed-url`, `management-applications/signed-url`, `cleaners/upload`, `admin/notes/upload`, `uploads/route.ts`, `public-upload/route.ts`, `booking-notes/upload` + `[id]/route.ts` (delete), `finance/upload`, `finance/receipts`, `finance/statements`, `team-applications/upload`, `reviews/upload`, `documents/[id]/route.ts` + `public/[token]/route.ts` + `public/[token]/sign/route.ts` + `duplicate/route.ts`, `cron/cleanup-videos`.

**Result: already thoroughly hardened, no live bug found.**

- **Path traversal on caller-supplied folder/filename** — already fixed (comments in `uploads/route.ts` and `public-upload/route.ts` cite a prior `7c17cb47` fix: folder is either stripped to `[a-zA-Z0-9_-]` or hardcoded, never caller-controlled raw; extension sanitized to `[a-z0-9]` everywhere).
- **MIME/content-type validation** — every LIVE upload route validates `file.type` against an explicit allowlist before upload (`lead-media`, `apply`, `management-applications`, `cleaners`, `admin/notes`, `uploads`, `public-upload`, `booking-notes`, `team-applications`, `reviews`, `finance/receipts`). One gap found — `finance/upload/route.ts` has zero MIME check (accepts any `file.type`, defaults `contentType` to `application/octet-stream`) — but traced its only reference (a comment in a sibling test file) and confirmed **zero UI callers anywhere in `src/app/dashboard`**: dead code, same shape as `bank_statements`/`finance/statements` (also zero UI callers — the whole bank-statements feature is unwired). Not fixed, per this session's established dead-code precedent (`blog-data.ts`, `tenant-schema.ts`, nycmaid clone templates).
- **Cross-tenant storage deletion via IDOR** — `cron/cleanup-videos` already has a defense-in-depth `extractOwnStoragePath()` requiring the extracted path to start with `${tenantId}/`, with a comment explaining exactly the class it guards against (a stale/edited `video_url` pointing outside the booking's own tenant folder). `booking-notes/[id]/route.ts` DELETE and `finance/statements` DELETE both look up the DB row scoped by `tenant_id` first, only remove the path found on that scoped row — no caller-supplied path ever reaches `.storage.remove()` directly.
- **Public-token document routes** (`documents/public/[token]/*`) — signed-URL minting keyed off `document_signers.public_token` → `documents.id`, tenant identity never trusted from the request; already correct.
- **CPA year-end ZIP** (`cpa/[token]/year-end-zip`) — token → `tenant_id`/`entity_id` looked up server-side, checks `revoked_at`/`expires_at`, rate-limited; already hardened (comment cites this as a deliberate hardening pass from earlier tonight).

## Adjacent class also swept: CSV/ZIP export tenant-scoping

Since file-upload closed clean, extended the same sitting to the only other caller-supplied-boundary export surface in the repo: `finance/tax-export`, `finance/year-end-zip`, `cpa/[token]/year-end-zip` (3 total CSV/ZIP-producing endpoints repo-wide, confirmed via grep for `text/csv`/`.csv`).

- All three scope every query with `.eq('tenant_id', tenantId)` first; the caller-suppliable `entity_id` param is always an **additional** filter, never a substitute — so an entity_id belonging to a different tenant just yields 0 rows, never a cross-tenant read.
- CSV-formula-injection (Excel `=`/`+`/`-`/`@` cell execution) already neutralized — `tax-export/route.ts`'s own `csvEscape()` and the shared `lib/finance-export.ts`'s `toCsv()` (used by both ZIP routes) both prefix-quote unsafe leading characters. Already closed.
- Both ZIP routes already page around the PostgREST 1000-row cap (`paginateAll`) with a `truncated` flag surfaced in the README — already hardened, not a silent-truncation gap.

**Zero new bugs found in either class.** Same honest-negative-result shape as the 10:04 round — breadth was 2 full bug classes read end-to-end, not a partial file sweep with a flagged remainder.

## (2) — what (1) opens up

Nothing. No bug fixed, so no continuation surface. (Distinct from a fix that opens a related file — this was a clean read, not a partial fix.)

## (3) — gap/fluidity kept current

Nothing new to add. Carried-forward NOTICED items unchanged from the 20:35/21:02 docs:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call (hard-delete vs soft-deactivate+reactivate).
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. NEW (this round, low-priority): `finance/upload/route.ts` has no MIME allowlist (unlike every sibling upload route) but is confirmed dead code (zero UI callers) — flagging only in case it's ever wired up, not worth fixing unreachable code.

## MISSING-FEATURE GAPS / UX-FRICTION

Nothing new this round.

File-only, no push/deploy/DB write. Zero code changes this round (genuine clean sweep, not manufactured) — no commit needed beyond this doc.
