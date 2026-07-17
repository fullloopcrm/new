# W4 gap/fluidity checkpoint — 2026-07-17 17:35

Queue (17:17 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) new fresh-ground surface. (2) continue whichever surface (1) opens up.
(3) keep gap/fluidity current.

## (1) + (2) this pass

Closed the TS-level get-or-create race family: `src/lib/sales-contacts.ts`'s
`upsertSalesContact` had the same SELECT-then-INSERT TOCTOU shape as the
comhub RPC race closed earlier this session, backed by a real unique index
(`contacts_email_unique`). Fixed by catching `23505` and re-fetching the
winner's row (house idiom already used in `clients/import`,
`finance/bank-import`, `telnyx-voice`). Then swept the other 12 files
matched by the same `getOrCreate|findOrCreate|upsert` grep
(`activate-tenant.ts`, `selena/tools.ts`, `tenant-db.ts`, `social.ts`,
`seo/overrides.ts`, `seo/health.ts`, `seo/competitors.ts`,
`seo/onboarding.ts`, `seo/technical.ts`, `seo/ingest.ts`, `supabase.ts`,
`ledger.ts`) — all real atomic `.upsert()` calls with `onConflict` targets,
or (supabase.ts) audit-wrapper infra. Clean; no further findings in this
family. See `w4-broad-hunt-2026-07-17-1729-sales-contacts-getorcreate-race-fix.md`
for full detail.

## Surfaces closed this session (cumulative, unchanged list + this pass)

- comhub get-or-create family (missing by-email fn + race hardening)
- rate-limit-db shared brute-force throttle (atomic race)
- onConflict-vs-non-compound-unique-column sweep (clean, repo-wide)
- **TS-level get-or-create/upsert family in `src/lib` (this pass, closed)**
- journal_entries dedup / post_journal_entry entity_id threading (prior passes)
- naive-ET-vs-UTC boundary sweep (many sites, prior passes)
- finance/ledger partial-payment double-count (prior passes)
- numerous per-route RBAC gate fixes, rate-limit fixes, TOCTOU races (see
  full `deploy-prep/w4-*` history — not re-listing every prior entry here)

## Untouched, plausible next targets (carried forward + narrowed)

- **`seo_run_detection()` duplicate-issue risk** (flagged this pass,
  deprioritized): DELETE-then-INSERT bulk classifier in
  `migrations/2026_07_05_seo_competitors.sql`, no unique constraint on
  `seo_issues` guarding against concurrent cron + manual
  `scripts/seo-monitor.ts` overlap. Data-integrity duplication, not a
  security/money bug, and the two call sites rarely overlap in practice —
  next pass if nothing higher-signal turns up.
- **`src/lib/` broadly**: ~213 of ~226 top-level files still have no
  targeted-shape read (the get-or-create/upsert grep only covers ~13 of
  them). Plausible next narrowing: grep for other repeated bug shapes seen
  this session — e.g. any remaining naive `new Date()` / ET-boundary
  construction outside the sites already swept, or any remaining
  `.select().single()` (not `.maybeSingle()`) on a query that isn't already
  uniquely keyed, which throws on 0-or-2+ rows instead of handling gracefully.
- **Postgres RPC functions**: `seo_money_keywords`, `seo_refresh_rollup`,
  `seo_run_detection` reviewed this session for the missing-function class
  (all defined, confirmed via the dead-RPC sweep in the 17:30 report) and
  now partially for the race class (`seo_run_detection` flagged above,
  `seo_money_keywords`/`seo_refresh_rollup` are read-only/idempotent bulk
  refreshes with no get-or-create shape — clean).

No push/deploy/DB. File-only.
