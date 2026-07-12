# Data Breach Notification Runbook

**Date:** July 12, 2026 · **Author:** W6 · **Status:** Draft procedure — NOT yet
adopted or exercised.
**Scope:** What to do when personal data held by Full Loop CRM is (or may be)
exposed, lost, or accessed without authorization. Covers detection → triage →
containment → notification → post-incident review.

> **Honesty flags (read before relying on this):**
> - This is a **template runbook**, not a record of an existing process. No breach
>   drill has been run against it. Treat every timeline and threshold as a
>   *proposal* until Jeff confirms.
> - Every **`⟪PLACEHOLDER⟫`** below is a real gap — a name, contact, or legal
>   detail I do not know and must not invent. Fill these before this runbook is
>   usable.
> - Legal deadlines cited (GDPR 72h) are the statutory text as I understand it,
>   **not** legal advice. Confirm applicability with counsel — Full Loop's actual
>   GDPR exposure depends on whether it processes EU/UK data subjects, which is
>   **⟪UNCONFIRMED⟫**.

---

## 0. Roles (fill before first use)

| Role | Who | Responsibility |
|------|-----|----------------|
| **Incident Lead** | ⟪Jeff?⟫ | Owns the incident end-to-end; makes the notify/don't-notify call. |
| **Technical Lead** | ⟪PLACEHOLDER⟫ | Containment, forensics, scope determination. |
| **Comms / Legal** | ⟪PLACEHOLDER⟫ | Drafts notices, contacts regulators, handles affected-tenant comms. |
| **Sub-processor liaison** | ⟪PLACEHOLDER⟫ | Contacts affected vendors (Supabase, Stripe, etc.). |

Single-operator reality: today Jeff likely fills all four. That is a
**resourcing risk** for a 72-hour clock — name a backup contact.

---

## 1. What counts as a breach

A **personal-data breach** = any event leading to accidental or unlawful
**destruction, loss, alteration, unauthorized disclosure of, or access to**
personal data (GDPR Art. 4(12)). It is **not** limited to external attackers.

### In-scope examples for this platform

| Category | Concrete example here |
|----------|-----------------------|
| **Cross-tenant disclosure** | A service-role query missing `.eq('tenant_id', …)` returns tenant A's clients to tenant B. *(This class is PROVEN present — see §6.)* |
| **Credential exposure** | A signing secret (`PORTAL_SECRET`, `TEAM_PORTAL_SECRET`, `ADMIN_TOKEN_SECRET`, `SECRET_ENCRYPTION_KEY`) leaks — enables session forgery / decrypt of stored secrets. |
| **Database exposure** | Supabase service-role key or `DATABASE_URL` leaks; a public bucket exposes stored files/documents. |
| **Sub-processor breach** | Stripe, Supabase, Telnyx/Twilio, Resend, Anthropic/xAI, or Vercel notifies us of a breach on their side. |
| **Lost/stolen access** | An operator device with an authenticated session or `.env.local` is lost. |
| **Accidental disclosure** | Error responses leaking data/schema to the wrong party; misdirected SMS/email blast. |

> Uncertain whether an event qualifies? **Treat it as a breach for triage
> purposes** and downgrade later. The 72h clock (§4) starts at *awareness*, so
> under-classifying early is the expensive mistake.

---

## 2. Data at risk (what a breach could expose)

Grounded in the sub-processor registry (`src/lib/legal/sub-processors.ts`) and
the CRM's stored records:

- **Client/customer PII:** names, emails, phone numbers, service addresses,
  booking history, notes.
- **Payment data:** handled by **Stripe** — card/bank details are tokenized at
  Stripe, but names, emails, billing addresses, and transaction history are
  processed. *(Confirm no raw PAN is ever stored in our DB — expected NONE.)*
- **Communications content:** SMS/voice via Telnyx/Twilio; email via Resend;
  message bodies stored in CRM (`client_sms`, comhub).
- **LLM prompt content:** business/message data sent to Anthropic/xAI for AI
  features.
- **Tenant secrets:** per-tenant credentials stored encrypted (envelope via
  `SECRET_ENCRYPTION_KEY`) — see the secrets-at-rest audit for the
  **silent-plaintext-fallback** risk if the key is absent.

