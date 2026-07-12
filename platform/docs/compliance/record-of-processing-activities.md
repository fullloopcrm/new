# Record of Processing Activities (RoPA)

**Date:** July 12, 2026 · **Author:** W6 · **Status:** Draft register — needs
legal-basis confirmation before it is authoritative.
**Basis:** GDPR Art. 30 requires controllers/processors to maintain a record of
processing activities. This is that register for Full Loop CRM.

> **Honesty flags:**
> - **Legal basis** columns are my *proposal*, not settled fact. Which lawful
>   basis applies (consent vs. contract vs. legitimate interest) needs
>   counsel + the actual tenant contracts. Marked **⟪confirm⟫** where I'm unsure.
> - Full Loop is usually the **processor** for tenant customer data (the tenant
>   is the controller). Art. 30(2) records for processors are lighter than
>   30(1) controller records; both angles are noted where they differ.
> - **Retention windows** here are pointers — the authoritative per-type
>   retention schedule is W5's `deploy-prep/tenant-data-retention-map.md`. Where
>   they disagree, that file wins; flag the drift.
> - This does not fabricate data flows: every recipient below appears in
>   `src/lib/legal/sub-processors.ts`.

---

## A. Controller / processor identification

| Field | Value |
|-------|-------|
| Organization | Full Loop CRM (⟪legal entity name / registered address — PLACEHOLDER⟫) |
| Role — platform account data | **Controller** (Full Loop's own operator/tenant-owner accounts) |
| Role — tenant customer data | **Processor** for each tenant (tenant = controller) |
| DPO / contact | ⟪PLACEHOLDER — none appointed; note if not required⟫ |
| Sub-processors | See `/sub-processors` page + `sub-processors.ts` (§D) |

---

## B. Processing activities (the register)

Each row = one processing activity. Columns follow Art. 30(1): purpose,
categories of data subjects + data, recipients, transfers, retention, security.

### B1. Booking & job management
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Take and manage service bookings/jobs for a tenant's business. |
| **Data subjects** | Tenants' end customers. |
| **Data categories** | Name, email, phone, service address, booking history, notes. |
| **Legal basis** | Processor acting on tenant's instructions; tenant's basis is contract w/ its customer ⟪confirm⟫. |
| **Recipients** | Supabase (storage/DB); Telnyx/Twilio (reminders); Resend (email). |
| **Retention** | → retention-map ⟪window⟫. |
| **Security** | Tenant scoping + RLS backstop (access-control.md), signed sessions. |

### B2. Payments & invoicing
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Charge customers, issue invoices, manage subscriptions. |
| **Data subjects** | Tenants' end customers; tenant billing contacts. |
| **Data categories** | Name, email, billing address, transaction history. **Card/bank details are tokenized at Stripe** — confirm none stored raw in our DB (expected NONE). |
| **Legal basis** | Contract / payment necessity ⟪confirm⟫. |
| **Recipients** | **Stripe** (payment processor). |
| **Transfers** | US (Stripe global). |
| **Retention** | Financial records often have statutory minimums → retention-map ⟪window⟫. |
| **Security** | Stripe-hosted card capture; webhook signature verification (see webhook-hardening-plan). |

### B3. Communications (SMS / voice / email)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Appointment reminders, service texts/calls, transactional email. |
| **Data subjects** | Tenants' end customers. |
| **Data categories** | Phone number, message content, call metadata, email content. |
| **Legal basis** | Contract / legitimate interest; **marketing messages need consent** ⟪confirm which msgs are marketing⟫. |
| **Recipients** | Telnyx/Twilio (SMS/voice), Resend (email). |
| **Retention** | Message logs (`client_sms`, comhub) → retention-map ⟪window⟫. |
| **Security** | Provider webhooks signature-verified; content stored tenant-scoped. |

### B4. AI / LLM assistance
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Message drafting, categorization, assistant tooling. |
| **Data subjects** | Tenants' end customers (incidentally, via message content in prompts). |
| **Data categories** | Prompt content — may include names, message text, business data. |
| **Legal basis** | Legitimate interest / processor instruction ⟪confirm — and confirm no training on our data per vendor terms⟫. |
| **Recipients** | Anthropic (xAI as equivalent). |
| **Transfers** | US. |
| **Retention** | Per vendor policy; our stored outputs → retention-map ⟪window⟫. |
| **Security** | Prompt content is business data — minimize PII sent; ⟪confirm vendor zero-retention/no-train setting⟫. |

### B5. Platform accounts & access (operators, tenant owners, field staff)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Authenticate and authorize operators, tenant admins, field/team staff, referrers, clients. |
| **Data subjects** | Tenant owners/operators, field staff, referrers, portal clients. |
| **Data categories** | Identifiers, hashed PINs, session/token metadata, roles/permissions. |
| **Legal basis** | Contract (service provision) ⟪confirm⟫. |
| **Recipients** | Supabase (account rows); no external sharing. |
| **Retention** | For account lifetime + ⟪window⟫ after closure. |
| **Security** | HMAC-SHA256 signed tokens, PINs HMAC-hashed at rest, instant revocation on team plane (access-control.md §3–4). |

### B6. Hosting, logs & analytics
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Serve the app; operational logging; aggregate usage analytics. |
| **Data subjects** | All site visitors / users. |
| **Data categories** | IP address, request metadata, aggregate usage. |
| **Legal basis** | Legitimate interest (security/operations) ⟪confirm; analytics may need consent — see cookie-consent-gdpr-audit⟫. |
| **Recipients** | Vercel (hosting + privacy-safe analytics). |
| **Retention** | Log/analytics retention → ⟪window⟫. |
| **Security** | Edge delivery; note error-info-leak audit (raw error messages in responses) as an unintended disclosure vector to fix. |

### B7. Data-subject rights fulfilment (GDPR/CCPA export & deletion)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Fulfil access/export (P1) and erasure (P2) requests. |
| **Data subjects** | Any of the above whose data is exported/deleted. |
| **Data categories** | Whatever the request touches (bookings, invoices, communications, notes). |
| **Legal basis** | Legal obligation (respond to rights requests). |
| **Recipients** | None new — internal fulfilment. |
| **Retention** | Keep a **request log** as compliance evidence (who asked, when, what was done). |
| **Security** | Export gated on `settings.edit`, tenant-scoped, clientId ownership verified (P1 endpoint). |

---

## C. Categories of data subjects & data (Art. 30 summary)

- **Data subjects:** tenant end-customers; tenant owners/operators; field/team
  staff; referrers; portal clients; site visitors.
- **Personal data categories:** contact details, service addresses, booking/job
  records, communications content, payment metadata (card data tokenized at
  Stripe), account credentials/roles, technical identifiers (IP, request meta),
  AI prompt content.
- **Special-category data:** **none intended.** ⟪Confirm no health/other special
  categories arrive via free-text notes — a residual risk in open note fields.⟫

---

## D. Recipients / sub-processors (transfers)

All are US-based per the registry → any EU/UK data subjects imply an
international transfer requiring a transfer mechanism (SCCs / adequacy).
**⟪Confirm transfer mechanism per vendor.⟫**

| Sub-processor | Purpose | Transfer |
|---------------|---------|----------|
| Stripe | Payments | US (global) |
| Telnyx / Twilio | SMS / voice | US |
| Supabase | DB / storage | US (AWS) |
| Resend | Email | US |
| Anthropic / xAI | LLM | US |
| Vercel | Hosting / analytics | US (global edge) |

(Clerk intentionally omitted — owner auth dormant, per registry note.)

---

## E. General security measures (Art. 30(1)(g))

Cross-reference, not restated: pseudonymization/hashing of PINs, HMAC-signed
sessions, tenant isolation + RLS backstop, encrypted-at-rest tenant secrets
(envelope), webhook signature verification. Full detail in
`access-control.md` and the deploy-prep security audits.

---

## F. Open items before this RoPA is authoritative

- [ ] Fill controller legal-entity + contact placeholders (§A).
- [ ] Confirm each **legal basis** (§B) with counsel.
- [ ] Reconcile retention windows against W5's retention-map (§B pointers).
- [ ] Confirm no raw card data stored (B2) and vendor no-train/zero-retention
      for LLM (B4).
- [ ] Confirm/record international-transfer mechanism per sub-processor (§D).
- [ ] Confirm free-text notes don't collect special-category data (§C).
- [ ] Keep this in sync with `sub-processors.ts` on every vendor change.

---

*Sources: `src/lib/legal/sub-processors.ts`,
`docs/compliance/access-control.md`,
`docs/compliance/cookie-consent-gdpr-audit.md`,
`docs/compliance/breach-notification-runbook.md`,
`deploy-prep/error-info-leak-audit.md`,
`deploy-prep/secrets-at-rest-audit.md`, P1 export / P2 deletion (other
branches), W5 retention/data maps (other branch). GDPR Art. 30 as understood —
not legal advice.*
