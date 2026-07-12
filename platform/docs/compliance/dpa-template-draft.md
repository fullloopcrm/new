# Data Processing Agreement (DPA) — TEMPLATE DRAFT

> # ⚠️ DRAFT-FOR-JEFF-REVIEW — NOT A SIGNED OR EXECUTABLE AGREEMENT
>
> **This is a drafting aid, not legal advice and not a contract.** It exists to
> fill the P14 gap ("we have no DPA to offer tenants") with a *starting point a
> lawyer can red-line* — nothing more. Do **not** send this to a tenant, publish
> it, link it from Terms, or sign it as-is.
>
> **Before this becomes real it must be:**
> 1. **Reviewed by qualified counsel** for the jurisdictions FL operates in.
> 2. **Reconciled with the actual sub-processor contracts** — this template
>    *assumes* each provider in §Annex-B has flowed down Art. 28 terms to us; that
>    assumption is **unverified** (see honesty flags).
> 3. **Filled in** at every `⟪PLACEHOLDER⟫` — legal entity names, addresses,
>    governing law, SCC module selections, notice periods, signature blocks.
>
> **Authorship:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · Docs-only.

---

## Honesty flags (read before relying on this)

- **I am not a lawyer.** This is a structural template modeled on the common shape
  of a GDPR Art. 28 processor DPA. Clause *wording* here is illustrative and will
  not survive legal review unchanged. Its value is completeness of *structure*
  and FL-specific factual grounding, not enforceable prose.
- **The controller/processor split is load-bearing and matches FL's real
  architecture:** for a tenant's end-customer data, **the tenant is the controller
  and Full Loop CRM is the processor** (this is the same split asserted in
  `record-of-processing-activities.md` §A and `dsr-handling-runbook.md`). This DPA
  is therefore written as the **FL-as-processor** agreement a tenant signs. FL is a
  *controller* only for its own operator/tenant-owner account data — that's a
  different relationship, not covered here.
- **Annex B (sub-processors) is generated from real data** — every entry is from
  `platform/src/lib/legal/sub-processors.ts` (the source that backs the public
  `/sub-processors` page). It is **not** invented. But whether each of those
  providers has actually granted FL Art. 28-compliant terms (their DPA flowed down
  to us) is **UNVERIFIED** — that's a Jeff/counsel action item, not something a
  static read can confirm.
- **International transfers (§9):** every sub-processor in Annex B is US-based.
  If any tenant or data subject is in the EU/UK, the EU→US transfer needs a
  lawful mechanism (SCCs / UK IDTA / an adequacy route). Whether FL has those in
  place is **UNKNOWN** and flagged, not assumed.
- **This does not create any obligation FL currently meets.** Several clauses
  below (breach notice within X hours, audit rights, deletion on termination)
  describe commitments; the operational reality behind them lives in the
  runbooks (breach-notification, DSR-handling, DR) which are themselves drafts.
  Signing this before those processes are real would be promising more than FL
  can currently do — flagged deliberately.

---

## Parties

| Role | Party | Meaning here |
|------|-------|--------------|
| **Controller** | ⟪Tenant legal name & address — PLACEHOLDER⟫ | The Full Loop customer (a home-services business) whose end-customer data is processed. |
| **Processor** | ⟪Full Loop CRM legal entity, registered address — PLACEHOLDER⟫ | Full Loop CRM, providing the platform. |

This DPA is incorporated into and governed by the **Master Services Agreement /
Terms of Service** ("Principal Agreement") between the parties. On conflict
regarding personal-data processing, **this DPA prevails**; on all other matters,
the Principal Agreement prevails.

**Effective date:** the date of the Principal Agreement, or the date this DPA is
signed, whichever is earlier. ⟪confirm⟫

---

## 1. Definitions

Terms not defined here take their meaning from **Regulation (EU) 2016/679
(GDPR)** and, where applicable, the **UK GDPR** and **California Consumer Privacy
Act (CCPA/CPRA)**. Key terms:

- **"Personal Data"** — any information relating to an identified or identifiable
  natural person processed by the Processor on behalf of the Controller under the
  Principal Agreement.
- **"Processing"**, **"Controller"**, **"Processor"**, **"Data Subject"**,
  **"Sub-processor"**, **"Personal Data Breach"** — as defined in GDPR Art. 4.
