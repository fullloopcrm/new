# POST-DEPLOY PROBES — prove-it commands, grouped by deploy phase A→D

**What this is.** For each fix shipped in the WAVE-2 isolation/auth release, the
**exact LIVE command** to prove it is real in prod, plus the **expected result**,
ordered to the phased deploy in `deploy-prep/deploy-runbook.md` (A→B→C→D). Run the
probes for a phase **immediately after that phase deploys** — they are the concrete
form of each phase's "Probe to run after" / "Go / No-Go" section in the runbook.

**Read-only.** Every command here is a `curl`, a `vitest` run, a `dig`, a read-only
`SELECT`/`\d`, or a `gh`/CI status check. Nothing writes prod data. The auth-brute
and isolation probes POST to auth/chat endpoints but are designed to be **rejected**
— they create no session and no tenant row.

**Relationship to the W4 master.** W4 authored a fix-by-fix master,
`w4-post-deploy-verification.md` (sections §1–§9, in `flwork-p1-w4` / `/tmp`). That
doc groups by fix TYPE and carries the fuller honesty/limitation notes per fix.
**This doc re-orders the same probes onto the phase gates** so each phase can be
proven before the next deploys. Where a probe maps to a W4 section, the `[W4 §n]`
tag points at that section for the extended notes. If the two ever disagree on a
command, treat W4's master as authoritative for the command text and fix this file.

**Honesty note (unchanged from W4).** Almost none of these were runtime-verified
pre-deploy — the file-only/audit worktrees carry no prod DB creds and booting the
app hits prod Supabase. These convert "green on a branch" into "proven in prod."
Where a check is black-box-limited, it says so and points at the unit regression
test that IS the proof.

---

## 0. Set once, before you start

```bash
export DEPLOY_URL="https://fullloopcrm.com"     # platform prod origin (confirm w/ Jeff which deploy is prod)
export PLATFORM_HOST="fullloopcrm.com"
export PROD_DB_URL="postgresql://..."           # same conn string the leader used for 060/061/062 — read-only here
# platform vitest smoke suites need deps:
#   cd platform && npm install
```

Phase gates are **sequential** — do not run Phase B probes until Phase A is all-green,
etc. A STOP anywhere blocks the "proven in prod" claim for that phase and everything
downstream.

---

# PHASE A — migrations 060/061/062 + RLS commit + reconcile/CI gate

Non-behavioral. Prove the four DB objects the later phases depend on exist, the RLS
catch-up matches prod, and the drift/CI gates are live and green.

### A1. `061` journal dedup unique index — ledger TOCTOU fix `cba595e` · `[W4 §1a]`
```bash
psql "$PROD_DB_URL" -c "\d journal_entries" | grep -i uq_journal_entries_tenant_source
```
**Expect:** a line `"uq_journal_entries_tenant_source" UNIQUE ... (tenant_id, source, source_id) WHERE (source_id IS NOT NULL)`.
Missing → concurrent refund/dispute/deposit can still double-post. **STOP.**
(Full end-state also encoded in `migration-verify.sql` `061.POST`.)

### A2. `062` `inbound_emails.tenant_id` column — inbound-email scope fix `42b5a39` · `[W4 §1b]`
```bash
psql "$PROD_DB_URL" -c "\d inbound_emails" | grep -i tenant_id
```
**Expect:** `tenant_id | uuid` present (FK → tenants). Missing → the scoped insert
has no column to write and inbound email is unscoped. **STOP.**

### A3. `060` SECURITY DEFINER RPC lockdown — cross-tenant ledger forgery fix `e1a9e33` · `[W4 §1c]`
```bash
psql "$PROD_DB_URL" -c "\df+ post_journal_entry"   | grep -iE "authenticated|service_role|Access"
psql "$PROD_DB_URL" -c "\df+ cpa_token_bump_usage" | grep -iE "authenticated|service_role|Access"
```
**Expect:** EXECUTE granted to `service_role` only — **NOT** `authenticated` / `anon`
/ `PUBLIC`. If `authenticated` still has EXECUTE, a tenant can forge cross-tenant
ledger entries by passing another `tenant_id` as an arg. **STOP.** If `service_role`
LOST execute, ledger writes are broken — re-grant immediately (runbook rollback row A).

### A4. RLS catch-up commit matches prod (defense-in-depth)
The 15-table RLS enable was already RUN on prod; Phase A only commits the file so
`main` matches. Confirm RLS is on:
```bash
psql "$PROD_DB_URL" -c "SELECT relname FROM pg_class WHERE relrowsecurity=false AND relkind='r' AND relnamespace='public'::regnamespace ORDER BY relname;"
```
**Expect:** none of the 15 previously-OFF tables appear (list per `2026_07_11_enable_rls_gap_tables.sql`).
App is service-role so this is defense-in-depth only — a miss here is not a live leak,
but flag it. **No new prod write happens in this step** (file catch-up only).

