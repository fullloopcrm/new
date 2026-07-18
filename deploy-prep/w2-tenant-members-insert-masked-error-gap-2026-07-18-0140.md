# W2 gap/fluidity refresh — 2026-07-18 01:40

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-stripe-subscription-deleted-plus-accept-invite-masked-write-gap-2026-07-18-0125.md`.

Leader's instruction this round (01:36 LEADER->W2): "Good closure on the subscription-deleted masked-error gap (worse than siblings, buried inside a catch that would've swallowed even a throw) plus the accept-invite.ts sibling, and confirming all other tenant-status write sites are already hardened." Fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `createTenantFromLead()`'s owner-PIN insert handed the admin a dead PIN with zero signal

**Bug found:** Swept every `tenant_members` insert call site repo-wide (the write family adjacent to last round's `accept-invite.ts` fix) for the same masked-error shape. Found `src/lib/create-tenant-from-lead.ts`'s owner-PIN provisioning insert: wrapped in try/catch, but supabase-js resolves DB errors (RLS deny, constraint violation) into the call's returned `error` field rather than throwing — the catch only ever fires on a thrown exception (network-level failure), never on a genuine DB-level rejection. `ownerPin` stayed set to a real-looking 6-digit string with no matching `tenant_members` row, and the function still returned `{ ok: true, ownerPin }` as if provisioning succeeded.

Consequence, traced to an actual UI: `POST /api/admin/requests/convert` (manual comp/override tenant conversion) returns `result.ownerPin` verbatim, and `admin/sales/LeadsPanel.tsx` displays exactly that field for the admin to copy and relay to the new tenant owner. A DB blip on this one insert meant the admin confidently handed the owner a PIN that could never log in — no error banner, no signal, `ok:true` throughout. (`activateTenant()`, which always runs immediately after in both callers of `createTenantFromLead`, would separately notice no owner member exists and provision a correct new PIN via its own already-checked insert — but that lands in the response's `activation.ownerPin` field, which `LeadsPanel.tsx` never reads. See Noticed #17 below.)

**Fixed:** check the insert's own `error` and null out `ownerPin` on failure (matching the existing catch-block behavior for thrown exceptions), so a failure now looks like "no PIN issued" instead of "here's a PIN that works."

## (2) — continued: swept the rest of the `tenant_members` insert family, found and closed `accept-invite.ts`'s remaining gap

Grepped every `.from('tenant_members').insert(` site repo-wide. Ruled out `api/admin/businesses/[id]/users/route.ts`, `api/admin/users/route.ts`, `api/tenants/route.ts`, and `lib/activate-tenant.ts` — all four already check the write's error correctly. One more genuine gap, already flagged but not acted on: last round's doc (item #15) noted `accept-invite.ts`'s `tenant_members` insert (the branch un-gated by `if (!existingMember)`) had zero error handling, tentatively scored as lower severity ("caught on next login via `getCurrentTenant()`'s own membership lookup"). Re-examining the actual consequence: a failure there falls through to mark `tenant_invites.accepted=true` and activate the tenant regardless — leaving the admin with no membership row AND an invite permanently stuck at `accepted:true`, which `lookupInvite()`'s `already_accepted` check then blocks from ever being retried. Not "caught on next login" — an unrecoverable silent lockout, same severity class as the writes fixed the last two rounds in this same file.

**Fixed:** check the insert's `error` and throw before either downstream write (invite-accept, tenant-activate) runs, so a failure keeps the invite unaccepted and the join link retryable — same pattern as every other write fix in this file.

**Considered, not touched:**
- All other `tenant_members` insert sites (4 checked above) confirmed already-hardened from prior rounds. No further siblings found.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval.
8. `src/lib/lead-filters.ts` — ~90% dead code; 3 bespoke tenant clones each hardcode their own `OWNED_HOSTS`. Open product/architecture question, not acted on.
9. `tenants.domain` still has no DB-level unique constraint. Flagged as a DB migration candidate, not acting — gated on Jeff's approval.
10. `cron/tenant-health/route.ts`'s tie-break among 2+ non-primary active `tenant_domains` rows is non-deterministic — low value, flagged not acted on.
11. `src/lib/nycmaid/sms.ts`'s best-effort auto-opt-out tenant-by-phone lookup — deliberately best-effort/non-critical, not escalating without a product call.
12. Stripe webhook's other `.update()` calls (bookings, admin_tasks, team_members, prospects, deals — non-tenant tables) throughout `webhooks/stripe/route.ts` don't check their write's own returned `error` either — broader than tenant *state*, out of this lane's scope. Flagging, not acting.
13. `invoice.paid`/`invoice.payment_failed` resolve by `owner_email` with `.maybeSingle()`, which throws (now loud) if two tenants ever share an `owner_email` — no DB-level unique constraint on that column. Not acting.
14. `customers.retrieve()`'s best-effort swallow in `customer.subscription.deleted` — external Stripe API call, not our DB masking its error. Not touching an existing Stripe-API-resilience decision without a product call.

CLOSED this round:
15. ~~`accept-invite.ts`'s `tenant_members` insert unchecked error~~ — fixed above (2).

NEW this round:
16. `activateTenant()`'s `ownerPin` field, returned in both `createTenantFromLead` callers' responses under `activation.ownerPin`, is never read by any frontend. `admin/sales/LeadsPanel.tsx` only reads the top-level `ownerPin` field (the one just hardened above). So on a genuine `createTenantFromLead` PIN-insert failure, the admin now correctly sees no PIN (instead of a dead one) — but a real, working PIN was likely just minted by `activateTenant`'s fallback owner-member creation and sits unsurfaced in the API response. UX-friction, not a correctness bug (nothing false is displayed anymore) — flagging as a follow-up: either have `LeadsPanel.tsx` fall back to `activation.ownerPin` when the top-level one is null, or surface an explicit "PIN issue — check the tenant's Users tab" message. Frontend display change, not acting without a product/UX call.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
17. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist.

New this round: see #16 above (filed under this section too — it's UX-friction, not a correctness bug).

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- Fixed 2 tenant_members-insert write call sites across 2 files: `lib/accept-invite.ts`, `lib/create-tenant-from-lead.ts`.
- 3 new test cases across 2 test files: `lib/accept-invite.test.ts` (1 new MASKED-ERROR PROBE case added to the existing file), `lib/create-tenant-from-lead.test.ts` (new file, 2 cases: happy-path PIN issuance + MASKED-ERROR PROBE) — each proves a genuine DB failure on the insert now either throws (accept-invite) or nulls the PIN (create-tenant-from-lead) instead of the old silent "looks like success" behavior.
- Full repo suite: 693 files, 2971 passed, 37 skipped, 1 failed-in-full-run/passed-in-isolation (`finance-export.test.ts`'s 200k-row pagination test timed out under full-suite parallel load only — confirmed pre-existing/unrelated: passes standalone in 4s, no file this round touches finance-export.ts).

File-only, no push/deploy/DB write from this worker. 2 code commits this round (2 fixes + their tests, split across 2 commits matching the 2 files touched) + 1 docs commit (this file).
