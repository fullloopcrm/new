# Data-Subject-Request (DSR) Handling Runbook

**Date:** July 12, 2026 · **Author:** W6 · **Status:** Draft procedure — NOT yet
adopted or exercised. No DSR has been run through it.
**Scope:** The operational process for handling a data-subject request (access /
export, deletion / erasure, and the lighter rights) end-to-end: intake →
identity verification → SLA clock → execution → logging. Ties the **P1 export**
endpoint and the **P2 deletion** workflow into one human process.

> **Honesty flags (read before relying on this):**
> - This is a **template runbook**, not evidence of a working process. No request
>   has been serviced through it. Treat SLAs and steps as *proposals* until Jeff
>   confirms.
> - **P1 (export) is BUILT but not user-reachable** — the endpoint exists
>   (`GET /api/gdpr/export`) but has no request UI (P3) and is not deployed. This
>   runbook assumes an operator invokes it manually until the UI lands.
> - **P2 (deletion) is UNVERIFIED.** As of the 11:43 channel status there is no
>   confirmed DONE report for the deletion workflow. Every "execute deletion" step
>   below **assumes P2 works as specified** (soft-delete + 30-day grace → hard
>   delete, anonymized analytics preserved). ⟪Confirm P2 landed + commit SHA
>   before this runbook is real.⟫ Built on an unverified base — flagged, not hidden.
> - The **controller/processor split is the single most important thing on this
>   page** (§1). Get it wrong and FL answers requests it has no standing to answer,
>   or ignores ones it must action.

---

## 1. Who owns the request? (controller vs. processor) — decide this FIRST

Full Loop CRM wears **two hats**, and the DSR path is completely different for each.

| Whose data | FL's role | Who is the controller | Where the DSR goes |
|-------------|-----------|-----------------------|--------------------|
| A tenant's **end customer** (the maid-service's clients: bookings, invoices, SMS) | **Processor** | The **tenant** (the business) | The **tenant** receives the request and instructs FL. FL executes on the controller's instruction — it does **not** decide the request on its own. |
| A **tenant admin / operator** (the FL account holder themselves) | **Controller** | **Full Loop** | FL receives and decides the request directly. |
| A **marketing-site visitor / lead** on FL's own sites (`fullloopcrm.com`, `homeservicesbusinesscrm.com`) | **Controller** | **Full Loop** | FL directly. |

**Rule of thumb:** if the data subject is one of a *tenant's* customers, FL is a
**processor** and must **not** action an export/deletion on that person's raw request
alone — it routes to the tenant (the controller) and acts only on the controller's
verified instruction. If the data subject is an FL account holder or an FL-site lead, FL
is the **controller** and owns the decision.

> This split is asserted from architecture (tenant-scoped data, tenant = business). It is
> **not** legal advice and is **not** confirmed against the actual tenant contracts / DPA.
> ⟪Confirm with counsel + the signed DPA which party is controller for each data class.⟫
> Cross-ref: `record-of-processing-activities.md` (controller/processor per activity).

---

## 2. Rights in scope

| Right | GDPR | CCPA/CPRA | FL mechanism today |
|-------|------|-----------|--------------------|
| Access / portability (export) | Art. 15 / 20 | Right to Know | **P1** `GET /api/gdpr/export?format=zip\|json[&clientId=uuid]` (built, no UI) |
| Erasure ("be forgotten") | Art. 17 | Right to Delete | **P2** deletion workflow (unverified) |
| Rectification | Art. 16 | Right to Correct | Manual — edit via admin CRM; no dedicated flow |
| Restriction / objection | Art. 18 / 21 | Opt-out of sale/share | Manual — suppress + note; consent trail (below) |
| Withdraw consent | Art. 7(3) | — | Consent banner + `consent-audit-trail-design.md` (unbuilt) |

This runbook details **access/export** and **erasure** (the two with real machinery).
The others are manual and noted where they intersect.

---

## 3. The flow

```
  intake ──► identity verify ──► scope & clock start ──► route (controller?) ──►
  execute (export | delete) ──► deliver / confirm ──► log ──► close
```

### Step 1 — Intake

- **Channels:** privacy inbox (e.g. `privacy@fullloopcrm.com` — ⟪confirm the mailbox
  exists and is monitored⟫), the export/deletion request UI once P3/P4 ship, or a
  tenant-forwarded request.
- **Capture:** requester identity claim, which data subject, which right, which tenant
  (if end-customer data), and the raw request text. Open a DSR ticket with a unique ID.
- **Acknowledge receipt** to the requester (GDPR expects action "without undue delay").

### Step 2 — Identity verification (do NOT skip — this is where breaches happen)

Handing someone else's data to an impostor **is** a data breach (→
`breach-notification-runbook.md`). Verify **before** any data moves.

- **FL account holder (controller case):** verify control of the account — logged-in
  session, or a code sent to the on-file email/phone. PIN/phone-auth is the existing
  primitive.
- **Tenant end-customer (processor case):** FL generally does **not** hold an independent
  auth relationship with the tenant's customers. **Verification is the tenant's
  responsibility** — the tenant (controller) verifies its customer, then instructs FL.
  FL verifies the *tenant's* instruction is genuine (authenticated tenant admin), not the
  end-customer directly.
- **Proportionality:** don't demand more ID than needed. A booking-history export needs
  less proof than a full erasure. Match verification strength to the sensitivity/
  irreversibility of the action (erasure = highest).
- **On failure / doubt:** request one additional identifier. Do not proceed on a weak match.

### Step 3 — Scope & start the SLA clock