### A5. Reconcile drift gate — THIS LANE (`platform/scripts/reconcile-tenant-config.mjs`)
Local read-only run against live config (needs the Supabase Management-API token in env):
```bash
cd platform && SUPABASE_ACCESS_TOKEN_FULLLOOP="<token>" node scripts/reconcile-tenant-config.mjs; echo "exit=$?"
```
**Expect:** report prints, **`exit=0`** and **NO `CRIT` drift** lines. Any `CRIT` =
a domain→tenant→site→vercel_project disagreement is live → resolve the divergent row
before Phase B (the flip makes `tenant_domains` authoritative — a wrong row becomes a
mis-route the instant it lands). Without the token the script prints
`... absent — skipping (exit 0)` and proves **nothing** — that is a pass-without-check,
so the token MUST be present for this probe to count.

### A6. CI + reconcile workflow green on the push
```bash
gh run list --branch main --limit 8 \
  --json workflowName,status,conclusion,headSha \
  | jq -r '.[] | "\(.conclusion // .status)\t\(.workflowName)"'
```
**Expect:** the runs for **CI** (`ci.yml`) and
**tenant-config-reconcile** (`tenant-config-reconcile.yml`) all `success` on the
Phase-A merge SHA. (A separate `tenant-scope` run, `tenant-scope.yml`, no longer
exists as of 2026-07-17 — it was a pure duplicate of ci.yml's own
"Tenant-isolation guard" step; do not wait on it.) For the reconcile job to
actually check (not skip), the Vercel/Actions
secret `SUPABASE_ACCESS_TOKEN_FULLLOOP` must be set — confirm it is:
```bash
gh secret list | grep -i SUPABASE_ACCESS_TOKEN_FULLLOOP
```
**Expect:** the secret is listed. Absent → reconcile is a green no-op (token-guard exit 0).

### A6-prereq / data-prep in this window (GATES later phases — prove before their phase)
These prod writes may run in the Phase-A window but their **behavior** is Phase C, so
verify them here and re-confirm at their consuming phase:
- **`owner_phone` backfill** (Phase C prereq) — see **C0** below. `[W4 §1d]`
- **`pricing_model` backfill** — flat/per-unit trades checkout fix, backfill `6fa0eb2a`. `[W4 §1e]`
  ```bash
  psql "$PROD_DB_URL" -c "SELECT tenant_id, name, pricing_model FROM service_types WHERE pricing_model IS NULL ORDER BY tenant_id LIMIT 50;"
  ```
  **Expect:** 0 rows (or only rows Jeff confirms are genuinely hourly/intended NULL).
  Any unexpected NULL = checkout mis-prices that trade.

**GO to Phase B when:** A1–A3 present, A4 clean, A5 `exit=0`/no CRIT with token live,
A6 all-green with the secret listed.

---

# PHASE B — resolver flip (config source of truth) + divergence guard

Behavioral routing change; ships alone, watched 24–48h. Prove no host serves the
**wrong tenant** and the `TENANT_DIVERGENCE` assert-and-refuse guard fires.

### B0. Prereq — `tenant_domains` correct + `routing_mode` present · `[W4 §1f]`
```bash
psql "$PROD_DB_URL" -c "\d tenant_domains" | grep -i routing_mode
```
**Expect:** `routing_mode` column present. Also confirm `058_fix_nycmaid_routing.sql`
+ `059_backfill_vercel_project.sql` ran (nycmaid `routing_mode` must be `bespoke`, not
`template`, and `vercel_project` populated) — a wrong row becomes a live mis-route the
instant the flip lands.
```bash
psql "$PROD_DB_URL" -c "SELECT domain, routing_mode, vercel_project FROM tenant_domains WHERE domain ILIKE '%nycmaid%' OR domain ILIKE '%thenycmaid%';"
```
**Expect:** nycmaid row(s) `routing_mode=bespoke`, `vercel_project` non-null.

### B1. Divergence guard FIRES — unit proof (always-on, no network) · `[W4 §2a]`
```bash
cd platform && npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts
```
**Expect:** green. Proves the guard throws `TENANT_DIVERGENCE` when `tenant_domains → A`
disagrees with legacy `tenants.domain → B`; agreement passes; a dangling pointer
resolves to `null` (never brand-swaps). Fully mocked — zero prod writes.