- **"Data Protection Laws"** — all privacy/data-protection laws applicable to the
  processing, including GDPR, UK GDPR, and CCPA/CPRA as relevant. ⟪confirm scope⟫
- **"Sub-processor"** — any third party engaged by the Processor to process
  Personal Data (Annex B).

---

## 2. Subject matter, duration, nature & purpose (Art. 28(3))

- **Subject matter:** processing of Personal Data necessary to provide the Full
  Loop CRM service (booking/job management, invoicing & payments, customer
  communications, CRM/notes, and related features).
- **Duration:** for the term of the Principal Agreement, plus the deletion/return
  window in §11.
- **Nature & purpose:** hosting, storing, transmitting, and processing the
  Controller's Personal Data to deliver the platform features the Controller
  configures.
- **Details of processing** (categories of data subjects, categories of Personal
  Data, and processing operations): **Annex A**.

---

## 3. Processor obligations (Art. 28(3)(a)–(h))

The Processor shall:

1. **(a) Process only on documented instructions** from the Controller, including
   for international transfers, unless required by law (and then only after notice
   to the Controller where legally permitted). The Principal Agreement, this DPA,
   and the Controller's use of the platform's configuration constitute the
   Controller's complete and final instructions. ⟪confirm that platform config =
   "documented instructions" is acceptable to counsel⟫
2. **(b) Confidentiality** — ensure persons authorized to process Personal Data
   are bound by confidentiality.
3. **(c) Security** — implement the technical and organizational measures in
   **Annex C** (Art. 32).
4. **(d) Sub-processors** — engage sub-processors only under §8.
5. **(e) Assist with data-subject requests** — provide the Controller reasonable
   assistance to respond to Data Subject requests (access, rectification,
   erasure, portability, restriction, objection). The operational flow is the
   `dsr-handling-runbook.md`. ⟪Note: that runbook is itself a draft; assistance is
   currently manual/partial — see honesty flags.⟫
6. **(f) Assist with Art. 32–36 obligations** — breach notification (§7), DPIAs,
   and prior consultation, taking into account the nature of processing.
7. **(g) Deletion/return on termination** — per §11.
8. **(h) Audits & information** — make available information necessary to
   demonstrate compliance and allow/contribute to audits (§10).

---

## 4. Controller obligations

The Controller:

1. Warrants it has a **lawful basis** and all necessary notices/consents to
   provide the Personal Data to the Processor and to instruct the processing.
2. Is responsible for the **accuracy, quality, and legality** of the Personal Data
   and its instructions.
3. Shall issue instructions that comply with Data Protection Laws.

---

## 5. Data subjects & categories of data

See **Annex A**. In summary, processing may involve:
- **Data subjects:** the Controller's end customers/clients, leads, and the
  Controller's own workers/cleaners.
- **Categories:** identity & contact (name, email, phone, address), booking/job
  details, invoice/payment metadata (card/bank details are processed by Stripe,
  not stored by FL — ⟪confirm⟫), message content (SMS/email), and CRM notes.

---

## 6. Security (Art. 32)

The Processor maintains the technical and organizational measures in **Annex C**,
appropriate to the risk. The Controller acknowledges those measures may evolve,
provided the level of protection is not materially reduced.

> **Honesty flag on Annex C:** the measures listed there describe FL's *intended*
> posture. Several are **in-progress, not fully in force** — most notably
> tenant-isolation at the database layer (RLS is prepared but not universally
> enforced; service-role paths bypass it), audit-log wiring (0/338 write routes
> currently emit tenant-scoped audit rows), and at-rest secret handling. A DPA
> that asserts these as *complete* would be inaccurate. Annex C marks each as
> **in place / partial / planned** rather than overclaiming.

---

## 7. Personal Data Breach notification (Art. 33)

The Processor shall notify the Controller **without undue delay** and in any event
within **⟪X⟫ hours** of becoming aware of a Personal Data Breach affecting the
Controller's data, providing the information reasonably available (nature of the
breach, categories/approx. number of data subjects and records, likely
consequences, measures taken). Operational detail: `breach-notification-runbook.md`.

> ⟪Set X⟫ — common commitments are 24–72h. Do not commit to a number FL's actual
> detection capability can't meet. The breach runbook is a template, not a live
> monitored process — flag before signing.

