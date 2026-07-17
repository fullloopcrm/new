# Gap/fluidity checkpoint — W4, 2026-07-17 18:15

Per 17:57 order item 3. File-only, no push/deploy/DB.

## This pass

1. Fresh ground: closed all three next-target candidates named in the 17:55
   checkpoint (CSRF-on-GET, SSRF-beyond-cookie/XFF, prototype-pollution-shaped
   merges). Full write-up:
   `w4-broad-hunt-2026-07-17-1810-csrf-get-ssrf-protopollution-sweep-clean.md`.
   Two closed as exhausted-clean (SSRF, proto-pollution); one found real
   instances but judged not worth fixing on severity grounds, same precedent
   as `view_count`/`unread_count`/`yinez_skills.hit_count` (CSRF-on-GET —
   every hit is a read-triggered badge-count/auto-link side effect, not
   money/privilege/data-exfil, and two of the four surfaces aren't even
   cookie-authed).
2. Continued into `platform/src/lib/messaging/*` and `ownerAlert()` callers
   (8 call sites across reviews/submit, portal/request, deals/manual, quotes
   accept/decline/send, jobs complete, stripe webhook) checking for
   unescaped user text landing in the HTML email body — this is exactly the
   shape of bug this session has fixed before (storage-prefix, LIKE-wildcard
   escaping). All 7 that interpolate user-controlled strings do escape
   (`escapeHtml()` or an inline `esc()`/`.replace(/</g,...)` helper) before
   building `bodyHtml`. One inconsistency noted, not a bug: `quotes/public/
   [token]/decline/route.ts`'s `reason.replace(/</g, '&lt;')` only escapes
   `<`, not `&`/`"`/`>`, unlike the other 6 call sites' full 4-char escape —
   but the value lands in a `<p>` text node with no attribute context, and
   escaping `<` alone is sufficient to block all tag-opening HTML injection
   there. Cosmetic inconsistency only, correctly not "fixed" — matches this
   session's bar for not padding partial-but-safe patterns into busywork.
3. This checkpoint.

## Sweep status

**CSRF-on-GET, SSRF-beyond-cookie/XFF, prototype-pollution-merge: all three
now closed** (checked bug classes, this session).
**`ownerAlert()`/HTML-email-injection surface: swept, clean** — new checked
bug class.

## Aging items still open (re-confirmed present, not re-litigated this pass)

- `create-tenant-from-lead.ts` missing atomic claim on `converted_tenant_id`
  — still the highest real-money blast-radius PROPOSED-but-unapplied
  migration, now well over 24h stale.
- `referrers.total_earned` / `total_paid` lost-update races — migrations
  proposed (2026-07-16), not wired, pending Jeff's DDL approval.
- `clients` dedup unique indexes (2026-07-17) — same pending state.
- `admin/cleanup-test-bookings` name-collision risk — Jeff's product-call
  pending.
- `comhub_get_or_create_contact_by_email`'s TOCTOU race hardening — still
  blocked on pulling its real live body first (trimmed out of the applied
  migration per 17:35's correction).
- `post-labor.ts` / `postDepositToLedger` entity_id design decision — still
  needs Jeff/leader input.
- `categorization_patterns` recategorization semantics (overwrite `coa_id`
  vs. keep original) — still an open product question, unchanged.
- `team-portal/photo-upload/route.ts` — PROPOSED/unwired, unchanged.
- `comhub-email` cron's `unread_count` bump — still not dug into, badge-count
  severity only, low priority.

## Next-target candidates if continuing fresh-ground hunting

`platform/src/lib/` is 258 non-test files across 12 subdirectories.
Untouched-by-any-doc-title subdirs remaining: `geo/` (1 file, checked this
pass, content-generation only, no security surface), `territories/` (1 file,
not yet opened), `consent/` (cookie-consent banner logic, client-side only,
skimmed — looked clean, no server enforcement dependency, low priority to
revisit). `marketing/` is ~1.5MB of static content-data files (industry page
copy) — not fruitful for security bugs, deprioritize entirely. Two
genuinely-unopened areas worth a look next: `platform/src/lib/finance/`'s
non-ledger files (the ledger/counter-bump paths are covered, but the
directory has other files) and a systematic walk of `platform/src/components`
that hasn't happened since the 17:10 XSS/postMessage/eval pass (that pass
covered the whole directory once — a second pass isn't obviously warranted
unless a new bug class is named).

No push/deploy/DB this pass.