### B2. Live resolution — no brand swap (post-DNS) · `[W4 §2b]`
```bash
cd platform && SMOKE_RUN=1 npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts
# if custom-domain authoritative values live only in prod tenant_domains, feed them in:
# SMOKE_RUN=1 SMOKE_DOMAINS_JSON=/abs/path/domains.json npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts
```
**Expect (post-flip, DNS pointed at platform):** green — every host resolves to its
correct slug. Failure reading: `resolved to "X" but expected "Y" — WRONG TENANT (brand
swap)` = **CRITICAL, STOP**; `no x-tenant-slug` = CDN strips `x-*` or DNS not pointed
yet (assert on brand string in HTML body instead); `HTTP >= 400` = deploy not serving
that host.

### B3. All live tenant domains 200 + correct slug · `[W4 §3]`
```bash
source /tmp/w4-probe.sh                       # READ-ONLY helper: final status + x-tenant-slug + verdict
while IFS='|' read -r slug domain; do
  [ -z "$domain" ] && continue
  probe "https://$domain/" "$slug"
done < /tmp/w4-domains.txt
```
**Expect:** every row `200` / `verdict=PASS`, EXCEPT the known-dark item in B3a. Any
other non-200, redirect loop, or `verdict=FAIL` (wrong slug) → **STOP** (live outage or
brand swap).

### B3a. `toll-trucks-near-me` — KNOWN DARK (infra, not code) · `[W4 §3a]`
```bash
dig +short tolltrucksnearme.com
```
**Expect:** SERVFAIL / empty (SiteGround zone cancelled). **PASS =** either it now
resolves 200/PASS, or it's still dark and Jeff has explicitly acknowledged it
out-of-band. Do not let it block the code release; do not silently mark it green.

### B4. Divergence log alert wired · `[W4 §2c]`
Confirm a prod log-based alert exists on the substring:
```
TENANT_DIVERGENCE host=<h> td=<A> legacy=<B>
```
**Expect:** alert configured. During the 24–48h watch, **ZERO** `TENANT_DIVERGENCE`
events. Any occurrence = a real host is claimed by two tenants and the resolver is
(correctly) refusing to serve either — fix the divergent row.

**GO to Phase C when:** B1 + B2 green, B3 all-PASS (B3a stated), B4 alert wired, and
**24–48h elapse with zero divergence events**.

---

# PHASE C — auth-behavior (owner_phone gating, OTP/PIN throttles, isolation, voice, Selena)

Alters authn/authz behavior. Grouped together, deployed after the owner_phone backfill.

### C0. Prereq — owner_phone backfill: ZERO NULL for active tenants · `[W4 §1d]`
```bash
psql "$PROD_DB_URL" -c "SELECT slug, owner_phone FROM tenants WHERE status='active' AND (owner_phone IS NULL OR owner_phone='') ORDER BY slug;"
```
**Expect:** **0 rows.** Any row = deploying owner_phone gating locks that owner out
right now → populate owner_phone (or the tenants.phone fallback) before this phase.
(W4 backfill audit warned prod `tenant_members.phone` is empty, so don't assume the
backfill covered everyone — this SELECT is the authoritative locked-out list.)

### C1. Self-attack suite green — THIS LANE (114 tests)
```bash
cd platform && npx vitest run \
  src/lib/cross-tenant-attack.test.ts \
  src/lib/cross-tenant-db.test.ts \
  src/lib/cross-tenant-resolver.test.ts \
  src/lib/tenant-header-sig.test.ts
```
**Expect:** **114/114 passed** (verified green on `p1-w3` at authoring time). Any red =
a cross-tenant attempt succeeded → **STOP, do not proceed**. This is the unit-level
proof for forged headers, capability/impersonation/portal tokens, and foreign-id DB
read/update/delete/insert isolation.

### C2. Portal OTP — cross-tenant code collision rejected — fix `90af6b9` · `[W4 §4a]`
```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$DEPLOY_URL/api/portal/auth" \
    -H 'Content-Type: application/json' -H "Host: $PLATFORM_HOST" \
    -d '{"action":"verify_code","phone":"+15555550123","code":"000000"}'
done
```
**Expect:** first few normal wrong-code (401/400), then **flips to 429/lockout** and
stays. An unbroken run of non-429 = throttle not firing → **STOP**. Also: a valid code
for tenant A must not authenticate against tenant B on a phone+code collision (the code
is now filtered by `tenant_id`). Unit proof: `verify-bruteforce.test.ts`.

