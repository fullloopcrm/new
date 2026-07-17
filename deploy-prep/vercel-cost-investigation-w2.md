# Vercel Cost Investigation — W2 findings (file-only proposal)

**Task:** Fleet-wide pivot per 19:45 LEADER->ALL direction. Jeff: get Build CPU
Minutes ($252/cycle) and ISR Writes ($101/cycle) down without hurting SEO.
File-only — nothing here has been applied to prod Vercel settings or pushed.

## Bottom line

The dominant, verifiable cost driver is almost certainly **build frequency**,
not per-page inefficiency. The ISR architecture itself (on-demand generation,
long revalidate windows) was already fixed in an earlier pass
(`platform/VERCEL-COST-OPTIMIZATION-PLAN.md`, Steps 1–3) and looks correctly
implemented today. What was never done is **Step 4 of that same plan** — and
the fleet's own commit velocity makes that gap far more expensive than it
would be for a normal team.

## Finding 1 (high confidence): the fleet's own commit cadence is very likely the #1 Build CPU driver

Evidence:
- `git branch -a` → **122 branches** in this repo.
- Commits in the last 24h, by branch (`git log --since="24 hours ago"`):
  - `p1-w4`: 133, `p1-w1`: 119, `p1-w2` (this branch): 115, `p1-w3`: 98
  - plus `merge-verify-token-into-main`: 26, `deploy/seomgr-verify-token-v2`: 25,
    `feature/seomgr-api-service`: 23, `audit/seomgr-2026-07-16`: 23, and more
  - **504 total commits across the repo in 24 hours.**
- This is a 4-worker (+ more) autonomous fleet, each pushing to its own branch
  continuously, all day, every day.
- If Vercel's GitHub integration is on default settings (build a Preview
  Deployment for every push to every connected branch — which is the
  out-of-the-box behavior), that's several hundred full builds/day of a
  940-page-file Next.js app, none of which are production and none of which
  a human or crawler ever looks at.
- `platform/vercel.json` has no `git.deploymentEnabled` restriction and no
  `ignoreCommand` — nothing currently stops this.

**This did not exist when `VERCEL-COST-OPTIMIZATION-PLAN.md` was written** (that
plan assumes "Jeff commits frequently" as the driver — the actual driver today
is a multi-agent fleet committing 100+ times/day per worker, which is an order
of magnitude more).

### Proposed fix (verified against current Vercel docs, not applied)

Vercel supports restricting automatic deployments per-branch via `vercel.json`,
using minimatch glob patterns (confirmed via docs fetch, `git-configuration`
page, last updated 2025-12-19):

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "*": false
    }
  }
}
```

or, more surgically, keep it opt-out for known deploy/staging branches and
opt-in only `main`:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "deploy/*": true,
      "*": false
    }
  }
}
```

