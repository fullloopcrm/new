# PLATFORM SUCCESSOR PACKAGE — TEMPLATE

> **STATUS: DRAFT — FOR-JEFF-REVIEW.** Every value below is a **PLACEHOLDER**. Nothing here is real
> until Jeff fills it in and removes the `[[…]]` markers. Do **not** treat any number, name, or
> relationship in this file as fact.
>
> Purpose: give the named successor everything needed to run (or wind down) the platform if Jeff is
> unavailable. Closes consultant hole #20 ("Loss of Jeff") — full scope, of which only the top-level
> contact is currently documented.
>
> **Named successor (already on record):** Ashton Tucker — see `SUCCESSOR-CONTACT.md` (repo root) for
> phone/email. This package is the operational depth behind that single contact.

---

## 0. How to use this template

1. Jeff fills every `[[PLACEHOLDER]]`. Where a real figure is unknown, leave the placeholder — do
   **not** guess.
2. Sensitive fields (banking, API secrets, personal contact info) are **not** stored in this markdown.
   They live encrypted-at-rest and are named here only as *pointers*. See
   `deploy-prep/successor-package-encryption-note.md` for which fields are sensitive and how they are
   protected.
3. Once complete, this doc is reviewed by Jeff + Ashton together, then sealed per the encryption note.
4. Re-review cadence: **quarterly**, or on any material change (new brand, lost anchor customer,
   banking change, advisor change).

---

## 1. Operating-brands list  *(hole #20: "who runs the 22 brands")*

> One row per operating brand/tenant. The platform reports ~22 brands — confirm the live count from
> `deploy-prep/successor-inventory-query.sql` (§ tenants) before sealing.

| # | Brand / tenant name | Tenant slug | Industry | Status | Day-to-day operator | Operator contact | Successor operator if operator unavailable |
|---|---------------------|-------------|----------|--------|---------------------|------------------|--------------------------------------------|
| 1 | `[[BRAND_NAME]]` | `[[slug]]` | `[[cleaning/hvac/…]]` | `[[active/suspended]]` | `[[NAME]]` | `[[pointer → encrypted contact store]]` | `[[NAME or "Ashton"]]` |
| 2 | `[[BRAND_NAME]]` | `[[slug]]` | `[[…]]` | `[[…]]` | `[[NAME]]` | `[[pointer]]` | `[[…]]` |
| … | *(repeat for all live tenants)* | | | | | | |

**Operating runbook per brand** (attach or link, do not inline secrets):
- `[[Where each brand's Stripe / Telnyx / Resend accounts live — pointer only]]`
- `[[Who has the login / Clerk owner seat per brand]]`
- `[[Any brand-specific SLA, contract, or handshake commitment]]`

---

## 2. Key customer relationships  *(hole #20: "key customer relationships listed")*

> The anchor accounts whose loss would materially hurt the business. Ranked by importance, not size.

| Rank | Customer / account | Which brand(s) | Relationship owner | Why they matter (anchor reason) | Renewal / risk date | Warm-intro path for successor |
|------|--------------------|----------------|--------------------|---------------------------------|---------------------|-------------------------------|
| 1 | `[[CUSTOMER]]` | `[[brand]]` | `[[Jeff / operator]]` | `[[e.g. 30% of brand X revenue]]` | `[[YYYY-MM-DD]]` | `[[who introduces Ashton]]` |
| 2 | `[[CUSTOMER]]` | `[[brand]]` | `[[…]]` | `[[…]]` | `[[…]]` | `[[…]]` |
| … | | | | | | |

**Relationships held only in Jeff's head** (highest-risk — document explicitly):
- `[[Handshake deals with no contract]]`
- `[[Verbal pricing exceptions / discounts promised]]`
- `[[Personal relationships that carry the account]]`

---

## 3. Revenue + cost inventory  *(hole #20: "revenue + cost inventory")*

> **Do NOT invent figures.** Pull live numbers with `deploy-prep/successor-inventory-query.sql`
> (read-only) and paste the *reviewed* results here, or leave placeholders. Money fields in the DB:
> `tenants.monthly_rate` / `tenants.setup_fee` (platform → tenant, dollars),
> `bookings.price` / `tip_amount` (tenant → their clients, **cents**),
> `payroll_payments.amount` (labor cost).