### C3. Team-portal PIN enumeration throttled on identity, not PIN — fix `d8f50ba` · `[W4 §4b]`
```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$DEPLOY_URL/api/team-portal/auth" \
    -H 'Content-Type: application/json' -H "Host: $PLATFORM_HOST" \
    -d "{\"phone\":\"+15555550123\",\"pin\":\"$(printf '%06d' $i)\"}"
done
```
**Expect:** many DIFFERENT wrong PINs get throttled → **429/lockout** after threshold
(the re-key is off the identity, not the PIN value). Unbounded non-429 = re-key didn't
take → **STOP**. Unit proof: `pin-enumeration.test.ts`.

### C4. client/login per-tenant lockout — fix `ecfb6c6` · `[W4 §4c]`
9-line guard, no regression test. Live: from one tenant context, spray wrong PINs
across many phones; expect a **per-tenant** 429/lockout (not just per-IP) after the
threshold. If not easily driven from outside, treat C2+C3 as the primary throttle
evidence and record C4 as **verified-by-code-only**.

### C5. Forged `x-tenant-id` on `/api/yinez` → no cross-tenant leak — fix `016ee7d` · `[W4 §5a]`
```bash
curl -s -X POST "$DEPLOY_URL/api/yinez" \
  -H 'Content-Type: application/json' -H "Host: $PLATFORM_HOST" \
  -H "x-tenant-id: <VICTIM_TENANT_UUID>" \
  -d '{"message":"hi","phone":"<A_PHONE_KNOWN_TO_VICTIM_TENANT>"}' | tee /tmp/yinez-forge.json
```
**Expect:** response does **not** echo the victim tenant's client name; no conversation
is scoped to the victim tenant (a forged id with no valid `x-tenant-sig` drops to
`undefined` — no scoped read, no `tenant_id` written; it does NOT return a clean 401).
Black-box only confirms the leak is absent — definitive proof is the committed
`route.test.ts`; confirm it's green in the merged build.

### C6. Cross-tenant booking id → rejected — fix `017043f` · `[W4 §5b]`
As tenant A's authenticated caller, attempt reschedule/cancel of a booking id owned by
tenant B (exact route depends on the Selena booking-tool / booking API surface).
**Expect:** rejected — no mutation of tenant B's booking, no owner-tool side effect
(`isOwner` is now per-tenant `owner_phone`, not global OWNER_PHONES). A success →
**CRITICAL, STOP.** Unit proof: 15 adversarial cross-tenant reschedule/cancel/owner-tool
tests all REJECT.

### C7. Voice — unsigned Telnyx webhook → 401 — fix `a7614f7` · `[W4 §6]`
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$DEPLOY_URL/api/webhooks/telnyx-voice" \
  -H 'Content-Type: application/json' \
  -d '{"data":{"event_type":"call.initiated","payload":{"to":"+18883164019"}}}'
```
**Expect:** **`401`** (`{"error":"Invalid signature"}`). A 200 = fail-OPEN → toll-fraud
risk → **STOP.** Unit proof: 7 tests (unsigned/forged/no-key/unknown-DID/ambiguous all
REJECT; nycmaid signed path green). **Known residual (flag, not a regression):**
`ADMIN_RING`/`buildRingTargets` still rings nycmaid's env admins for any resolved
tenant — confirm no 2nd voice tenant is live yet, or accept the caveat.

### C8. Selena / Yinez per-tenant config scoping
Agent responses for tenant A never surface tenant B's `selena_config`/persona.
**Expect:** confirmed tenant-scoped (`tenant-profile.ts` / `selena/agent` read only the
request tenant's config). Black-box: exercise tenant A's agent, confirm no tenant B
persona/config leaks; unit isolation covered by C1.

**GO to Phase D when:** C0 = 0 NULL, C1 = 114/114, C2/C3 throttle to 429, C5 no leak,
C6 rejected, C7 = 401, and no auth regressions in logs.

---

# PHASE D — webhook idempotency (Telegram secret + replay dedup)

Deployed last; depends on the Telegram webhook secret being set + re-registered first.

### D0. Prereq — Telegram secret set · `[W4 §7a]`
```bash
vercel env ls production | grep -i TELEGRAM_WEBHOOK_SECRET     # or gh secret list, or ask Jeff
```
**Expect:** `TELEGRAM_WEBHOOK_SECRET` present in prod. Missing AND handler requiring it
= all bots dark.

### D1. Every bot re-registered with the secret · `[W4 §7b]`
Per bot (per-tenant + env `platform-owner` + `jefe`):
```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo" \
  | jq '{url, pending_update_count, last_error_message}'
