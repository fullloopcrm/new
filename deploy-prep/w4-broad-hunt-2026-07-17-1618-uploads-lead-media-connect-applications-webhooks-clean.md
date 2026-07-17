# W4 broad hunt — 16:18 2026-07-17 — fresh-ground pass per 16:02 LEADER queue

## Scope

Per the 16:02 LEADER->W4 "new fresh-ground surface" order (3-deep, file-only,
no push/deploy/DB). Started from `platform/src/app/api`'s directory listing
and picked routes with **zero prior audit trail in this session and zero
test files** — the least-covered surfaces left, rather than re-verifying
already-swept ground.

**No code changes this pass** — every route checked was either already
hardened by an earlier pass this session (matching a documented fix
pattern), or reviewed clean.

## Read fresh this pass (no prior report references any of these)

- `uploads/route.ts`, `lead-media/signed-url/route.ts` — file-upload
  surfaces. Both already have the folder-slug sanitization / MIME allowlist
  / extension-sanitization pattern (`uploads/route.ts`'s comment explicitly
  says "Same fix as /api/public-upload"). `lead-media/signed-url` is
  **dead code** — grepped every `.ts`/`.tsx`/`.js`/`.jsx` file in the repo
  for the literal string `lead-media`; the only two hits are the route
  itself and `public-upload/route.ts`'s unrelated comment. No frontend
  caller anywhere. Same class as the 16:30 pass's site-clone auth dead-code
  finding — reachable by direct HTTP if someone knew the path (no auth,
  tenant-from-host, rate-limited 60/10min), but nothing in the product
  wires a lead to this uploaded media, so there's no live exploit surface
  behind it. Flagging as dead, not fixing (no live bug to fix).
- `connect/channels`, `connect/messages`, `connect/unread` (owner-side
  internal chat channels) — all three tenant-scope every read/write via
  `getTenantForRequest()` + `.eq('tenant_id', tenantId)`, including the
  channel-ownership check before allowing a message read/post. Clean.
- `migrate-sms/route.ts`, `migrate-cleaner-notifications/route.ts` — both
  are permission-gated (`settings.edit`) inert no-op compatibility shims
  for obsolete nycmaid migration endpoints. Not live code paths. Clean.
- `domain-notes/route.ts` — tenant-scoped via `requirePermission`, upsert
  keyed on `(tenant_id, domain)`. Clean.
- `cpa/[token]/year-end-zip/route.ts` — token-gated CPA financial export
  (trial balance + general ledger ZIP). Token validated for existence,
  revocation, and expiry before any data is touched; usage counter bumped
  via an atomic RPC (avoids the read-then-write race the fingerprint/import
  races this session were about). `buildTrialBalance`/`buildGeneralLedger`
  (`lib/finance-export.ts`) pass the unvalidated `year` query param only
  into PostgREST `.gte()/.lte()` filter values, never into a raw SQL
  string — no injection vector. CSV output goes through `csvEscape()`,
  which neutralizes Excel formula injection (leading `=+-@`/tab/CR). Clean.
- `prospects/route.ts` — public platform-level lead-qualification intake
  (pre-tenant, not tenant-scoped by design — commented `tenant-scope-ok`).
  Rate-limited 3/hour/IP, every free-text field capped at 2000 chars, admin
  alert email HTML-escapes every interpolated field. Clean.
- `changelog/route.ts` + `changelog/[id]/route.ts` and their two frontend
  consumers (`announcement-banner.tsx`, `dashboard/changelog/[id]/page.tsx`)
  — read-only, `published:true` only, rendered via plain React JSX
  (`{entry.body}`), not `dangerouslySetInnerHTML`. Clean.
- `referrals/track/route.ts` — public, no rate limit, but read-only lookup
  (returns tenant name/slug for a given referral code) with no
  state-changing side effect currently wired up (comment: "for now just
  return tenant info"). Low-value enumeration surface at most, not a live
  data-modification bug. Not touched.
- `pipeline/route.ts`, `indexnow/route.ts` — both `requirePermission`/
  `getTenantForRequest` gated and tenant-scoped correctly. `indexnow`'s
  POST accepts a tenant-supplied `urls[]` array with no same-domain check,
  but the outbound host/key sent to IndexNow is always the tenant's own
  `tenants.domain` — a malicious admin submitting foreign URLs would fail
  IndexNow's own host-match validation, not this codebase's problem to
  gate. Clean.
- `reviews/submit/route.ts`, `apply/route.ts`, `apply-ceo/route.ts`,
  `team-applications/route.ts` — all four already carry this session's
  storage-prefix-validation fix (require any client-reported file URL to
  start with the tenant's own upload prefix before it's stored, so a
  forged request can't stash a `javascript:`/foreign-tenant URL for a
  later link-rendering admin view) — confirmed present and correctly
  wired, not re-added.
- `webhooks/clerk/route.ts` — Svix signature verified (with an
  env-var-gated bypass for local/staging, same pattern as other webhook
  routes in this codebase), tenant_members updates scoped by
  `clerk_user_id`. Clean.
- `webhooks/stripe-platform/route.ts` — separate signing secret from the
  tenant Connect webhook (no cross-wire), calls `createTenantFromLead` on
  `checkout.session.completed`. This is the same `create-tenant-from-lead.ts`
  TOCTOU race already tracked since the 14:45 report and re-confirmed
  unresolved in the 16:01 report (blocked on Jeff-approved DB migration,
  `2026_07_16_partner_requests_conversion_claim_column_PROPOSED.sql` still
  unapplied) — not re-flagged as new, just noting this webhook is the
  actual live caller into that still-open gap.

## One dead-code item worth a decision (not fixed — no live exploit)

`lead-media/signed-url/route.ts` (above) is unreachable from any UI path.
Recommend either wiring it into the booking-form media-upload flow it was
built for, or deleting it — leaving unauth'd, unused signed-upload-URL
minting endpoints around is exactly the kind of dead-code landmine the
16:30 pass flagged for the site-clone auth files. Low priority (no live
bug), noting for LEADER/Jeff triage alongside that existing item.

## Verification

Read-only pass — no files edited (`git status --short platform/src` empty
for tracked source). No `tsc`/test run needed since no code changed. No
push/deploy/DB write.
