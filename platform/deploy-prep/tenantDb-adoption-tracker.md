# tenantDb() adoption tracker — running, cross-lane

Compiled by W1 from LEADER-CHANNEL.md self-reports (through 2026-07-12 19:50 leader
order). Each lane runs in its own unmerged git worktree/branch — I can only directly
verify **p1-w1** (this worktree); everything else below is transcribed from what each
lane self-reported, not independently confirmed. Treat non-W1 rows as "claimed," not
"proven." Re-run this compile after each lane's next report; do not let it go stale.

Since 19:49 the leader split the *tenantDb()* rollout into 4 namespace lanes. **W2's**
work (65+ conversions) predates that split and is NOT namespace-scoped — it cuts across
almost every namespace below, which is exactly why the collisions in §3 exist.

## 1. Converted, by lane

### W1 — admin/dashboard (this worktree, p1-w1) — 15 routes
| Route | Commit |
|---|---|
| `/api/notifications` | a9d2ea96 |
| `/api/sidebar-counts` | 3849b7df — **COLLISION, see §3** |
| `/api/connect/messages` | 8d2242f4 |
| `/api/connect/channels` | e6b4b01f |
| `/api/dashboard/messages` | 25c2a532 |
| `/api/admin/businesses/[id]` | 7c4a13d9 |
| `/api/admin/businesses/[id]/profile` | 7c4a13d9 |
| `/api/admin/businesses/[id]/users` | 7c4a13d9 |
| `/api/admin/businesses/[id]/site-export` | 7c4a13d9 |
| `/api/admin/tenants/[id]` | 7c4a13d9 |
| `/api/dashboard/hr/[id]/notes` | 50cf0402 |
| `/api/dashboard/hr/[id]/documents` | 50cf0402 |
| `/api/dashboard/schedules/import` | 50cf0402 |
| `/api/admin/schedule-issues` | 50cf0402 (despite the `/admin/` path this is an owner route — `getTenantForRequest`, not `requireAdmin`) |
| `/api/dashboard/onboarding` | 50cf0402 |