```
**Expect:** `url` points at the platform webhook, `last_error_message` empty/null,
`pending_update_count` low. A rising count or `Wrong response ... 401` = that bot was
NOT re-registered with the secret → it's dark → re-run `setWebhook` with
`deriveTelegramSecret(<scope>)` for that bot.

### D2. Live liveness — each bot replies · `[W4 §7c]`
Send a real message to each owner/jefe/tenant bot. **Expect:** it replies. Silence on
any bot = dark (see D1). This is the DO-NOT-SKIP #2 gate — bots dark = release regression.

### D3. Bad-secret Telegram POST rejected — fix `be8e1c1`
POST to a Telegram webhook route without the correct `X-Telegram-Bot-Api-Secret-Token`.
**Expect:** rejected (fail-closed). A 200 = the secret isn't enforced → **STOP.**

### D4. Replay / idempotency — duplicate delivery is a no-op
POST the same provider event twice (Telnyx `payload.id` / Telegram `update_id`).
**Expect:** the second is acknowledged but does **not** re-run side effects — no second
SMS, no second booking, no second ledger row. Confirm the `061` journal dedup index
still holds (no new duplicate `(tenant_id, source, source_id)` rows):
```bash
psql "$PROD_DB_URL" -c "SELECT tenant_id, source, source_id, count(*) FROM journal_entries WHERE source_id IS NOT NULL GROUP BY 1,2,3 HAVING count(*) > 1 LIMIT 20;"
```
**Expect:** 0 rows.

**DONE when:** D0 secret set, D1 every bot clean, D2 every bot replies, D3 bad-secret
rejected, D4 replay is a no-op.

---

# OUT-OF-PHASE / BUNDLED — SEO (ships in the release, not in the A→D isolation path)

The runbook's A→D phasing covers the isolation/auth staged release only. The SEO fixes
(fabricated `AggregateRating` dropped, FAQ self-canonical, `example.com` placeholder
canonicals removed — `8d4f9905`, `c828477b`) ride the same release but are not gated by
A→D. Prove them once the sites are live (Google manual-action risk if any survive). Full
commands in `[W4 §8]`; the two must-run checks:
```bash
for d in thefloridamaid.com thenycmobilesalon.com thenycseo.com; do
  echo "== $d =="; curl -sL "https://$d/" | grep -o 'AggregateRating' | wc -l
done                                                       # expect 0 on each
for d in $(cut -d'|' -f2 /tmp/w4-domains.txt); do
  [ -z "$d" ] && continue
  n=$(curl -sL "https://$d/" | grep -i '<link[^>]*rel=["'\'']canonical' | grep -ci 'example\.com')
  [ "$n" != "0" ] && echo "FAIL example.com canonical: $d ($n)"
done; echo "(no FAIL lines above = clean)"               # expect no FAIL lines
```

---

# SIGN-OFF (per phase — check only when the command output matched)

- [ ] **A** — 061 idx · 062 col · 060 EXECUTE=service_role only · RLS on · reconcile exit=0/no CRIT (token live) · CI+scope+reconcile green (secret listed)
- [ ] **B** — routing_mode/nycmaid correct · guard fires (unit) · live resolution no brand-swap · all domains 200/PASS (toll-trucks stated) · divergence alert wired · 24–48h zero-divergence watch clean
- [ ] **C** — owner_phone 0-NULL · self-attack 114/114 · portal OTP 429 + cross-tenant rejected · team-portal PIN 429 · yinez forged→no leak · cross-tenant booking rejected · voice unsigned→401 · Selena scoped
- [ ] **D** — Telegram secret set · every bot re-registered clean · every bot replies · bad-secret rejected · replay no-op · journal dedup holds
- [ ] **BUNDLED** — 0 AggregateRating on 3 flagged sites · 0 example.com canonical
- [ ] **BUILD** — merged integration build green; every cited regression test ran on the actual merged code

A STOP at any phase blocks the "proven in prod" claim for that phase and everything
downstream. Report the specific failing command output — do not summarize around it.

---

### Commit references (cross-check each fix is in the merged build)
Resolver smoke `a2d9adbb` · Voice `a7614f7` · Telegram `be8e1c1` · Yinez header `016ee7d`
· Booking IDOR/owner `017043f` · OTP throttle `90af6b9` · PIN enumeration `d8f50ba` ·
client/login lockout `ecfb6c6` · ledger TOCTOU `cba595e` · migrations
`060_lockdown_secdef_rpcs.sql` / `061_unique_journal_entries.sql`
(`uq_journal_entries_tenant_source`) / `062_add_tenant_id_inbound_emails.sql` ·
backfills owner_phone `9fccb574` / pricing_model `6fa0eb2a` · SEO `8d4f9905` / `c828477b`.
Self-attack suite (this lane): `cross-tenant-attack|db|resolver.test.ts` +
`tenant-header-sig.test.ts` — 114 tests.
