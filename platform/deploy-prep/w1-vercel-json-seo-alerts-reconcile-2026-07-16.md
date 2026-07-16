# vercel.json / seo-alerts cross-branch reconciliation

**For:** whoever runs the merge/consolidation of the P1 worker branches.
**From:** W1, 17:25 order item (3).
**Status:** gap confirmed still present as of this writing (re-verified live against p1-w1, p1-w2, p1-w3, p1-w4, p1-w5, p1-w6 — no branch touched here).

**18:04 re-check (no new findings, situation unchanged):** re-diffed all 6 branches' `vercel.json` crons arrays and the gdpr-purge implementation files again. Nothing has moved since 17:37 — p1-w2 still has `seo-alerts`' code (route.ts/alerts.ts/alerts.test.ts, commit `2ebf48b2`) but no vercel.json entry for it; p1-w1 (this branch) still has only the entry; `seo-index-cliff` is still the mirror gap (w1 has both, w2/w3/w5/w6 have neither); w4's `seo-health` is still solo; `gdpr-purge` is still two live implementations at two schedules (w2 `src/lib/gdpr-deletion.ts` @ `0 9 * * *`, w5 `src/lib/gdpr.ts` @ `30 5 * * *`), still needing a pick-one decision, not a merge. No consolidation appears to have started yet per LEADER-CHANNEL. Nothing further to add until one of the branches actually moves or a merge attempt surfaces a new conflict.

**18:55 re-check (no new findings, situation unchanged):** re-verified live by grepping all 6 worktrees directly (not from memory): p1-w2 HEAD now at `81c41f58` (moved since 18:04, but the `seo-alerts` route.ts/alerts.ts are still present, unmerged, no vercel.json entry added on w2's side). p1-w1 HEAD now at `c1dcf2e0` — vercel.json entry still present, route.ts still absent here, matching the reverse `seo-index-cliff` gap (entry+route only on w1, both absent on w2/w3/w4/w5/w6). w4's `seo-health` still solo. gdpr-purge still exactly two competing implementations, unchanged (w2 `gdpr-deletion.ts`, w5 `gdpr.ts`). No merge/consolidation activity detected on any branch. Everything in this note as of 18:04 remains accurate verbatim; only the confirmation timestamp and w2's HEAD SHA have moved.

## The gap

`platform/vercel.json` on **p1-w1** has a crons entry:

```json
{ "path": "/api/cron/seo-alerts", "schedule": "15 8 * * 2" }
```

I (W1) added this entry at 05:18 alongside `seo-index-cliff`, per LEADER's 05:12 order to wire both into vercel.json ahead of the eventual consolidated push. But the route it points at, and everything that route needs, was built on a **different** branch:

- `platform/src/app/api/cron/seo-alerts/route.ts` — **only on p1-w2**, commit `2ebf48b2`
- `platform/src/lib/seo/alerts.ts` (`checkCriticalSeoAlerts`, the actual logic) — **only on p1-w2**, same commit
- `platform/src/lib/seo/alerts.test.ts` — **only on p1-w2**, same commit
- `platform/src/lib/migrations/2026_07_16_seo_alert_snapshots.sql` (new `seo_alert_snapshots` dedup-state table `alerts.ts` reads/writes) — **only on p1-w2**, same commit, **not applied anywhere**

p1-w1 has the vercel.json line but none of the code or schema behind it. If p1-w1 (or any branch missing these 4 files) is pushed as-is with this vercel.json entry live, the cron will fire `GET /api/cron/seo-alerts` on a schedule and 404 — not a build break, but a silent no-op alert path that looks configured and isn't.

## What it takes to close it

1. Bring the 3 code/test files from p1-w2's `2ebf48b2` onto the merge base (`git show p1-w2:platform/src/app/api/cron/seo-alerts/route.ts` etc., or a normal merge/cherry-pick if p1-w2 lands in the same merge).
2. Apply the `2026_07_16_seo_alert_snapshots.sql` migration (new table, additive, low risk) — needs Jeff's approval + the leader to run it, same as every other migration in this sweep. Without it, `alerts.ts` will error on every cron tick once the route exists (it reads/writes `seo_alert_snapshots` for the dedup fingerprint).
3. Re-run `tsc --noEmit` + `alerts.test.ts` once the files coexist with p1-w1's other seo-* additions (`seo-index-cliff`, `technical.ts`'s sitemap repopulation the alerts cron runs after) — W2's tests only ever ran against p1-w2's tree, not against p1-w1's, so this exact combination hasn't been verified together yet.

## This is not actually a one-directional gap — the reverse also exists

The same vercel.json diff shows `seo-index-cliff` is the **mirror image** of this problem: p1-w1 has both the entry *and* the code (`src/app/api/cron/seo-index-cliff/route.ts`, confirmed present); p1-w2 (and w3, w5, w6) has **neither** the entry nor the code. So a plain union-merge of vercel.json isn't enough — whoever consolidates needs both directions: pull `seo-alerts`'s code from w2 onto the base, and confirm `seo-index-cliff`'s code (already on w1) survives the merge too.

## Adjacent same-file hazard found while checking this (flagging, not fixing)

`vercel.json`'s crons array has diverged in more ways than just the SEO entries across the branches I diffed against p1-w1:

| Entry | Present on | Notes |
|---|---|---|
| `generate-monthly-invoices` (`0 7 1 * *`) | w1 only | W1's own consolidated-invoicing feature (commit `3017117b`); every other branch lacks it — needs merging in regardless of the SEO question. |
| `seo-health` (`0 9 * * *`) | w4 only | Route confirmed present on p1-w4 (`c28b4a36`), absent on w1/w2/w3/w5/w6. |
| `gdpr-purge` | **w2 at `0 9 * * *`** vs **w5 at `30 5 * * *`** | Worse than a missing-code gap: **two different branches independently built two different GDPR-deletion implementations** (w2: `src/lib/gdpr-deletion.ts`, commit `94cef8ed`; w5: `src/lib/gdpr.ts`, per earlier channel note) and each wired its own cron at the *same path* with a *different schedule*. This can't be merged mechanically — whoever consolidates has to pick one implementation, and the losing branch's route file + migration become dead code to drop, not code to merge in. |

I only diffed w1 against w2/w3/w4/w5/w6 (all 6 P1 worktrees that exist as of now) — a real 3+ way merge of this one file needs whoever does it to treat vercel.json as requiring manual reconciliation, not a mechanical union of all branches' diffs.
