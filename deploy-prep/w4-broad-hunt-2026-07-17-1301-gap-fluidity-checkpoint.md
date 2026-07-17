# W4 gap/fluidity — 2026-07-17 13:01

Queue (12:54 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) pivot fresh-ground hunting to a new surface — seo/* exhausted
(2) continue whichever surface (1) opens up
(3) keep gap/fluidity current

This file is (3). Full detail in
`w4-broad-hunt-2026-07-17-1300-esign-decline-sign-race-fix.md`.

## This pass — 1 closed, new surface (documents/* e-sign module)

- **CLOSED**: `documents/public/[token]/decline` unconditional-write race
  vs. `sign`'s atomic claim — could silently revert a completed signature
  to declined. Fixed with a scoped atomic claim matching `sign/route.ts`'s
  existing pattern. `219c80c4` (see report for full detail + the mock-bug
  I caught and fixed in the test itself before trusting it).
- Ruled out `consent/route.ts` — unconditional write there is additive
  (timestamp/IP only), not a state-machine correctness bug like decline's.

## Surface status: documents/* partially swept, real ground left

Read and cleared: `sign/route.ts`, `[id]/void/route.ts`,
`[id]/duplicate/route.ts`, `consent/route.ts`. Not yet read this session:
`[id]/route.ts`, `[id]/signers/route.ts` + `[id]/signers/[signerId]/
route.ts`, `documents/route.ts` (list/create), `public/[token]/route.ts`
(public GET). Good next-item-1 candidate for a future pass if this
surface stays open, otherwise pivot again — seo/* and finance/payroll are
both declared saturated as of the 12:35 and 13:00 checkpoints.

## Verification

- `npx tsc --noEmit`: same 2 pre-existing unrelated failures as every
  prior report this session.
- `npx vitest run src/app/api/documents/`: 3 files, 9 tests, green.
- No push, no deploy, no DB write this pass. 1 commit (`219c80c4`).