---

## 8. Sub-processors (Art. 28(2), (4))

1. The Controller provides **general authorization** for the Processor to engage
   the sub-processors listed in **Annex B**.
2. The Processor shall impose data-protection obligations on each sub-processor
   **no less protective** than those in this DPA (Art. 28(4)).
   > ⟪UNVERIFIED — see honesty flags: whether each Annex-B provider has actually
   > granted FL such terms needs confirmation against their contracts.⟫
3. The Processor shall give the Controller **⟪N⟫ days' prior notice** of any
   intended addition or replacement of a sub-processor (via the `/sub-processors`
   page and/or email), during which the Controller may object on reasonable
   data-protection grounds. ⟪Set N — commonly 30 days.⟫
4. The Processor remains liable to the Controller for its sub-processors' acts and
   omissions to the extent set out in the Principal Agreement's liability terms.

---

## 9. International transfers

Where processing involves transfer of Personal Data outside the EEA/UK, the
parties shall rely on a valid transfer mechanism (EU **Standard Contractual
Clauses**, the **UK IDTA/Addendum**, or an adequacy decision). ⟪Select SCC
module(s) and attach — Module 2 (controller→processor) is the likely fit; confirm.⟫

> **Honesty flag:** every Annex-B sub-processor is **US-based**. If any Controller
> or data subject is in the EU/UK, this section is doing real work and the
> mechanism must actually be in place. Whether FL has executed SCCs with its
> sub-processors is **UNKNOWN** here — a Jeff/counsel item, not assumed.

---

## 10. Audit (Art. 28(3)(h))

The Processor shall make available information necessary to demonstrate compliance
with this DPA and allow for and contribute to audits, including inspections, by
the Controller or an auditor it mandates — subject to reasonable **notice**,
**frequency** (⟪e.g. once per 12 months unless required by a supervisory authority
or following a breach⟫), **confidentiality**, and **cost-allocation** terms.
Third-party certifications/reports (e.g. sub-processor SOC 2) may be provided to
satisfy audit requests where reasonable. ⟪confirm what evidence FL can actually
produce today — see Annex C caveats.⟫

---

## 11. Deletion / return on termination (Art. 28(3)(g))

On termination or expiry of the Principal Agreement, the Processor shall, at the
Controller's choice, **delete or return** all Personal Data and delete existing
copies, unless retention is required by law. Deletion shall occur within **⟪X⟫
days**. Operational detail: the deletion flow (P2) and `dsr-handling-runbook.md`.

> **Honesty flag:** the platform deletion capability (P2) is **UNVERIFIED** in this
> worktree; FK relationships mean a blind delete of a controller's data is
> non-trivial (see `compliance-data-map.md` — several tables are SET NULL, not
> cascade). Do not commit to a deletion SLA the platform can't currently execute.

---

## 12. Liability, governing law, misc.

- **Liability** — governed by the Principal Agreement's limitation-of-liability
  terms. ⟪confirm interaction with statutory liability that can't be limited.⟫
- **Governing law / jurisdiction** — ⟪PLACEHOLDER⟫.
- **Order of precedence** — this DPA over the Principal Agreement for
  personal-data matters; otherwise the Principal Agreement.
- **Changes** — the Processor may update this DPA to reflect changes in Data
  Protection Laws or sub-processors on notice; material reductions in protection
  require Controller consent. ⟪confirm⟫

---

## Signatures

⟪Signature blocks — Controller & Processor: name, title, date. PLACEHOLDER.
Do not sign the draft.⟫

---

# Annex A — Details of processing

**Categories of data subjects**
- The Controller's end customers / clients and leads.
- The Controller's workers / cleaners / staff.
- (FL operator/owner accounts are FL-as-controller data — outside this DPA.)

**Categories of Personal Data**
| Category | Examples | Notes |
|----------|----------|-------|
| Identity & contact | Name, email, phone, service address | Core CRM data |
| Booking / job | Appointment times, service type, job notes, location | |
| Invoice / payment | Amounts, invoice status, payment metadata | Card/bank data processed by **Stripe**, ⟪confirm not stored by FL⟫ |
| Communications | SMS content, email content, call metadata | via Telnyx/Twilio, Resend |
| CRM notes | Free-text notes about clients/leads | May contain sensitive detail entered by the Controller |
| AI prompt content | Message text / business data sent to LLM features | via Anthropic/xAI |
| Technical | IP address, request metadata | via Vercel |

