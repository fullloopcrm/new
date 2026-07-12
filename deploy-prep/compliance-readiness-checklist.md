# Compliance Readiness Checklist — Section P

**Owner:** Jeff · **Author:** W6 · **As of:** 2026-07-12 11:43 EDT
**Source of truth:** `LEADER-CHANNEL.md` Section-P assignments (11:35 block) + worker DONE reports.

> **Scope note (honesty):** The leader asked for **P1–P14**. Only **P1–P11** were ever
> assigned/defined in the channel. **P12–P14 have no assignment or definition** — they are
> listed below as *reserved / unscoped* with candidate items, NOT as work that exists.
> I did not fabricate their content.
>
> **Verification limit:** Each worker commits to its **own** branch (`p1-w1`…`p1-w6`).
> Only my own P7/P8/P11 artifacts live in this worktree (`p1-w6`) and were confirmed on
> disk. All other statuses are taken from channel DONE reports, not from reading the files.
> Items with no DONE report as of 11:43 are marked **UNVERIFIED**, not "not done."

---

## Legend

| Mark | Meaning |
|------|---------|
| ✅ **BUILT** | Code/doc authored + a DONE report exists (per-branch, file-only). |
| 🟡 **UNVERIFIED** | Assigned; no completion report seen in channel as of 11:43. Treat as in-progress. |
| ⬜ **REMAINING** | Not assigned / not defined. |
| 🔒 **GATED** | Even where BUILT: NOT deployed, NOT wired into live surfaces, and/or a DB migration is prepared-but-not-run. Requires Jeff's explicit deploy/DDL action. |

**Every BUILT item below is also 🔒 GATED.** Nothing in Section P is live in production yet —
all work is "new files only, file-only, non-gated authoring," committed to per-worker branches,
never pushed/merged/deployed and no prod DB writes run.

---

## Status at a glance

| # | Item | Owner | Status | Deploy gate |
|---|------|-------|--------|-------------|
| P1 | GDPR/CCPA data **export** endpoint (backend) | W1 | ✅ BUILT | 🔒 |
| P2 | GDPR/CCPA data **deletion** workflow (backend) | W2 | 🟡 UNVERIFIED | 🔒 |
| P3 | Data **export request UI** (tenant admin) | W4 | 🟡 UNVERIFIED | 🔒 |
| P4 | Data **deletion request UI** (tenant admin) | W4 | 🟡 UNVERIFIED | 🔒 |
| P5 | `/privacy` page (frontend + content) | W3 | 🟡 UNVERIFIED | 🔒 |
| P6 | `/terms` page (frontend + content) | W3 | 🟡 UNVERIFIED | 🔒 |
| P7 | Sub-processor list + `/sub-processors` page | W6 | ✅ BUILT | 🔒 |
| P8 | Cookie-consent GDPR verification | W6 | ✅ BUILT (audit) | 🔒 remediation |
| P9 | Audit-logging expansion (backend) | W5 | ✅ BUILT | 🔒 migration + wiring |
| P10 | `security-policy.md` | W5 | ✅ BUILT | — (doc) |
| P11 | `access-control.md` | W6 | ✅ BUILT | — (doc) |
| P12 | *(reserved — unassigned)* | — | ⬜ REMAINING | — |
| P13 | *(reserved — unassigned)* | — | ⬜ REMAINING | — |
| P14 | *(reserved — unassigned)* | — | ⬜ REMAINING | — |

**Tally (of 14):** **6 BUILT** (P1, P7, P8, P9, P10, P11) · **5 UNVERIFIED** (P2, P3, P4, P5, P6) ·
**3 REMAINING** (P12, P13, P14).

---

## Detail

### P1 — GDPR/CCPA data export endpoint (backend) · W1 · ✅ BUILT 🔒
- **Artifacts** (branch `p1-w1`, commit `84687736`): `src/app/api/gdpr/export/route.ts`,
  `src/lib/gdpr-export.ts` (+ `.test.ts`, 13 tests pass, tsc=0).
- **Behavior:** `GET /api/gdpr/export?format=zip|json[&clientId=uuid]`; covers bookings,
  invoices, communications (client_sms + comhub), notes (booking_notes + crm_notes);
  tenant-scoped `.eq(tenant_id)` (crm_notes has no tenant_id → scoped via client FK);
  gated `settings.edit`; clientId verified belongs to tenant.
- **Remaining before "done for real":** wire the request UI (P3); footer/route exposure;
  deploy. New-files-only, not reachable by users yet.

### P2 — GDPR/CCPA data deletion workflow (backend) · W2 · 🟡 UNVERIFIED 🔒
- **Assigned** 11:35: right-to-be-forgotten, soft-delete + 30-day grace then hard delete,
  preserve anonymized analytics; new route + lib, tenant-scoped.
- **Status:** No `P2 deletion` DONE report observed in channel through 11:43. (W2's other
  11:xx reports cover finance FK witnesses and tenantDb conversion plans — a *different*
  P2/P4-P7 numbering used for the leak register; do not confuse with Section-P.)
- **Action for Jeff:** confirm with W2 whether the deletion workflow landed and on which commit.

### P3 — Data export request UI (tenant admin) · W4 · 🟡 UNVERIFIED 🔒
- **Assigned** 11:35: admin-panel UI, ties to P1. New components/pages only.
- **Status:** Handoff note (11:43) lists "P3/P4 UI still landing." No DONE report yet.
- **Depends on:** P1 endpoint (built).

