# CSP Rollout — Report-Only → Enforce (phased plan)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. The operational, phased path to shipping a nonce-based CSP
without darking a live page. **No code changed.** This is the sequencing +
per-phase exit criteria + breakage-risk register that turns the *design* in
[`csp-security-headers-spec.md`](./csp-security-headers-spec.md) into a safe rollout.

> **Read `csp-security-headers-spec.md` first.** That doc owns the header audit,
> the code inventory (which origins the CSP must allow), and the exact directive
> strings. This doc does **not** re-derive them — it owns the *rollout mechanics*:
> what order, what gate between phases, what breaks, how you know a phase is done.

> **Honesty flags:**
> - This is a plan, not an executed rollout. **Nothing here has been run.** No
>   violation report exists yet — every "expected violation" below is *predicted*
>   from the static inventory, not measured.
> - The whole reason Report-Only exists is that **I cannot prove zero breakage
>   from a static read.** The 478 JSON-LD blocks + 219 `dangerouslySetInnerHTML`
>   files are too many to hand-verify; the report is the ground truth, this plan
>   is the scaffold around collecting it.
> - **Do not skip to Phase 4 (enforce).** Every phase gate below is a real stop.
>   Enforcing before the report is clean = a live XSS-hardening header that
>   instead breaks structured data, analytics, maps, and possibly sign-in.

---

## 0. The core risk in one paragraph

The moment `script-src` stops allowing `'unsafe-inline'`, **every inline
`<script>` the app emits that lacks the request nonce is blocked by the browser.**
FL emits a lot of them: 478 `<script type="application/ld+json">` structured-data
blocks, a root-layout chunk-reload inline script that runs on *every* page,
PostHog + gtag inline bootstraps, and 219 files touching
`dangerouslySetInnerHTML` (a superset that includes the JSON-LD). Report-Only lets
us turn the CSP *on as a sensor* — it reports what would have been blocked without
blocking anything — so we fix the sinks against real data before we flip to
enforcement. The header is one line. Making 478+ sinks carry a nonce is the work.

---

## 1. Phase map (at a glance)

| Phase | Name | Blocks traffic? | Gate to advance |
|-------|------|:---------------:|-----------------|
| **0** | Static header polish | no | §1a of spec shipped, no CSP yet |
| **1** | Nonce plumbing + Report-Only | **no** | Report-Only header live on all 3 surfaces, `/api/csp-report` receiving |
| **2** | Fix the sinks | no | Report clean across a full representative window (see §5 exit) |
| **3** | Enforce (blocking CSP) | **YES** | Report stays clean post-flip; rollback path proven |
| **4** | Tighten | yes | Optional; only after weeks of stable enforcement |

Phases 1→2 are a **loop**: emit Report-Only, read violations, fix a class of
sinks, re-emit, repeat until the report is clean. Phase 3 is the one-way door.

---

## 2. Phase 0 — static header polish (no CSP)

**Do this independently and first.** It's zero-risk and unblocks nothing else, but
it removes noise so that when CSP violations start arriving they aren't tangled up
with unrelated header changes.

- Expand `Permissions-Policy` per spec §1a (explicit denies for unused features).
- Optionally add `Cross-Origin-Opener-Policy: same-origin` on app surfaces only
  (`/dashboard`, `/admin`, `/team`) — **not** on `/site/*` (breaks YouTube embeds
  and Google OAuth popups).
- Leave the five existing headers (`nosniff`, XFO `DENY`, HSTS, Referrer-Policy,
  Permissions-Policy) in `next.config.ts`. They are static and stay there.

**Exit criteria (Phase 0 → 1):**
- [ ] Permissions-Policy change shipped and visible on a response (curl -I).
- [ ] The existing 5 headers still present (regression-guarded — see the
  `security-headers.test.ts` this worker added; it fails RED if any drop).
- [ ] No CSP header of any kind added yet.

---

## 3. Phase 1 — nonce plumbing + Report-Only (the sensor)

This is the phase that adds machinery but **must not block anything**.

### 3a. What ships in Phase 1
1. **Nonce generation in `src/middleware.ts`** (mechanism per spec §4): one
   base64 nonce per request, set on the request headers (`x-nonce` +
   `content-security-policy`, so Next auto-nonces its own bundle scripts) and on
   the response.
2. **Emit `Content-Security-Policy-Report-Only`** (spec §3b) — the *same*
   directive as the intended production policy, but Report-Only so it **logs and
   never blocks**. Include `report-uri /api/csp-report` (and `report-to` for
   modern browsers).
3. **A `/api/csp-report` endpoint** that accepts the browser's violation POSTs and
   persists/aggregates them (see §3c — this is load-bearing; a report you can't
   read is useless).

> **Critical ordering note:** in Phase 1 the CSP is Report-Only, so inline scripts
> **do not need the nonce yet to keep working** — Report-Only never blocks. The
> nonce plumbing goes in now so that (a) Next's own scripts are already nonced and
> (b) the report accurately reflects what *would* break under enforcement. You are
> deliberately shipping the nonce infra ahead of enforcement.