A **cross-tenant** breach is the highest-severity class: it exposes *another
business's* customer data, multiplying the affected-parties count.

---

## 3. Response flow

```
DETECT ──► TRIAGE (sev + scope) ──► CONTAIN ──► ASSESS (who/what/how many)
                                                      │
                          ┌───────────────────────────┤
                          ▼                           ▼
                  NOTIFY (if required)         DOCUMENT + REVIEW
```

### 3.1 Detect
Sources today: error monitoring, W2's cross-tenant-leak witnesses (test
failures = live signal), Supabase/Vercel alerts, sub-processor notifications,
and manual report. **Gap:** there is no runtime audit log wired yet
(`logTenantWrite` exists but is called by 0 routes — see §6), so *after-the-fact*
"who accessed what" reconstruction is currently weak. Note this when scoping.

### 3.2 Triage — severity
| Sev | Definition | Example |
|-----|------------|---------|
| **SEV-1** | Confirmed exposure of personal data across tenants, or secret/key compromise. | Cross-tenant leak hit in prod; signing key leaked. |
| **SEV-2** | Probable exposure, limited blast radius, single tenant. | Misdirected email with client PII. |
| **SEV-3** | Possible/near-miss, no confirmed disclosure. | Vuln found by test/audit, not known to be exploited. |

### 3.3 Contain (technical) — pick by cause
- **Leaked signing secret** → rotate it. **Caveat:** `SECRET_ENCRYPTION_KEY`
  rotation is a **breaking operation** (no key-id in envelope, no re-encrypt
  script — per secrets-at-rest audit). Rotating it without the re-encrypt path
  darks stored secrets. Plan before rotating.
- **Leaked Supabase/DB credential** → rotate service-role key in Supabase
  dashboard, redeploy with new env. *(Jeff-gated — do not run unprompted.)*
- **Cross-tenant query bug** → patch the missing tenant scope; the W2 witness
  tests become the regression gate.
- **Public bucket / file exposure** → set bucket private, rotate any signed URLs.
- **Compromised session** → team-portal/referrer tokens honor active-member
  re-check (**instant revocation** by suspending the member); client sessions are
  30-day signed cookies with no server-side revoke list — **rotating
  `PORTAL_SECRET` invalidates all client sessions** (blunt but effective).

### 3.4 Assess — the notification-decision inputs
Determine and write down: **what** data, **whose** (which tenants, how many
individuals), **how** (root cause), **when** (window of exposure), **is it
still open**. This determines whether §4 notification is triggered.

---

## 4. Notification obligations

> **Confirm applicability with counsel.** Which of these apply depends on where
> affected individuals reside — **⟪UNCONFIRMED for Full Loop's user base⟫**.

| Regime | Trigger | Deadline | Notify whom |
|--------|---------|----------|-------------|
| **GDPR (EU/UK)** Art. 33/34 | Breach of personal data likely to risk individuals' rights | **72 hours** from *awareness* to the supervisory authority; affected individuals "without undue delay" if **high** risk | Supervisory authority + data subjects |
| **US state laws** (e.g. CA CCPA/breach statutes) | Unauthorized access to defined personal info | Varies by state; often "without unreasonable delay" | Affected residents; sometimes state AG |
| **Contractual (tenant DPAs)** | Any breach affecting a tenant's data | Per the DPA — often **⟪X⟫ hours**; DPA template is a P12 gap, not yet drafted | Affected tenant(s) |
| **Sub-processor → us** | Vendor breach touching our data | Per each vendor's DPA | Us (inbound) — then cascade to §4 above |

**Data controller vs processor:** For tenant customer data, Full Loop is
typically a **processor** acting for the tenant (the controller). That usually
means the obligation is to **notify the affected tenant promptly** and let them
handle regulator/individual notice — **but** confirm this split in the tenant
DPA (which does not exist yet). Do not assume Full Loop can offload the 72h
clock without a signed DPA saying so.

### Notification content (GDPR Art. 33(3) minimum)
1. Nature of the breach + categories/approx. number of individuals and records.
2. Contact point (the ⟪Comms/Legal⟫ role).
3. Likely consequences.
4. Measures taken / proposed to address it and mitigate harm.