### P4 — Data deletion request UI (tenant admin) · W4 · 🟡 UNVERIFIED 🔒
- **Assigned** 11:35: admin-panel UI, ties to P2. New components/pages only.
- **Status:** still landing (per 11:43 handoff). No DONE report yet.
- **Depends on:** P2 workflow (itself unverified).

### P5 — `/privacy` page · W3 · 🟡 UNVERIFIED 🔒
- **Assigned** 11:35: data handling, sub-processors, retention, user rights.
- **Status:** No `/privacy` DONE report observed through 11:43.
- **Cross-link:** should reference P7 sub-processor list + P10 security policy once live.

### P6 — `/terms` page · W3 · 🟡 UNVERIFIED 🔒
- **Assigned** 11:35: platform terms + per-tenant customization hooks.
- **Status:** No `/terms` DONE report observed through 11:43.

### P7 — Sub-processor list + `/sub-processors` page · W6 · ✅ BUILT 🔒
- **Artifacts** (branch `p1-w6`, commit `78ec5250`, confirmed on disk):
  `platform/src/lib/legal/sub-processors.ts` (typed registry),
  `platform/src/app/(marketing)/sub-processors/page.tsx`.
- **Coverage:** Stripe, Telnyx/Twilio, Supabase, Resend, Anthropic/xAI, Vercel.
  Clerk **omitted** — owner auth is dormant (documented, not an oversight).
- **Remaining:** page is **NOT footer-linked** (new-files-only constraint). Link from
  footer + `/privacy` (P5), then deploy.

### P8 — Cookie-consent GDPR verification · W6 · ✅ BUILT (audit) 🔒 remediation
- **Artifact** (branch `p1-w6`, commit `b1436876`, confirmed on disk):
  `platform/docs/compliance/cookie-consent-gdpr-audit.md`.
- **Verdict:** current banner is **CCPA/CPRA opt-out; does NOT meet GDPR opt-in.** 7 gaps,
  including **UNGATED analytics on the-nyc-exterminator site.**
- **Remaining (the real work):** live banner was **NOT edited** (new-files-only). Remediation
  spec is in the audit — implementing it (prior-consent gating of non-essential scripts) is
  outstanding and is the load-bearing GDPR fix, not the audit itself.

### P9 — Audit-logging expansion (backend) · W5 · ✅ BUILT 🔒 migration + wiring
- **Artifacts** (branch `p1-w5`, commits `50992869`, `567550d2`): 3 new files —
  `migrations/2026_07_12_tenant_write_audit.sql` (**prepared, NOT executed**),
  `src/lib/audit-log.ts` (`logTenantWrite`, best-effort, generalizes impersonation_events),
  `docs/design/audit-logging-expansion.md`.
- **Remaining:** (1) Jeff runs the migration (prod DDL — gated). (2) `logTenantWrite` is
  **NOT wired into any route** yet (gated rollout documented). Coverage matrix tracked
  separately in `deploy-prep/audit-log-coverage-matrix.md` (W5).

### P10 — `security-policy.md` · W5 · ✅ BUILT
- **Artifact** (branch `p1-w5`): `platform/docs/compliance/security-policy.md`. Doc only —
  no deploy gate beyond publishing wherever policies are surfaced.

### P11 — `access-control.md` · W6 · ✅ BUILT
- **Artifact** (branch `p1-w6`, commit `0d169097`, confirmed on disk):
  `platform/docs/compliance/access-control.md` — 6 identity planes, tenant isolation + RLS,
  portal RBAC, secrets inventory.
- **FLAG carried forward:** service-role queries **bypass RLS** — tenant scoping in app code
  is load-bearing. This is a standing risk noted in the doc, not resolved by it.

### P12–P14 — Reserved / unscoped · ⬜ REMAINING
No assignment or definition exists in the channel. **Candidate items** commonly needed to
close compliance readiness (my recommendation, NOT assigned work — do not treat as built):
- **Data Processing Agreement (DPA)** template for tenants / sub-processor DPAs on file.
- **Breach-notification runbook** (who, timeline — 72h GDPR, contacts, template).
- **Data-retention schedule + RoPA** (Record of Processing Activities) — per data category.
- **Consent/preferences audit trail** (evidence a user opted in, when — pairs with P8 fix).

If Jeff wants P12–P14 defined, assign topics and this checklist gets updated.

---

## Cross-cutting deploy gates (nothing ships until these clear)

1. **No deploys / merges / pushes** performed — all Section-P work sits on per-worker branches.
2. **DB migrations prepared but NOT run:** P9 `2026_07_12_tenant_write_audit.sql`. Prod DDL is
   Jeff-gated.
3. **Live surfaces not wired:** P7 page not footer-linked; P8 banner not edited; P9 logger not
   called by any route; P1 export has no UI (P3).
4. **UNVERIFIED items (P2–P6)** must get confirmed DONE + commit SHA before counting toward
   readiness.
5. **Standing risk (P11):** service-role bypasses RLS — verify tenant scoping on any route
   touched during rollout.

## Suggested order to reach "GDPR-presentable"
P2 confirm → P3/P4 UI confirm → wire P1 export into P3 UI → publish P5/P6 + link P7 →
implement P8 remediation (consent-gate scripts) → run P9 migration + wire logger → define P12–P14.
