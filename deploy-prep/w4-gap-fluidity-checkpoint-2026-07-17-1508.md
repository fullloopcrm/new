# Gap/fluidity checkpoint — W4, 2026-07-17 15:08

Per 14:55 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh-ground survey landed on `clients/import/route.ts` — a second,
   standalone CSV client-import endpoint, zero prior mentions, zero tests.
   Found + fixed the same bug class as last pass's `commitBatch`
   double-commit race: in-memory-only duplicate detection with no DB
   backstop, so two concurrent imports of the same CSV double the whole
   batch. RED-confirmed empirically (2 rows → 4), fixed with dormant-safe
   `23505` handling + a proposed DB unique-index migration (not applied —
   pending Jeff's DDL approval, same as the referrer/create-tenant-from-lead
   items). tsc clean, 23/23 clients tests green. Full writeup:
   `w4-broad-hunt-2026-07-17-1508-clients-import-duplicate-race.md`.
2. Continued the surface: re-checked `stage/route.ts`, `batch/[id]/route.ts`,
   `analyze/route.ts` (no new bugs), and the two next-target candidates
   from the 15:02 checkpoint — `documents/[id]/void/route.ts` and
   `documents/[id]/duplicate/route.ts`. `duplicate/route.ts` stays clean
   (insert-only, no race exposure). `void/route.ts` **does** still have
   the unconditional check-then-act TOCTOU on p1-w4 — but `git log --all`
   shows it was already independently fixed twice on other worker branches
   not yet merged here (P1/W1 `84a9e42c`, P1/W2 `968bd0f4`). Did not
   re-fix it — flagging for the leader to carry one of those fixes forward
   into p1-w4 at merge time rather than producing a third redundant diff
   on the same 8 lines.
3. This checkpoint.

## Cross-branch note for the leader

`documents/[id]/void/route.ts` on p1-w4 (this branch) is currently
UNPATCHED for the void/TOCTOU bug — the fix exists on P1/W1 and P1/W2's
branches, not this one. Worth confirming at merge time that whichever
branch's version lands is the one actually deployed; a naive per-file
"take p1-w4's version" merge strategy would silently drop an already-fixed
real bug back in.

## Aging items still open (re-confirmed present, not re-litigated)

- `create-tenant-from-lead.ts` missing atomic claim on `converted_tenant_id`
  — still the highest real-money blast-radius PROPOSED-but-unapplied
  migration, now well over 24h stale.
- `referrers.total_earned` / `total_paid` lost-update races — both
  migrations proposed (2026-07-16), not wired, pending Jeff's DDL approval.
- `clients` dedup unique indexes (new this pass, see above) — same pending
  state, third item in this queue.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `documents/[id]/void` TOCTOU fix — exists on other branches, not yet on
  p1-w4 (see cross-branch note above).

## Next-target candidates if continuing fresh-ground hunting

Remaining lower-signal candidates not yet read this session:
`finance/bank-connect/session`, `finance/bank-import`,
`finance/bank-transactions` (worth a full read, not just the grep-count
check prior passes did), `documents/[id]/route.ts` GET (list/detail path,
not yet read — PATCH/DELETE already atomic-claimed via `bbfc2d3b`),
`documents/[id]/signers/route.ts` (list, distinct from the already-fixed
`signers/[signerId]/route.ts`), `documents/route.ts` (list/create),
`documents/public/[token]/route.ts` (public GET).

No push/deploy/DB write this pass.