**SEO safety: zero risk.** Preview deployments of worker branches (`p1-w1`
through `p1-w4`, `fix-*`, `audit/*`, etc.) are never linked from sitemaps,
never the production domain, never crawled by Google — killing their builds
has no effect on canonical content, indexed pages, or freshness. Only `main`
(and whatever branch `scripts/deploy.sh` actually promotes to prod — **please
confirm it's `main`, I did not find a second candidate**) needs to keep
building.

**I have not applied this.** Editing `vercel.json`'s deploy-trigger behavior
changes what the *entire fleet's* pushes do — every other worker on every
other branch would stop getting preview builds the moment this merges. That's
squarely "touching prod Vercel build settings" — leader + Jeff gate, per
standing rules. Recommend: leader applies this on `main` directly (not routed
through a worker branch merge) once Jeff confirms which branch is production.

### What I could NOT verify from inside this worktree

I don't have Vercel dashboard/API access this session (not authenticated).
Someone with dashboard access should confirm, before or right after applying
the above: **Vercel → platform project → Deployments tab, filter by
non-main branches, check daily build count.** If that count is in the
hundreds/day, this finding is confirmed directly rather than inferred.

## Finding 2 (confirmed, no action needed): the ISR architecture is already correctly built for low cost

Checked all 203 `generateStaticParams` implementations across every tenant
site under `platform/src/app/site/*`: every combinatorial route (locations ×
services × cities, industries × regions, etc.) already returns `[]` (no
build-time prerendering) with `dynamicParams = true`, and revalidate windows
are already long:
- `2592000` (30 days) — the overwhelming majority of content pages
- `false` (never regenerate, cache forever) — the marketing-services combo
  trees under `consortium-nyc/` and `the-nyc-marketing-company/`
  (explicitly commented "saves ISR writes")
- `604800`/`259200`/`1296000` (7/3/15 days) — job/career pages specifically,
  intentionally short so Google for Jobs sees fresh `datePosted`

This matches Steps 1–3 of `VERCEL-COST-OPTIMIZATION-PLAN.md` and appears to
already be fully executed. **The $101 ISR Writes cost is the expected,
intentional cost of this architecture serving real traffic + crawler
requests against a large programmatic-SEO page space — not evidence of a
remaining bug.** I would not recommend shrinking revalidate windows further;
several are already tuned specifically for SEO freshness (job postings) and
shortening the 30-day windows would only trade a bit of ISR-write cost for
staler content — the wrong direction per Jeff's own stated priority.

## Finding 3 (confirmed, do not touch): the one automated revalidation cron is correctly scoped

`platform/src/app/api/cron/refresh-job-postings/route.ts` runs daily and calls
`revalidatePath(root, 'layout')` on ~26 career-page section roots (one per
tenant + the shared `/site/template` roots). This is deliberately scoped to
career/job sections only — it exists specifically so Google for Jobs sees a
fresh `datePosted` on low-traffic long-tail city pages that would otherwise
never re-render. It is not a mass invalidation and is not a cost problem;
it's the mechanism protecting a specific SEO requirement. **Do not touch this
as part of a cost-cutting pass** — removing/narrowing it would directly
reintroduce the "19-day-old job posting" staleness bug it was written to fix.

## Noticed, not acted on (out of scope for this pass — flagging only)

- `platform/src/app/site/template/virtual-assistant/[location]/page.tsx` sets
  both a real `generateStaticParams` (150 US states+cities) **and**
  `export const dynamic = 'force-dynamic'`. Those two are contradictory —
  `force-dynamic` forces per-request rendering, so the ISR cache/revalidate
  config on this route is likely inert and it's paying Function
  Invocation/Duration cost on every request instead of serving from cache.
  Small dataset (150 params) so it's not a bill-mover, but worth a follow-up
  ticket. Not touched — outside this investigation's two named line items and
  I don't own this file.
- `platform/CLAUDE.md`'s own "Known debt" section flags full per-tenant
  operator clones (`wash-and-fold-nyc` and `wash-and-fold-hoboken`, ~22 pages
  each) as architecture violations pending cutover+deletion. That's ~44 extra
  page files compiled on every build. Real but marginal next to Finding 1;
  the team already has this tracked, not re-flagging as new.
- Root-level `/src/app` (repo root, outside `platform/`) contains ~200 empty
  directory husks left over from a prior reorg into `platform/`; `git
  ls-files` shows only 5 real tracked files under it. Not part of the Vercel
  build (Root Directory is `platform/`) and not a cost factor — mentioning
  only because it looked alarming at first glance and I want the leader to
  know it was checked and ruled out, not missed.

## Summary for leader/Jeff

1. **Confirm which branch is production** (assumed `main`).
2. **Apply `git.deploymentEnabled` restriction in `platform/vercel.json`**
   (snippet above) once confirmed — this is the single highest-leverage,
   zero-SEO-risk lever available, because the cost driver is fleet build
   volume, not app inefficiency. Needs leader+Jeff gate before merge, since it
   changes build behavior for every worker's branch.
3. Check the Deployments tab non-main build count to confirm the hypothesis
   before/after.
4. No code changes recommended to ISR revalidate windows or the job-postings
   cron — both are already correctly tuned and touching them risks the exact
   staleness/SEO regression Jeff wants to avoid.

---

## ADDENDUM (same-session re-pass, resolves the 3 named LEADER checks explicitly)

The 19:45 LEADER→W2 order named three specific checks. Finding 1 above answers
check (2) (preview cadence). This addendum answers checks (1) and (3), which
the original pass above didn't cover, plus one contradiction worth flagging
before anyone acts on Finding 1.

### ⚠️ Contradicts Finding 1 above — check this FIRST, it may make the whole recommendation moot

`LEADER-HANDOFF.md:132` (written 2026-07-11, an earlier W2 overnight handoff)
states as fact: *"Prod branch = main; deploys need `[deploy]` in the commit or
Vercel auto-cancels."* That is a description of an **Ignored Build Step**
already configured — but Ignored Build Step commands are set in the Vercel
dashboard UI, not in `vercel.json`, so nothing in the repo would show it. If
that's accurate and it applies fleet-wide (not just to `main`), it may
**already** be cancelling most of the fleet's non-`[deploy]`-tagged preview
builds, which would substantially undercut Finding 1's "hundreds of wasted
preview builds/day" claim — or it might apply to `main`-only production
promotion and do nothing for preview builds, in which case Finding 1 stands
unchanged. I could not resolve which, because Vercel dashboard/API access is
unavailable in this session (same blocker as the original pass) and I found
no script or repo artifact implementing the `[deploy]`-tag check — it's not
`scripts/deploy.sh` (that's the manual `vercel --prod` promotion script, not a
build gate) and nothing under `.github/workflows/` implements it either (CI
workflows there only run on `push: [main]` / PRs, and only run typecheck/test/
lint — no Vercel calls).
**Action needed before Finding 1's `git.deploymentEnabled` fix is applied:**
someone with dashboard access checks Vercel → `platform` project → Settings →
Git → **Ignored Build Step** and reports back exactly what's configured there
today. If a `[deploy]`-tag gate already exists and covers all branches, the
`git.deploymentEnabled` change may be redundant (or could even be layered on
top, doesn't hurt) — but the dashboard is the only place to find out.

### Check (1): Build cache effectiveness — one concrete, verified gap found

Confirmed via live Next.js docs fetch (not from training memory): **Turbopack
is already the default bundler for both `next dev` and `next build` as of
Next.js 16.0.0** (this repo is on `16.1.6`, `package.json` build script is
plain `next build`, no `--webpack` flag) — so there's no "switch to Turbopack"
lever to pull, that's already the state.

However, the docs also confirm: **`experimental.turbopackFileSystemCacheForBuild`
defaults to `false`** (still beta as of the `16.2.10` docs snapshot). Without
it, Turbopack does not persist its module-graph compilation cache to disk
across builds, so **every single deployment — including repeat builds of the
same branch seconds apart, which is exactly this fleet's pattern — starts
Turbopack's build cache cold.** Vercel does restore `.next/cache/**` between
deployments of the same project+branch by default (standard zero-config
Next.js behavior, nothing in `platform/vercel.json` disables it), but that
restored cache is only useful to the extent the bundler actually reads/writes
build-cache artifacts into it — which Turbopack currently doesn't for builds
unless this flag is on.

**Proposed fix (file-only, not applied):** add to `platform/next.config.ts`:
```ts
const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForBuild: true,
  },
  // ...existing config
}
```
**Caveat, stated plainly:** this is a beta flag per Next's own docs. It should
be validated with a real `next build` locally (compare wall-clock + a second
build to confirm cache hits) and on one non-critical preview branch before
anyone relies on it for `main`. Low risk (build-only, no runtime/output
behavior change) but not a zero-risk toggle — recommend the leader or Jeff
approve a test build before this lands on `main`.

### Check (3): Build-time bloat — nothing large found; one honest non-finding

- `prebuild` (`scripts/verify-protected-tenants.mjs`) is pure `fs` reads
  (middleware source text + directory existence checks), no DB/network calls
  — not a build-time cost contributor. Ruled out.
- No `turbo.json` / this is a single Next.js app, not a Turborepo — so there
  is no per-package remote-cache layer to audit; the only relevant cache is
  Next/Turbopack's own build cache (see check 1 above). The structural
  consequence: **one push touching one tenant's one page still compiles all
  ~25 tenant sites** (52 directories under `src/app/site`) because there's no
  build-graph isolation between tenants. Splitting into a real monorepo
  (per-tenant packages + Turborepo remote cache, only rebuild what changed)
  would fix this at the root but is a significant restructuring project, not
  a file-only proposal — flagging as the long-term structural lever, not
  recommending it now.
- Checked `package.json` for dead/misplaced deps. `vitest`,
  `@vitejs/plugin-react`, `@testing-library/jest-dom`, `@testing-library/react`,
  `jsdom` are listed under `"dependencies"` instead of `"devDependencies"`
  (cosmetic/organizational bug). **Verified this is NOT a real cost lever
  before proposing it as one:** Vercel's default install step runs a full
  `npm install`/`npm ci` (installs `devDependencies` too — needed for `tsc`,
  `eslint`, `tailwindcss`, all of which are already correctly in
  `devDependencies`), so moving these 5 packages wouldn't measurably change
  install time. Worth a cleanup pass someday, explicitly **not** a cost
  finding — flagging only so nobody re-discovers this and assumes it's a fix.
- Spot-checked several deps that looked like candidates for being unused
  (`@fullcalendar/core`, `pdfjs-dist`, `plaid`, `@telnyx/webrtc`) — all are
  genuinely referenced in `src/` (first grep pass missed them on import-syntax
  variance, broader grep confirmed real usage). No dead heavy dependency
  found. Not flagging speculative removals.
- `node_modules` is 768MB uncompressed locally; this tracks with legitimate
  usage (maps: leaflet+react-leaflet+maplibre-gl; calendar: 5 `@fullcalendar/*`
  packages; PDF: pdf-lib+pdfjs-dist; IMAP: imapflow+mailparser; Stripe+Plaid).
  Nothing here reads as build-time bloat to trim.

### Bottom line, restated for the 3 named checks

1. **Cache**: Turbopack is already default; the one real gap is
   `turbopackFileSystemCacheForBuild` defaulting off — proposed above,
   file-only, needs a validated test build before landing.
2. **Preview cadence**: Finding 1 (original pass) stands, but is now gated on
   resolving the Ignored-Build-Step contradiction above — check the dashboard
   before applying `git.deploymentEnabled`.
3. **Bloat**: nothing significant found. `prebuild` is cheap, no dead heavy
   deps, dependency-location issue is real but doesn't move the cost needle.
   The one real structural lever (per-tenant build isolation) requires a
   monorepo restructure, out of scope for a file-only proposal.