**Special-category data (Art. 9):** not intentionally processed. ⟪Free-text note
fields *could* contain it if the Controller enters it — flag as Controller
responsibility.⟫

**Processing operations:** collection, storage, organization, retrieval, use,
transmission, and erasure to deliver the platform.

**Duration:** term of the Principal Agreement + §11 deletion window. Per-type
retention: see `deploy-prep/tenant-data-retention-map.md` (authoritative).

---

# Annex B — Approved sub-processors

Generated from `platform/src/lib/legal/sub-processors.ts`
(last updated **July 12, 2026**), the source backing the public `/sub-processors`
page. **Not invented.** Art. 28-flowdown status per provider is **⟪UNVERIFIED⟫**.

| Provider | Purpose | Data processed | Location |
|----------|---------|----------------|----------|
| **Stripe** | Payment processing, invoicing, subscription billing | Name, email, billing address, payment card/bank details, transaction history | United States (global) |
| **Telnyx** (Twilio as equivalent) | SMS/voice (reminders, service texts, calls) | Phone number, message content, call metadata | United States |
| **Supabase** | Primary database, file storage, RLS-secured tenant data | All customer/client/job/account records in the CRM | United States (AWS) |
| **Resend** | Transactional & service email | Email address, name, email content | United States |
| **Anthropic** (xAI as equivalent) | AI/LLM features (drafting, categorization, assistant) | Prompt content — may include names, message text, business data | United States |
| **Vercel** | Hosting, edge delivery, privacy-safe analytics | IP address, request metadata, aggregate usage | United States (global edge) |

> **Clerk note:** previously used for auth but owner login is dormant/moved off
> Clerk, so it's intentionally **omitted** here (matches `sub-processors.ts`). If
> owner auth is wired back onto Clerk, add it to this Annex and give change notice.

---

# Annex C — Technical & organizational measures (Art. 32)

> **Status honesty:** each measure is marked **[in place] / [partial] / [planned]**.
> Do not present [partial]/[planned] items as complete in a signed DPA.

| Area | Measure | Status |
|------|---------|--------|
| Transport encryption | HTTPS/TLS enforced; HSTS (2y, preload) | **[in place]** |
| Response security headers | nosniff, X-Frame DENY, Referrer-Policy, Permissions-Policy | **[in place]** |
| Content-Security-Policy | Nonce-based CSP | **[planned]** — see `csp-rollout-report-only-plan.md` |
| Tenant isolation (DB) | Row-Level Security per tenant | **[partial]** — RLS prepared, not universally enforced; service-role paths bypass it |
| Access control | Role-based operator/admin access | **[partial]** — see `access-control.md` |
| Audit logging | Tenant-scoped write audit trail | **[partial/planned]** — `logTenantWrite` wired into 0/338 write routes today |
| Secrets at rest | Encryption of stored secrets | **[partial]** — see `secrets-at-rest-audit.md` |
| Backup & recovery | Regular backups, restore capability | **[partial]** — PITR unconfirmed; see `disaster-recovery-runbook.md` |
| Breach response | Detect→triage→notify runbook | **[planned]** — template, not a monitored process; `breach-notification-runbook.md` |
| Sub-processor management | Registry + change notice | **[in place]** (registry); flowdown terms **[unverified]** |

> The [partial]/[planned] entries are exactly why this DPA is **draft**: signing it
> would assert a security posture FL has not yet fully achieved. Close those before
> the DPA is offered, or scope the Annex-C commitments to what's genuinely in force.

---

## What this draft does NOT do

- It is **not legal advice** and **not a signed/executable agreement**.
- It does **not** confirm any sub-processor's Art. 28 flowdown terms are in place.
- It does **not** confirm SCCs/transfer mechanisms exist.
- It does **not** assert FL currently meets the security/breach/deletion
  commitments in the body — Annex C marks the real status.
- It fills the **P14 "no DPA exists" gap with a review-ready starting point** and
  nothing more. Next step is **counsel review + filling placeholders**, which is
  Jeff-gated.