### 3b. Why Report-Only can't break a page
`Content-Security-Policy-Report-Only` is spec'd to evaluate the policy and fire
violation reports **without enforcing**. A page that would be blocked under
enforcement renders normally under Report-Only. This is the entire safety
property the rollout leans on.

### 3c. The report endpoint is not optional
A Report-Only header pointed at a `report-uri` that drops the POSTs on the floor
gives you *nothing*. `/api/csp-report` must:
- Accept `application/csp-report` and `application/reports+json` bodies (browsers
  differ — Chrome uses `report-to`/Reporting API, older/Safari use `report-uri`).
- Deduplicate — one broken inline script on a high-traffic page will generate
  thousands of identical reports. Aggregate by
  `(blocked-uri, violated-directive, document-uri-path)`.
- Rate-limit / cap ingestion. This endpoint is **unauthenticated and
  browser-driven** → it's a DoS and junk-data target. Cap body size, rate-limit
  per IP, and drop reports whose `document-uri` isn't a host we own (attackers
  will POST garbage). Treat it like any other public write endpoint.
- Record enough to act: `document-uri`, `violated-directive`, `blocked-uri`,
  `script-sample` (Chrome truncates to 40 chars), `source-file`, `line-number`.

**Exit criteria (Phase 1 → 2):**
- [ ] `Content-Security-Policy-Report-Only` present on responses across **all
  three surfaces**: marketing, app (`/dashboard`,`/admin`,`/team`), and tenant
  `/site/*`.
- [ ] `/api/csp-report` is receiving and aggregating real reports (verified by a
  deliberate test violation — e.g. load a page with a known inline script and
  confirm a report lands).
- [ ] Zero user-visible change (no blocked resources; Report-Only by construction).
- [ ] Next's own framework scripts are being nonced (spot-check page source: the
  `/_next/static` script tags carry `nonce=`).

---

## 4. Phase 2 — fix the sinks (the loop)

Read the report. Fix a class of violations. Re-emit. Repeat until clean. Order the
work by **breadth of impact**, cheapest-global-win first.

### 4a. Fix order (by blast radius, widest first)

1. **Root-layout inline script (chunk-reload handler)** — runs on *every* page, so
   it will dominate the report. Nonce it first; one fix clears violations
   site-wide. Highest leverage single change.
2. **JSON-LD (478 blocks) via one shared component.** Do **not** hand-edit 478
   sites. Centralize emission through a single `<JsonLd nonce={nonce} data={…}>`
   (spec §4a, option A) that reads the request nonce, then replace ad-hoc blocks
   with it. This is the largest chunk of the work and the main reason Phase 2 is
   measured in the JSON-LD sink count, not the header.
   - Note the existing near-duplicates the structured-data inventory flagged
     (`theroadsidehelper/_lib/schema.ts`, `we-pay-you-junk/_components/JsonLd.tsx`
     hand-roll their own escaping instead of `safeJsonLd`) — fold those into the
     same shared nonce'd component so there's one JSON-LD path, not three.
3. **Third-party inline bootstraps** — PostHog init, gtag config. Nonce the inline
   `<Script id=…>` blocks; confirm the external `script-src` origins
   (`googletagmanager.com`, `us.i.posthog.com`) appear allowed in the report, add
   any the static inventory missed.
4. **`dangerouslySetInnerHTML` non-JSON-LD uses** — 219 files is a *superset* of
   the JSON-LD blocks; after (2) closes the JSON-LD ones, triage the remainder
   from the report. Some inject HTML (not script) and are governed by other
   directives; some may be genuinely inline `<script>` that needs a nonce or to
   move to an external file. **Do not assume all 219 are JSON-LD** — the report
   tells you which are real script violations.
5. **Map/Leaflet + image/connect origins** — add any `img-src`/`connect-src`/
   `script-src` origin the report surfaces that the static audit missed
   (Leaflet from unpkg, Carto tiles, tenant image hosts).

### 4b. The measurement discipline
- Collect over a **representative window that hits every distinct tenant
  template**, not just nycmaid. Different templates load different third parties:
  only the exterminator has GA, only mobile-salon loads Leaflet from unpkg, only
  some apply funnels load PostHog. A report that's "clean" because low-traffic
  templates were never exercised is a **false green** — the enforce flip will then
  break the untested template. Drive synthetic traffic to each template if organic
  traffic won't cover them in the window.
- Track the report as a **burn-down**: distinct `(directive, blocked-uri,
  path-class)` tuples trending to zero. "Clean" = no *new* distinct violation
  classes for a full window after the last fix.

**Exit criteria (Phase 2 → 3):**
- [ ] Report shows **zero script-src violations** across all three surfaces and
  **every distinct tenant template** over a full representative window.
- [ ] Every inline `<script>`/`<Script>` the app emits carries the nonce
  (root layout, JSON-LD shared component, PostHog, gtag) — verified by page-source
  spot checks on ≥1 page per template.