### 3a. Platform recurring revenue (what tenants pay Jeff)
| Brand / tenant | Monthly rate | Admin seats | Team seats | Setup fee | Setup paid? | Notes |
|----------------|--------------|-------------|------------|-----------|-------------|-------|
| `[[brand]]` | `[[$/mo]]` | `[[n]]` | `[[n]]` | `[[$]]` | `[[Y/N + date]]` | `[[…]]` |
| **TOTAL MRR** | `[[$ — from query]]` | | | | | |

### 3b. Costs (what the platform pays out)
| Cost line | Vendor / recipient | Amount | Cadence | Pointer to account |
|-----------|--------------------|--------|---------|--------------------|
| Hosting / infra | `[[Vercel/…]]` | `[[$/mo]]` | monthly | `[[pointer]]` |
| DB / Supabase | `[[…]]` | `[[$/mo]]` | monthly | `[[pointer]]` |
| SMS / Telnyx | `[[…]]` | `[[$/mo]]` | usage | `[[pointer]]` |
| Email / Resend | `[[…]]` | `[[$/mo]]` | usage | `[[pointer]]` |
| Payroll (field labor) | per brand | `[[$/mo — payroll_payments]]` | biweekly | `[[pointer]]` |
| Contractors / help | `[[…]]` | `[[$]]` | `[[…]]` | `[[pointer]]` |

### 3c. Net snapshot
- Gross platform MRR: `[[$ — reviewed]]`
- Total monthly cost: `[[$ — reviewed]]`
- Approx. net / month: `[[$ — reviewed]]`
- Runway if Jeff steps away tomorrow: `[[months — Jeff's estimate]]`

---

## 4. Board of advisors  *(hole #20: "board of advisors on paper with real briefings")*

> "On paper with real briefings" = each advisor has actually agreed, knows the business, and can be
> called in a crisis. A name with no briefing is not an advisor — mark it `NOT YET BRIEFED`.

| Advisor | Domain (legal / finance / ops / tech) | Agreed? | Last real briefing date | Contact pointer | What they cover in a crisis |
|---------|---------------------------------------|---------|-------------------------|-----------------|-----------------------------|
| `[[NAME]]` | `[[Legal]]` | `[[Y/N]]` | `[[YYYY-MM-DD or NOT YET BRIEFED]]` | `[[pointer]]` | `[[e.g. contracts, disputes]]` |
| `[[NAME]]` | `[[Finance/Tax]]` | `[[…]]` | `[[…]]` | `[[pointer]]` | `[[banking, taxes, payroll]]` |
| `[[NAME]]` | `[[Ops]]` | `[[…]]` | `[[…]]` | `[[pointer]]` | `[[running the brands]]` |
| `[[NAME]]` | `[[Tech/Platform]]` | `[[…]]` | `[[…]]` | `[[pointer]]` | `[[keeping the app alive]]` |

**Briefing packet each advisor should have received:** `[[link/pointer to the packet — or "TODO"]]`

---

## 5. Immediate-action runbook (first 72 hours if Jeff is unavailable)

> The one page Ashton reads first. Keep it blunt and sequential.

1. **Access:** `[[how Ashton gets into email / DB / deploy — pointer to encryption note & recovery]]`
2. **Money doesn't stop:** `[[how billing keeps running — Stripe, payroll]]`
3. **Tell these people first:** `[[advisors + top-3 anchor customers + key operators]]`
4. **Don't touch:** `[[anything fragile that should be left alone until an advisor is looped in]]`
5. **Decision authority:** `[[what Ashton can decide alone vs. what needs an advisor sign-off]]`

---

## 6. Completion checklist (Jeff)

- [ ] All operating brands listed and confirmed against live tenant count
- [ ] Key customer relationships ranked, including head-only/handshake ones
- [ ] Revenue + cost inventory filled from reviewed live query output (no invented numbers)
- [ ] Every advisor agreed **and** briefed (no `NOT YET BRIEFED` left)
- [ ] Sensitive fields moved to encrypted store per encryption note (none left inline here)
- [ ] Reviewed jointly by Jeff + Ashton Tucker
- [ ] Next review date set: `[[YYYY-MM-DD]]`