Draft templates: **⟪TO AUTHOR⟫** (regulator notice, tenant notice, individual
notice). Not included here — belongs in a separate templates file once §0 roles
and §4 applicability are confirmed.

---

## 5. Sub-processor breach contacts

If the breach originates at a vendor, or we must notify them, use their security
/ incident channel. **Verify each current URL before an incident — these move**
(same caveat as the sub-processor registry's `privacyUrl` note).

| Sub-processor | Role | Incident/security contact | Verified? |
|---------------|------|---------------------------|-----------|
| Stripe | Payments | ⟪security@stripe / dashboard⟫ | ☐ |
| Supabase | DB / storage | ⟪Supabase support + security⟫ | ☐ |
| Telnyx / Twilio | SMS / voice | ⟪provider security contact⟫ | ☐ |
| Resend | Email | ⟪Resend security contact⟫ | ☐ |
| Anthropic / xAI | LLM | ⟪provider security contact⟫ | ☐ |
| Vercel | Hosting | ⟪Vercel security contact⟫ | ☐ |

All left unchecked deliberately — I did not fabricate contact addresses. Fill
from each vendor's current DPA / trust page.

---

## 6. Known standing risks that raise breach likelihood

These are documented elsewhere in this repo and are relevant *before* any
incident — they make certain breaches more likely or harder to detect:

1. **Cross-tenant data paths (PROVEN):** W2's cross-tenant-leak register shows
   live FK-injection / missing-tenant-scope leaks (crews, finance). Until
   patched, a SEV-1 cross-tenant disclosure is a realistic event, not
   hypothetical. *(Surfaced by the fleet; patch timing is Jeff-gated.)*
2. **Service-role bypasses RLS** (access-control.md §2): app-code tenant scoping
   is load-bearing; RLS will not catch a missing `.eq('tenant_id')` on a
   service-role query.
3. **No runtime audit trail wired** (audit-logging-expansion, coverage-matrix):
   `logTenantWrite` is called by 0/338 write routes → post-incident "who did
   what" reconstruction is currently limited to impersonation_events + provider
   logs. This directly weakens §3.4 assessment.
4. **Silent plaintext secrets** (secrets-at-rest audit): if
   `SECRET_ENCRYPTION_KEY` is absent, stored tenant secrets fall back to
   plaintext with only a warning → a DB exposure becomes a secrets exposure.
5. **Error info-leak** (error-info-leak audit): 142 routes return raw Postgres
   error messages; two Telegram webhooks echo stack traces into chat — a
   low-grade continuous disclosure channel.

Closing these reduces both the probability and the blast radius of a breach.

---

## 7. Post-incident review

Within **⟪5 business days⟫** of containment:
- Timeline: detection → containment → notification.
- Root cause (5 whys) and the **regression gate** added (e.g. a new isolation
  test that would have caught it — mirror the W2/W4 witness pattern).
- Did the 72h clock work? Where did time go?
- Update this runbook with what was wrong or missing.

Keep a breach register (date, scope, decision, notifications sent) as evidence
of compliance — GDPR expects documentation **even for breaches you decide not to
report**.

---

## 8. Open items to make this runbook real (do not treat as done)

- [ ] Confirm GDPR applicability (EU/UK data subjects?) — §4.
- [ ] Fill §0 roles + a named backup for the 72h clock.
- [ ] Sign a tenant **DPA** that fixes the controller/processor split + notice
      window (P12 gap).
- [ ] Author notice templates (regulator / tenant / individual).
- [ ] Verify + record §5 vendor security contacts.
- [ ] Wire `logTenantWrite` so §3.4 assessment has real access data.
- [ ] Run one tabletop drill against a simulated cross-tenant leak; update.

---

*Sources: `src/lib/legal/sub-processors.ts`, `docs/compliance/access-control.md`,
`docs/compliance/cookie-consent-gdpr-audit.md`,
`deploy-prep/secrets-at-rest-audit.md`, `deploy-prep/error-info-leak-audit.md`,
`deploy-prep/compliance-readiness-checklist.md`, and the fleet's
cross-tenant-leak register / audit-log coverage matrix (other branches).
GDPR Art. 4(12), 33, 34 as understood — not legal advice.*