- [ ] Remaining non-script violations (style/img/connect) are either allowed in
  the directive or consciously accepted and documented — none are surprises.
- [ ] The Clerk check (§6, risk R1) is resolved for the four Clerk segments.

---

## 5. Phase 3 — enforce (the one-way door)

Flip `Content-Security-Policy-Report-Only` → `Content-Security-Policy`
(blocking). **Keep the `report-uri`** so post-enforcement regressions stay visible.

- Flip on the **app/authenticated surfaces first if scoping per-surface**
  (smaller third-party footprint, easier to prove), then `/site/*`. If shipping a
  single `/(.*)` policy, flip all at once but be ready to revert.
- **Rollback = revert the header to Report-Only** (or remove the CSP entirely).
  This is a config/header revert, not a data migration — it's fast and total.
  Prove the rollback path works *before* the flip (practice reverting in preview).

**Exit criteria (Phase 3 done):**
- [ ] Blocking CSP live; report stays clean (no new violation classes) for a full
  window post-flip.
- [ ] Smoke the critical flows under enforcement: marketing page render, JSON-LD
  present in source, sign-in (Clerk segments), a booking/checkout page, a map
  page (Leaflet), analytics beacon firing (PostHog/GA in `connect-src`).
- [ ] Rollback-to-Report-Only verified reversible in preview.

---

## 6. Top breakage-risk register (ranked)

Ranked by likelihood × blast radius. These are the things that turn "enforce" into
an incident.

| # | Risk | Why it breaks | Mitigation |
|---|------|---------------|------------|
| **R1** | **Clerk sign-in on `/dashboard`,`/sign-in`,`/sign-up`,`/join`** | If Clerk client is active it loads `clerk.fullloopcrm.com` + Clerk JS; missing from `script-src`/`connect-src`/`frame-src` → **sign-in dies** under enforcement. Highest single point of failure. | Resolve in Phase 2: verify Clerk's live browser footprint, add its origins to those segments' policy *before* enforce. Spec §6 flags this too. |
| **R2** | **JSON-LD blocked → SEO regression** | 478 blocks; if the shared-component migration misses some, they're blocked silently (crawlers may lose structured data). Not a visible page break → easy to ship blind. | The report catches them as `script-src` violations *if* every template is exercised (§4b). Don't enforce until the JSON-LD burn-down is zero across templates. |
| **R3** | **Root-layout inline script un-nonced** | Runs on every page; if it lacks the nonce under enforcement, **every page** loses its chunk-reload handler → cross-page breakage. | Fix #1 in Phase 2 (§4a). Verify nonce present in root-layout script tag on a spot page. |
| **R4** | **A tenant template never exercised in the report window** | Report looks clean because low-traffic templates got no traffic; enforce flip then breaks that template's specific third party (GA/Leaflet/PostHog). False green. | Synthetic traffic to *every* distinct template during the Report-Only window (§4b). |
| **R5** | **Next major upgrade silently breaks auto-nonce** | Next only auto-nonces its own scripts when it sees a nonce in the `content-security-policy` *request* header; this behavior can regress on a `next` bump. | Re-verify nonce plumbing after any `next` upgrade; keep a page-source assertion in CI if feasible. |
| **R6** | **`/api/csp-report` abused / floods logs** | Public, unauthenticated, browser-driven endpoint; attacker POSTs junk, or one broken high-traffic page floods it. | Rate-limit, cap body size, drop foreign `document-uri`, dedupe (§3c). |
| **R7** | **Stripe embed added later** | Today payment is a full-page redirect to `buy.stripe.com` (governed by `form-action`), so no Stripe frame/script origins are allowed. If someone embeds Stripe Elements later, it breaks under the existing CSP. | Document that adding Stripe.js requires a CSP change (`js.stripe.com` script + `*.stripe.com` frame/connect). |
| **R8** | **`style-src 'unsafe-inline'` misread as a script hole** | The policy intentionally keeps `'unsafe-inline'` for **styles**; a reviewer may "tighten" it onto or off scripts and either break Tailwind/Leaflet or think script-inline is allowed. | Comment the directive: `'unsafe-inline'` is styles-only and accepted; scripts use nonce + `'strict-dynamic'`. |

---

## 7. What this plan does NOT do

- It does not change code, headers, or config. `next.config.ts` and
  `middleware.ts` are untouched.
- It does not prove any phase gate is met — every exit checklist is unrun.
- It does not re-specify the directive strings or origin inventory — those live in
  `csp-security-headers-spec.md` and are the input to this plan.
- It does not resolve Clerk's exact origins (R1) — it schedules that as a Phase 2
  blocker, because it's the most likely thing to break sign-in.

**Bottom line:** ship static header polish now (Phase 0), then the nonce +
Report-Only *sensor* (Phase 1) which cannot break anything, then loop on the
report to nonce the 478 JSON-LD + root-layout + third-party sinks (Phase 2) until
it's clean across every template, and only then flip to blocking (Phase 3) with a
proven header-revert rollback. The gates between phases are the whole point — the
report is ground truth, not this document.