### W3 — portal/booking (p1-w3) — 10 routes
| Route | Commit |
|---|---|
| `/api/referrals` | f3a1edaf |
| `/api/quote-templates` | 0ea80876 |
| `/api/domain-notes` | f4dcbf00 |
| `/api/cleaners` | b7c1867e |
| `/api/sidebar-counts` | 425a86ba — **COLLISION w/ W1, see §3** (already banked/ack'd in-channel, left untouched by both sides) |
| `/api/recurring-expenses` | d981725b — **COLLISION w/ W2, see §3** |
| `/api/leads/block` | 5ddc87fe |
| `/api/announcements/unread` | f51a68a5 (partial, by design) |
| `/api/waitlist` | 93846d1d |
| `/api/crews` | 4c542658 — **COLLISION w/ W2, see §3** (also fixed a real cross-tenant PATCH bug — setMembers ran unconditionally on caller's crew id) |

As of 19:33 W3 had not yet reported its 19:49-ordered next-5 for portal/booking —
not in this compile.

### W4 — client/selena (p1-w4) — 0 route conversions so far
No `tenantDb()`-converted **routes** reported yet. W4's tenantDb-related work to date
is test coverage for the wrapper *primitive itself* (dcc73663..3fdcaa39: auto
tenant_id filter + write-stamp override, alongside secret-crypto/team-portal-auth/
require-permission/admin-pin/getTenantFromHeaders) — no live route files touched. No
collision risk from W4 yet; revisit once client/selena conversions land.

### W5 — chat/availability/schedule (p1-w5) — 0 routes wired (35 unwired proofs)
**Different mechanism, flagged by W5 itself as a naming collision risk**: W5 is not
using `tenantDb()` — it built a separate `tenantClient(tenantId)` (JWT/RLS-prep,
`platform/src/lib/tenant-client.ts`) and is proving conversions in an **unwired,
reversible proof directory** (`platform/src/lib/tenant-client-proof/`), never touching
the real `src/app/api/**/route.ts` files. 35 read routes proofed (incl. `sidebar-counts`,
`crews`, `recurring-expenses` — the same 3 routes flagged in §3, but as unwired stubs,
not live edits) against an estimated ~298 CONVERT-tier population. 0/298 actually cut
over. No live-file collision today; becomes one the moment W5's proofs get wired into
real routes — check §3's three names again before wiring.

### W2 — cross-cutting, pre-namespace-split (p1-w2) — ~75/498 (last self-report)
Not one of the 4 namespace lanes; started before the 19:49 split and its rollout spans
every namespace below. Selected admin/dashboard-relevant subset (full list is much
longer — see `tenantdb-conversion-progress.md` on p1-w2 for the authoritative list):
`dashboard/hr/[id]` (base route — **adjacent, not identical**, to W1's `hr/[id]/notes`
and `hr/[id]/documents` siblings; same directory family, watch it), `dashboard/import/
batch/[id]`, `admin/comhub/threads`, `admin/comhub/contacts/[id]/context`, `admin/
comhub/contacts/[id]/notes`, `admin/recurring-schedules(+/[id]/regenerate)`, `admin/
analytics/live-feed`, `admin/find-cleaner/recent`. Plus dozens more outside admin/
dashboard (finance/*, clients/*, bookings/*, invoices, quotes, jobs, documents,
campaigns, deals, settings, catalog, team, crews, recurring-expenses — the last two are
this tracker's §3 collisions).

## 2. Remaining (per last self-reports)

- **W2**: reported 461/498 unconverted as of its last progress doc (183 tenant-in-hand
  EASY / 213 HARD / 65 no-DB no-op tier); its own count is stale relative to its later
  commits (own admission) — treat as directional, not exact.
- **W1 (admin/dashboard)**: this worktree has ~140 remaining `supabaseAdmin`-using
  files under `/api/admin/*` + `/api/dashboard/*`; most are either cross-tenant BY
  DESIGN (platform-wide `admin/*` dashboards with optional `tenant_id` query param —
  e.g. `admin/calendar`, `admin/websites`, `admin/tenant-chats`; global tables like
  `tenants`/`leads`/`prospects`) or caller-derives-tenant-from-row shapes where the
  wrapper adds no isolation (same exemption class W2 documented). Have not yet
  exhaustively re-triaged the full remainder against those exemption classes.
- **W3/W4/W5**: no aggregate remaining counts self-reported for their namespaces yet
  (W5's ~298 CONVERT-tier estimate is platform-wide, not scoped to chat/availability/
  schedule specifically).

## 3. Collisions — same file touched independently by two lanes

| Route | Lane A | Lane B | Status |
|---|---|---|---|
| `/api/sidebar-counts` | W1 (3849b7df) | W3 (425a86ba) | Acknowledged in-channel ("ACK sidebar-counts collision banked, left untouched") — W3 closed a real gap (connect_messages/connect_read_cursors unread-count leak) that W1's earlier pass missed. **Needs a manual 3-way merge decision** (keep W3's version, it's the more complete fix) when p1-w1/p1-w2 land. |
| `/api/crews` | W2 (~99b5e851-era batch) | W3 (4c542658) | Not yet acknowledged in-channel. W3's version also fixes a real bug (PATCH cross-tenant `setMembers` write) that W2's conversion did not. **Needs a merge decision** — take W3's version, or port its bugfix onto W2's. |
| `/api/recurring-expenses` | W2 (a3f69140) | W3 (d981725b) | Not yet acknowledged in-channel. Both are plain mechanical GET conversions — lower merge risk than crews, but still two independent diffs on the same file. |

No W1×W4, W1×W5(live), W3×W4, or W3×W5(live) collisions found — W4 hasn't converted
routes yet and W5's conversions are unwired proofs in a separate directory, not edits
to the real route files (see W5 section above for the 3 routes that *would* collide
the moment they're wired: sidebar-counts, crews, recurring-expenses — all 3 already
appear in this table).

## 4. Aggregate

15 (W1) + 10 (W3) + ~75 (W2, includes some W1/W3 namespace overlap counted above) +
0 wired (W4) + 0 wired / 35 unwired proofs (W5) against a ~498-route platform. Lanes
are on unmerged branches — these numbers do not sum cleanly into a single "X/498"
until a merge reconciles the 3 collisions above and re-counts on the merged tree.
