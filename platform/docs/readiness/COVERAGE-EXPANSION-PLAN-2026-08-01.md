# Coverage Expansion Plan — 87% of 100%, not 87% of 18%

**Context:** platform-wide readiness score is 87% as of 2026-08-01, but `compute-readiness.mjs`'s
own surface-coverage stat says only 87/584 routes and 54/197 tables (18.1%) are referenced by any
checkpoint's `depends_on_files` at all. This plan is how the next sessions close that gap — the
same rigor as today's work, applied to the 82% nobody has looked at yet, not a new methodology.

## Step 0 (first 20 minutes of next session, before anything else)

Get the actual uncovered list, not just the count. `compute-readiness.mjs` computes the 18.1%
number already — read its source to find where it builds the covered-vs-total route/table sets,
and dump the two lists (uncovered routes, uncovered tables) to
`docs/readiness/uncovered-surface-2026-08-0X.json`. Without this, prioritization is a guess.

## Step 1 — Prioritize the uncovered list, don't work it in file order

Same principle Jeff already gave explicitly on 2026-07-31 for the first coverage push: **security
and finance routes first.** Concretely, rank the uncovered list:

1. Anything touching auth, PII, or payment data (highest severity by blast radius, same standard
   the existing 40 checkpoints already use).
2. Anything the new lead-source requirement, backup fix, or PITR work touched today but didn't
   get its own checkpoint (real code changed today, zero readiness-ledger coverage of it yet).
3. Admin/team/HR routes (large real gap per the 2026-07-25 HR audit referenced in project memory
   — likely still true, re-verify don't assume).
4. Marketing/SEO surface (lower blast radius, but real — this is a revenue-adjacent area for a
   platform whose founder's own background is SEO/marketing).
5. Everything else.

## Step 2 — Add checkpoints in small batches, same discipline as today

Do NOT try to cover 82% in one pass — today covered maybe a dozen checkpoints deeply in one long
session. Realistic pace: 5-10 new or upgraded checkpoints per session, each with real evidence
(live_query/live_http_check preferred; manual_code_read/git_log_diff only when a live check
genuinely isn't possible, and say so explicitly in the evidence text).

Standing rules that do NOT change for this expansion work (already proven today):
- Never score a checkpoint without a real, reproducible check behind it.
- Run all four ledger gates before every commit (`validate-ledger-evidence.mjs`,
  `check-ledger-sync.mjs`, `check-commit-ancestry.mjs`, `check-taxonomy-signoff.mjs`).
- If a check finds a real bug, fix it in the same pass (per Jeff's 2026-08-01 standing
  instruction) — except production database writes, which still get a real confirm-with-plan ask.
- Independent re-verification before trusting a prior session's own self-reported work on the
  same area — today found real stale/wrong scores this way (sec-04, sec-06) even from earlier
  the same day.

## Step 3 — Watch the denominator, not just the numerator

584 routes and 197 tables today will keep growing (more tenants, more microsites, more features).
Re-run `compute-readiness.mjs`'s coverage stat at the start of every future session and report the
real current percentage — don't reuse today's 18.1% as if it's static.

## Explicit non-goals for this plan

- This is not "get to 90% platform score." That's the existing score-chasing work, already
  covered by MASTER-TODO-LIST.md / the ledger itself. This plan is specifically about coverage
  (how much of the real platform any checkpoint even looks at), a different number from the score.
- Not a one-session task. Treat it the same way the original 2026-07-30 strategy doc treated the
  score climb: real, multi-session work, honestly paced — no manufactured urgency to finish fast.
