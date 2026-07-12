# Consent & Preferences Audit Trail — Design

**Date:** July 12, 2026 · **Author:** W6 · **Status:** Design proposal — NOT
implemented. No schema created, no code written.
**Purpose:** GDPR Art. 7(1) requires that, where processing relies on consent,
the controller can **demonstrate** the data subject consented. Today Full Loop
has **no durable record** of *who consented to what, when, and how*. This doc
specifies the audit trail that closes that gap.

> **Honesty flags:**
> - This is a **design**, not a build. The tables/functions below do not exist.
>   Nothing here changes the live consent banner (the P8 remediation — gating
>   non-essential scripts on prior consent — is still the separate load-bearing
>   fix and is also unbuilt).
> - Consent trail is only *evidence of* consent. It does not make the current
>   banner GDPR-compliant on its own — see `cookie-consent-gdpr-audit.md` for the
>   7 gaps the banner still has.
> - I did not verify a consent record is currently stored anywhere. If one is
>   (e.g. a localStorage flag), that is **not** a server-side audit trail and
>   does not satisfy Art. 7(1) demonstrability. ⟪Confirm current storage.⟫

---

## 1. What must be demonstrable (the record's job)

For any consent-based processing, we must be able to show, per data subject:

1. **Who** — subject identifier (client id / visitor id / tenant end-customer).
2. **What** — the specific purpose(s) consented to (analytics cookies,
   marketing SMS, marketing email, …). Consent is **per purpose**, not global.
3. **When** — timestamp of the consent action.
4. **How** — the exact consent UI/version and the wording shown ("the banner as
   presented"), so we can prove informed consent.
5. **Scope** — grant vs. withdrawal (consent is **as easy to withdraw as to
   give**, Art. 7(3)); withdrawals must be recorded too.
6. **Proof of freely-given** — no pre-ticked boxes; the record should capture
   that the default was "off".

A single mutable "consent = true" flag fails all of this. The trail must be
**append-only** (each grant/withdrawal is a new immutable row).

---

## 2. Proposed data model (append-only event log)

Design intent, not a migration. Aligns with the existing append-only pattern
(`impersonation_events`) rather than inventing a new one.

```
consent_events            -- append-only; never UPDATE/DELETE
------------------------------------------------------------
id              uuid pk
tenant_id       uuid          -- tenant scope (nullable for platform-level visitor consent)
subject_type    text          -- 'client' | 'visitor' | 'end_customer' | 'owner'
subject_id      text          -- client id, or a stable visitor id (see §4)
purpose         text          -- 'analytics' | 'marketing_sms' | 'marketing_email' | ...
action          text          -- 'granted' | 'withdrawn'
policy_version  text          -- version of banner/policy text shown
ui_surface      text          -- 'cookie_banner' | 'signup_form' | 'preferences_center'
evidence        jsonb         -- { bannerText, choicesShown, defaultState:'off', locale }
ip_hash         text          -- hashed, not raw IP (data-minimization)
user_agent      text
created_at      timestamptz   default now()
```

**Current state** = the latest event per `(subject_id, purpose)`. Derive it with
a view; never store a mutable "current" flag as the source of truth.

**RLS:** must be tenant-scoped like all tenant data. Note the standing risk —
service-role queries bypass RLS (access-control.md §2), so app-code scoping is
load-bearing here too.

---

## 3. Write points (where events get recorded)

| Surface | Event | Trigger |
|---------|-------|---------|
| Cookie banner | analytics/functional grant or withdraw | User clicks Accept/Reject/Save; **and** the P8 fix must gate scripts on this before firing |
| Signup / booking form | marketing SMS/email opt-in | Only if an **unticked** opt-in box is present |
| Preferences center | any purpose grant/withdraw | User changes a toggle |
| SMS `STOP` / email unsubscribe | withdraw marketing_sms/email | Inbound STOP handler / unsubscribe link |

> **Gap to flag:** the SMS `STOP` and email unsubscribe paths already exist for
> deliverability but likely **don't write a consent_events row** today. Wiring
> them is part of making withdrawal demonstrable. ⟪Confirm current STOP handling.⟫

---

## 4. The visitor-identity problem

Cookie consent happens **before** login, so there's no client id. Options:

- **Anonymous consent id:** a first-party cookie holding a random id, written
  *only* for the essential purpose of recording the consent choice itself
  (recording a consent decision is not the kind of processing that needs prior
  consent). Link to a client id later if the visitor signs in.
- **Do not** key the trail on raw IP (not stable, and it's personal data).

This is the trickiest part and needs a decision before implementation.

---

## 5. Retention of the consent record itself

The trail is **evidence** — keep it for the limitation period of a possible
claim, typically **longer** than the underlying processing (so you can still
prove consent for past processing). Coordinate the exact window with W5's
retention map; do **not** delete consent events when the related data is deleted
under a P2 erasure request — instead record that the erasure occurred. ⟪Confirm
window with counsel.⟫

---

## 6. Relationship to other work

- **Precondition:** the P8 remediation (prior-consent gating of non-essential
  scripts) must land **with** this trail — recording consent while scripts fire
  regardless is theater. The banner fix and the trail are two halves of one fix.
- **Feeds:** breach-notification assessment (proof of what a subject agreed to)
  and the RoPA legal-basis columns (which activities actually rely on consent).
- **Pattern reuse:** mirror `impersonation_events` (append-only) and the P9
  `logTenantWrite` best-effort approach — but consent writes should be
  **not** best-effort-droppable at the moment of grant (losing the proof defeats
  the purpose); make the grant write blocking, background the analytics.

---

## 7. Build checklist (when Jeff approves)

- [ ] Migration: `consent_events` append-only table + tenant RLS (prepared, not
      run — prod DDL is Jeff-gated).
- [ ] `recordConsent()` lib (grant/withdraw), tenant-scoped, grant = blocking.
- [ ] Wire the 4 write points (§3), incl. STOP/unsubscribe withdrawals.
- [ ] Resolve visitor-identity approach (§4).
- [ ] Current-state view + preferences-center read.
- [ ] Land **together with** the P8 script-gating fix.
- [ ] Isolation test: tenant A cannot read tenant B's consent events (mirror the
      W2/W4 witness pattern).

---

*Sources: `docs/compliance/cookie-consent-gdpr-audit.md` (P8),
`docs/compliance/record-of-processing-activities.md`,
`docs/compliance/access-control.md`, P9 audit-logging pattern
(`impersonation_events`, `logTenantWrite` — other branch). GDPR Art. 7(1)/(3) as
understood — not legal advice.*
