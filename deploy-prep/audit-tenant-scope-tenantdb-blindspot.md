# audit-tenant-scope.mjs false-positive blind spot: `tenantDb()`-wrapped calls

**Status:** FILE-ONLY finding + doc. No code changed in `scripts/audit-tenant-scope.mjs`
(shared across all worker branches — not modified here to avoid changing another
worker's passing/failing gate result out from under them without leader
sign-off). This is a recommendation for Jeff/leader review, not an applied fix.

## What I was doing when I found this

Continuing the RLS-gap backlog item on this pass. `rls-pass7-migration-proposal.md`
already concluded pass-8 is blocked — the remaining 8 gap tables all need a live
prod `\d` read that no file-only pass can do (no tracked `CREATE TABLE` for
`projects`, `settings`, `document_fields`, `document_activity`,
`booking_cleaners`, `cleaners`, `cleaner_payouts`, `member_pin_reset_codes`).
That's still true — I don't have prod DB access either, so I'm not forcing a
hollow pass-8. Instead, while doing this turn's tenantDb conversions I ran
`node scripts/audit-tenant-scope.mjs` (the app-layer tenant-isolation gate) for
the first time against this branch and found something worth flagging in the
same "tenant scoping" problem space.

## The finding

Running the audit fresh on `p1-w4` right now reports:

```
✗ tenant-scope guard: 34 NEW unscoped queries on tenant tables
```

I checked all 34. **Every single one is a `tenantDb(...)` call, not a raw
`supabaseAdmin` call.** Example (`portal/feedback/route.ts:15`):

```ts
const { data, error } = await tenantDb(auth.tid)
  .from('reviews')          // <-- flagged as "unscoped"
  .insert({ client_id: auth.id, booking_id: booking_id || null, ... })
```

`tenantDb()` auto-stamps `tenant_id` on insert and auto-filters `.eq('tenant_id',
…)` on select/update/delete (`src/lib/tenant-db.ts`) — this row genuinely
cannot cross tenants. It's a false positive, not a real gap.

### Root cause

`scripts/audit-tenant-scope.mjs`'s scoping check (lines ~76-84) is a text
heuristic:

```js
const chain = lines.slice(i, i + 12).join('\n')
const scoped = /tenant_id/.test(chain)                       // literal text match
const idLookup = /\.(eq|in)\('(id|[a-z_]*_id|...)'\s*,/.test(chain)
```

It scans 12 lines **forward** from the `.from('table')` line looking for the
literal substring `tenant_id` or a trailing `.eq('*_id', …)` / `.in('*_id', …)`
row lookup. `tenantDb(auth.tid)` sits *before* `.from(...)` in the chain and
never contains the literal string `tenant_id` (it's `tenantDb(auth.tid)` —
`auth.tid`, not `tenant_id`), so the heuristic can't see it. Calls that
happen to retain an `.eq('client_id', …)` / `.eq('id', …)` after `.from()`
pass by accident (via `idLookup`), not because the script understands
`tenantDb()`. Bare `tenantDb(x).from('table').insert({...})` with no
following `.eq`/`.in` — the common shape for a create endpoint — always trips
it.

### Why this matters

1. **Signal loss.** The baseline (`scripts/.tenant-scope-baseline.json`) is
   intentionally `[]` — "drive isolation debt to ZERO, no grandfathered
   debt" (commit `d1beff06`). With 34 false positives sitting in that empty
   baseline, a genuinely new *raw* `supabaseAdmin` leak introduced tomorrow
   would print as finding #35 in a wall of 34 known-safe noise — much easier
   to miss in a CI diff or scrollback than in a truly-clean 0/0 gate.
2. **Every worker converting routes to `tenantDb()` this session is likely
   hitting the same wall on their own branch**, especially for POST/insert
   endpoints (crew/schedule change requests, message sends, log writes) where
   there's no natural trailing `.eq(id)` to accidentally satisfy the
   heuristic. Some prior channel reports this session claim "audit gate
   clean 0/0" after doing `tenantDb()` conversions — those were true on
   *their* branch at the time they ran it, most likely because their
   specific conversions happened to retain an id-lookup chain (or they ran
   the audit before hitting an insert-shaped one). This isn't a claim that
   any specific report was wrong; it's that the gate's false-positive rate
   depends on query shape in a way that isn't obvious from the tool's output.
3. **Not a real security gap.** I want to be precise about severity here —
   every flagged line I checked already had correct tenant isolation via
   `tenantDb()`. This is a tooling accuracy problem, not a data leak.

## What I did about it on my own new lines

The 3 tenantDb conversions I landed this pass (`team-portal/crew/earnings`,
`portal/bookings`, `team-portal/travel-times`) added exactly **one** new
false-positive: `portal/bookings/route.ts`'s POST insert (no trailing
`.eq`/`.in`). I silenced that one line with the script's own documented
escape hatch:

```ts
.from('bookings') // tenant-scope-ok: tenantDb() stamps tenant_id on insert; audit heuristic doesn't parse the wrapper
```

Re-ran the audit after: **0 new findings from my changes** (33 pre-existing,
unrelated to this pass — see below). I did **not** touch the other 33 lines
or the script itself — that's a broader, cross-branch decision for the
leader/Jeff, not something to do unilaterally mid-backlog-item on one
worker's branch.

## Recommendation (not applied)

Two options, in order of preference:

1. **Teach the script to recognize `tenantDb(...)` as a scoped call site.**
   E.g. treat any chain containing `tenantDb(` as scoped, same as it already
   treats a literal `tenant_id` match. This directly closes the blind spot
   instead of requiring a `tenant-scope-ok` comment on every `tenantDb()`
   insert going forward — the current escape hatch works but doesn't scale
   to dozens of routes across 6 worker branches.
2. **If the fleet prefers to keep the heuristic dumb on purpose** (e.g. to
   force a human glance at every new `.from()` call), then the 33
   pre-existing findings on this branch should get `tenant-scope-ok`
   annotations in a dedicated pass so the gate returns to a true 0/0 and
   stays useful as a tripwire — I'd flag this as a good candidate for a
   future backlog item once the leader confirms which branch's version of
   these files is canonical (several are duplicated with different
   conversion states across `p1-w1` through `p1-w6`).

Full list of the 33 pre-existing (not-mine-this-pass) findings on `p1-w4`,
all confirmed `tenantDb()`-wrapped, for whoever picks this up:

```
portal/services/route.ts:15 [service_types]
booking-notes/route.ts:44 [booking_notes]
selena/route.ts:28 [sms_conversations]
selena/route.ts:81 [notifications]
selena/route.ts:172 [sms_conversation_messages]
client/smart-schedule/route.ts:59 [team_members]
client/collect/route.ts:34,46,64,91,110 [clients/referrers]
client/bookings/route.ts:30,42 [clients]
client/book/route.ts:84,92,101,131,255,378,412 [clients/referrers/bookings/email_logs/deals]
client/verify-code/route.ts:34,50,59,78,97 [verification_codes/clients]
client/check/route.ts:11,20 [clients]
client/login/route.ts:37 [clients]
client/reschedule/[id]/route.ts:79 [email_logs]
client/recurring/route.ts:117,167,184 [recurring_schedules/bookings/booking_team_members]
```

No DDL run, no push, no script mutation. FOR-JEFF-REVIEW.