- **Clock starts** at verified receipt (not raw receipt).
- **SLA (proposal):**
  - **GDPR:** respond within **1 month** of the verified request; extendable by 2 months
    for complex/numerous requests (must notify the subject of the extension within the
    first month).
  - **CCPA/CPRA:** confirm receipt within **10 business days**; respond within **45 days**
    (extendable once by 45).
  - **Internal target:** action within **10 business days** to leave buffer. ⟪Jeff to set
    the internal target.⟫
- **Scope the request:** which data categories, which tenant, whether it's access or
  erasure, whether legal holds / retention obligations block erasure (see §4).

### Step 4 — Route (the controller check from §1)

- **End-customer data → processor path:** confirm the **tenant instructed** the request.
  If the end-customer came to FL directly, **redirect them to the tenant** and notify the
  tenant. Do not export/delete on the end-customer's bare request.
- **FL account holder / FL-site lead → controller path:** FL proceeds directly.

### Step 5 — Execute

**Access / export (P1):**
- Invoke `GET /api/gdpr/export?format=zip|json` (add `&clientId=<uuid>` to scope to one
  end-customer). The endpoint is **tenant-scoped** (`.eq(tenant_id)`; `crm_notes` scoped
  via client FK) and gated on `settings.edit`.
- **Coverage** (per P1 build): bookings, invoices, communications (`client_sms` +
  `comhub`), notes (`booking_notes` + `crm_notes`). ⟪If a data class exists outside this
  set — e.g. payment metadata in Stripe, call recordings — the export is **incomplete**;
  the operator must gather those separately. Verify coverage against the RoPA before
  certifying "complete."⟫
- Deliver in a portable format (JSON or the zip). Do **not** email raw PII unencrypted —
  deliver via an authenticated channel.

**Erasure (P2 — unverified):**
- Trigger the deletion workflow. Per spec: **soft-delete + 30-day grace, then hard
  delete**, with **anonymized analytics preserved**.
- **Retention/legal-hold check BEFORE erasing:** invoices and financial records often have
  a statutory retention (tax/accounting) that **overrides** an erasure request — those get
  retained (anonymized where possible), not deleted, and the requester is told which data
  is retained and why. ⟪Confirm the finance retention window — cross-ref W5
  `tenant-data-retention-map.md`.⟫
- The **30-day grace** means erasure is not instant — communicate the completion date to
  the requester, and log the scheduled hard-delete date.

### Step 6 — Deliver / confirm & Step 7 — Log

- **Deliver** the export or **confirm** the erasure (including what was retained and why).
- **Log** to the DSR register (§5). The consent/DSR audit trail
  (`consent-audit-trail-design.md`) is where a durable, server-side record belongs — it is
  currently **unbuilt**, so until then the register is a manual document.

### Step 8 — Close

Mark the ticket resolved with the completion timestamp. If erasure had a grace period,
the ticket stays open until the hard-delete date is confirmed.

---

## 4. When you can refuse or limit a request

Do not treat every request as unconditionally executable:

- **Erasure vs. retention obligation:** statutory retention (tax/accounting on invoices)
  beats erasure — retain, anonymize where feasible, and **tell the requester**.
- **Erasure vs. active contract:** data needed for an ongoing service/contract may be kept
  for the contract's duration (GDPR Art. 17(3) exceptions).
- **Manifestly unfounded / excessive / repetitive** requests may be refused or charged —
  but document the reasoning; the bar is high.
- **Processor with no controller instruction:** FL declines to action end-customer requests
  that didn't come through the tenant (§1) — and tells the requester to go to the tenant.

Every refusal/limitation gets logged with its basis. Silent non-action is not allowed.

---

## 5. DSR register (log every request)

Until the server-side audit trail exists, maintain a register with at least:

| Field | Example |
|-------|---------|
| DSR ID | `DSR-2026-0001` |
| Received (raw) | 2026-07-12 |
| Verified (clock start) | 2026-07-13 |
| Requester + subject | admin@tenant / end-customer "Jane Doe" |
| FL role | processor (tenant = controller) |
| Right | erasure |
| Tenant | `nycmaid` |
| Action taken | soft-delete 2026-07-13, hard-delete scheduled 2026-08-12 |
| Data retained + basis | invoices (tax retention) |
| Delivery/confirmation | erasure confirmation emailed 2026-07-13 |
| SLA met? | yes (1 day) |
| Handler | Jeff |

Retain the register itself under the same governance as other compliance records.

---

## 6. Cross-references & open items

- **P1 export:** `src/app/api/gdpr/export/route.ts`, `src/lib/gdpr-export.ts` (built, no UI).
- **P2 deletion:** ⟪unverified — confirm it landed⟫.
- **Breach path** (if a DSR reveals/causes exposure): `breach-notification-runbook.md`.
- **What data exists / who controls it:** `record-of-processing-activities.md`.
- **Retention windows that override erasure:** W5 `deploy-prep/tenant-data-retention-map.md`.
- **Durable consent/DSR evidence store:** `consent-audit-trail-design.md` (unbuilt).
- **Access model behind verification:** `access-control.md`.

**Open items before this runbook is operational:**
1. Confirm P2 deletion is built + working (commit SHA).
2. Stand up + monitor the privacy inbox.
3. Ship P3/P4 request UI (or accept manual operator invocation of P1).
4. Confirm export **coverage completeness** vs. the RoPA (Stripe/off-platform data).
5. Confirm finance retention window (erasure carve-out).
6. Jeff sets the internal SLA target.
