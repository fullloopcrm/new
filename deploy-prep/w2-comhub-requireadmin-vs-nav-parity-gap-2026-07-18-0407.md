# W2 gap/fluidity refresh — 2026-07-18 04:07

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-pin-owner-header-status-gate-gap-2026-07-18-0355.md`.

Leader's instruction this round (03:56 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface, (2) continue whichever surface (1) opens up, (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: ComHub's entire API surface is gated `requireAdmin()` (Jeff's global PIN only), but its nav entry is exposed to EVERY operator with no permission gate — the same "PIN-owner-token is second-class" theme as last round, one level up the stack

**Finding, not a same-round fix — explained below.**

**What I found:** `dashboard-shell.tsx`'s `navMain` array has 5 top-level items. 4 of them (`Clients`, `Sales`, `Production`, `Finance`, `HR`, `Marketing`) carry a `perm` field (e.g. `'clients.view'`) that hides them from roles lacking that RBAC permission — server-enforced via `requirePermission()` in their API routes. Exactly 3 items carry NO `perm` (meaning: visible to and intended for every authenticated operator regardless of role) — `The Loop` (`/dashboard`), `Messages` (`/dashboard/messages`), `Loop Connect` (`/dashboard/connect`), and `ComHub` (`/dashboard/comhub`). I checked what auth gate backs each of the no-perm items' APIs:

- `/api/dashboard/route.ts` ("The Loop") → `getTenantForRequest()` directly.
- `/api/dashboard/messages/route.ts` ("Messages") → `getTenantForRequest()` directly.
- `/api/connect/messages`, `/api/connect/unread`, `/api/connect/channels` ("Loop Connect") → `getTenantForRequest()` directly.
- **All 20 `/api/admin/comhub/**/route.ts` files ("ComHub") → `requireAdmin()`**, which calls `verifyAdminToken()` — this ONLY returns true for a `role: 'super_admin'` token (Jeff's global PIN, per `admin-auth/route.ts`). It does not accept a `tenant_admin` token (`verifyTenantAdminToken`) and does not accept a Clerk session at all.

**Concrete failure mode:** a real tenant owner (or any team member) logs into their own dashboard — either via `<domain>/fullloop` with their own PIN (the currently-live real-owner-login mechanism per `dashboard/layout.tsx`'s own gate, which explicitly accepts a `tenant_admin` token) or in principle a future Clerk owner session. `DashboardLayout` renders fine (it's the SAME shared shell for everyone, no comhub-specific gate). They see "ComHub" in the sidebar — no lock icon, no role restriction, indistinguishable from "The Loop" or "Messages." They click it. **Every single API call the ComHub page makes — loading threads, sending a message, viewing a contact's notes, everything — 401s**, because `requireAdmin()` only accepts Jeff's own global PIN token, which a real tenant owner never has. The feature is present, discoverable, and completely non-functional for the exact user class it's nominally built for.

**Why I didn't fix this outright (same-round, code+tests) like every prior round's item (1):**

1. **The correct fix touches 20 route files spanning real cost-bearing actions** — `send` (SMS/email dispatch), `yinez/send` (AI-agent-driven send), `voice/dial` / `voice/control` / `voice/token` (places/manages live Telnyx calls, billed per-minute). Swapping `requireAdmin()` for `getTenantForRequest()` (the mechanical, sibling-pattern-matched fix — see below) doesn't just fix a data-correctness bug, it **expands who can trigger billable telephony/SMS/email sends** — every existing tenant with a PIN-authenticated owner/team member would immediately gain live-dial and live-send capability the moment this ships, with no rollout gate, no cost review, no confirmation this is what Jeff wants turned on right now for the whole fleet at once.
2. **A prior, independent audit already looked at these exact routes and treated `requireAdmin()` as the accepted design**, not a bug: `deploy-prep/cross-tenant-leak-register.md` (line ~1322) explicitly notes `admin/comhub/contacts/[id]/notes` (PATCH) and `admin/comhub/contacts/[id]/context` (GET) as "`requireAdmin()` (Jeff-only super_admin token, confirmed via...)" without flagging it as broken. That audit was scoped to cross-tenant leak risk (does the isolation check pin `tenant_id`), not to "is this reachable by the tenant it belongs to" — a different question — but it means I'm not the first pass over this code, and the two of us reached opposite framings. That divergence itself is a signal this needs Jeff's read, not a second unilateral guess.
3. **The two readings that resolve this differently both look plausible from the code alone:** either (a) the nav is right and the auth is the bug — ComHub should work like its no-perm siblings and needs `getTenantForRequest()`, or (b) the auth is right and the nav is the bug — ComHub is deliberately Jeff-only for now (early rollout / cost control / whatever reason) and the sidebar item should be hidden behind an admin-only check (or a `perm` most tenants don't have) instead of shown to everyone. I can't tell which from the code, and guessing wrong in either direction has real consequences — silently exposing billable comms to every tenant, or silently hiding a legitimate resolver-pattern fix behind "not touching it."

This is the same shape as carried-forward item #16 (`webhooks/stripe` never calling `activateTenant()`) and #18-20 — a real, structural, evidence-backed finding where the mechanically "obvious" fix has a product/cost dimension I can't unilaterally resolve. Flagging per that same precedent rather than forcing a 20-file auth change into a "file-only, no push/deploy/DB" round.

**If/when this gets a green light, the fix is mechanical and low-risk to implement** (well-precedented — literally copy the pattern `/api/dashboard/route.ts` already uses): replace `const authError = await requireAdmin(); ...; const tenantId = await getCurrentTenantId()` with `const { tenantId, tenant, userId } = await getTenantForRequest()` (wrapped in try/catch for `AuthError`, matching every other `getTenantForRequest()` consumer) across the 20 files, most likely gated on Jeff choosing a rollout path (e.g. per-tenant feature flag first, or a `comhub.*` RBAC permission pair with defaults, rather than an instant fleet-wide flip) rather than an unconditional swap.

## (2) — swept for siblings: this is the ONLY no-perm nav item with this mismatch; no other resolver-adjacent access gate skipped

Checked all 3 other no-`perm` nav items (`The Loop`, `Messages`, `Loop Connect`) — all three correctly use `getTenantForRequest()`, so they already work for real (non-impersonated) tenant PIN owners exactly as intended; ComHub is the sole outlier. Also checked every `perm`-gated nav item's backing routes for the analogous mismatch (does the API's auth gate agree with the nav's declared permission model) — all of them route through `requirePermission()`/`getTenantForRequest()`, none use `requireAdmin()`. Also re-confirmed (per the last two rounds' own sweeps) that `getHeaderTenant()`/`getTenantForRequest()`'s status-gate fix from the last round has no other unguarded consumer — nothing new there. Nothing further opens up from this specific surface beyond the one already-flagged item above.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–16, 21, 23, unchanged (see prior rounds' docs for full list, most recently restated in `w2-pin-owner-header-status-gate-gap-2026-07-18-0355.md`).

NEW this round (flagged, not fixed — see (1) above for why):

30. ComHub's entire API (20 route files under `/api/admin/comhub/**`) is gated by `requireAdmin()` (Jeff's global PIN only), while its `/dashboard` nav entry carries no `perm` field — identical access posture to `The Loop`/`Messages`/`Loop Connect`, all three of which correctly use `getTenantForRequest()` and so DO work for real PIN-authenticated tenant owners. A real (non-impersonated) tenant owner sees ComHub in their nav and gets a 401 on every request the moment they open it. Mechanical fix is well-precedented (swap to `getTenantForRequest()`, matching the 3 sibling nav items) but touches cost-bearing send/dial/token routes across 20 files — needs Jeff's call on whether to open ComHub to all tenants unconditionally or gate the rollout (feature flag / new RBAC permission with chosen role defaults) before flipping it fleet-wide.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

No code changes this round — investigation-and-flag only, per (1) above. `npx tsc --noEmit` confirmed clean before and after (no diff to verify against); working tree has no changes to `src/`. File-only, no push/deploy/DB write from this worker. 1 docs commit (this file) — no code+tests commit, a deliberate deviation from the usual per-round shape, called out explicitly in the LEADER-CHANNEL report.
