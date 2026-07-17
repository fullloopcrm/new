# Gap/fluidity checkpoint — W4, 2026-07-17 17:55

Per 17:53 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: diffed the current route list (505) against the 2026-07-12
   auth matrix (499), read all 6 new routes directly, all clean/already
   correctly hardened. Auth-matrix coverage is now current again.
2. Continued the JS-side counter-bump surface one level deeper (per the
   17:50 checkpoint's next-target note): full `src/lib` grep for `+ 1`
   on named count/balance fields. One more hit found
   (`yinez_skills.hit_count` in `selena/tools.ts`) — same lost-update-race
   *shape* as the earlier `categorization_patterns` fix but a different,
   lower-severity bug class (no key-mismatch, PK-targeted, cosmetic
   display-ordering field only). Judged not worth fixing, same precedent
   as `view_count`/`unread_count` elsewhere this session. Also swept open
   redirects (clean, new bug class checked off) and read
   `webhooks/telegram/route.ts`, `webhooks/telegram/[tenant]/route.ts`,
   `webhooks/telnyx/route.ts` end-to-end (no prior dedicated citation) —
   all clean.
3. This checkpoint.

Full write-up:
`w4-broad-hunt-2026-07-17-1755-post-matrix-route-diff-plus-webhooks-and-counter-bump-sweep.md`.

## Sweep status

**Postgres RPC surface: fully exhausted** (unchanged from 17:50).
**JS-side counter-bump surface: now believed exhaustive** across both
`app/api` and `src/lib` for the `+= 1`-on-a-named-field shape — two
independent grep passes, every hit read and accounted for.
**Auth-matrix surface: closed the 6-route drift, current at 505/505.**
**Open-redirect surface: swept clean, closing as a checked bug class.**
**Telegram + Telnyx-SMS webhooks: read end-to-end, clean** (voice webhook
already covered in the 14:45 pass).

## Aging items still open (re-confirmed present, not re-litigated)

- `create-tenant-from-lead.ts` missing atomic claim on `converted_tenant_id`
  — still the highest real-money blast-radius PROPOSED-but-unapplied
  migration, now well over 24h stale.
- `referrers.total_earned` / `total_paid` lost-update races — migrations
  proposed (2026-07-16), not wired, pending Jeff's DDL approval. Re-traced
  both live call sites directly this pass (not just cited) — confirmed
  still correctly unwired, nothing changed.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email`'s TOCTOU race hardening — still
  blocked on pulling its real live body first.
- `post-labor.ts` / `postDepositToLedger` entity_id design decision — still
  needs Jeff/leader input.
- `categorization_patterns` recategorization semantics (overwrite `coa_id`
  vs. keep original) — still an open product question, unchanged.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired, re-verified still
  accurate this pass (no drift since the 12:21 report).

## Next-target candidates if continuing fresh-ground hunting

`src/lib/` (360 files, up from 259 at the last count) still has no full
file-by-file walk, though the counter-bump *pattern* specifically within it
is now believed exhausted. Untouched bug classes not yet swept this
session: CSRF on any state-changing GET routes (if any exist — not yet
enumerated), SSRF via user-supplied outbound URLs beyond the already-covered
cookie/XFF sweep, and prototype-pollution-shaped `Object.assign`/spread-merge
patterns on user input. `comhub-email` cron's `unread_count` bump (flagged
17:50, still not dug into — badge-count severity only).

No push/deploy/DB this pass.
