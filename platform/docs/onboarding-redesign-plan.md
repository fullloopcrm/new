# FullLoop — New-Tenant Onboarding Redesign Plan

_Author: working plan for Jeff's sign-off. Status: PROPOSAL — no code written yet._
_Date: 2026-07-05_

---

## 0. The spine (your model, made literal)

```
[1] Create tenant account   →   [2] ONE live form: profile + data + import   →   [3] Automation button → live site + everything
     (name, slug, industry)      (every field an automation needs, auto-saved,      (activateTenant(): settings, domains,
                                   resumable, no loss)                                owner login, SEO, smoke test)
```

- **Step 1 exists** (`/admin/businesses/new` → creates the tenant row).
- **Step 3 exists** (`activateTenant()` in `src/lib/activate-tenant.ts` — the Launch tab / automation button).
- **Step 2 is the whole job.** It is currently NOT one form. The redesign makes it one.

**Main page = the Profile.** Profile, business data, and the import all live on one page, one canonical record, live-saved.

---

## 1. Current state — honest

### 1a. Five overlapping collection surfaces
| Surface | Path | Lines | Role |
|---|---|---|---|
| Public self-serve create | `src/app/onboarding/page.tsx` | 178 | 6 fields + service area → `POST /api/tenants` |
| Operator create | `src/app/admin/businesses/new/page.tsx` | 553 | creates tenant |
| **Operator mega-page** | `src/app/admin/businesses/[id]/page.tsx` | 1,195 | 7 tabs: Profile/Users/Integrations/Billing/Onboarding-checklist/Launch/Notes |
| **Operator wizard #2** | `src/app/admin/businesses/[id]/wizard/page.tsx` | 614 | Business/Services/Selena/Integrations/Team/Verify — **duplicates the mega-page** |
| **Owner wizard** | `src/app/dashboard/onboarding/page.tsx` | 295 | Identity/Contact/Brand/Compliance/Social/Import |

Three of these collect the same stripe/telnyx/resend/selena/branding/service-area fields, three different ways.

### 1b. Profile data is scattered across 7 stores
`tenants` columns · `entities` default row · `tenants.selena_config` jsonb · `tenants.compliance` jsonb · `onboarding_tasks` table · `setup_progress` jsonb (11-section manual checklist) · `onboarding_draft` jsonb (resume blob).

There is **no single canonical "tenant profile" object**. Every surface hand-maps into fragments.

### 1c. Import is dangerous today (verified in code)
- **Writes straight to live tables, no staging, no undo.** `api/clients/import` batch-inserts into `clients` (line 165); schedules → `bookings`/`recurring_schedules`. "Preview" is browser-only. A bad import is permanent hand-surgery.
- **Ordering trap.** Schedules match to *already-imported* clients by phone→name. Import schedules first, or with unclean phones, and **every appointment silently skips**.
- **Phone mandatory** on client import — email-only customers are rejected.
- **AI map is throwaway.** The mapping brain returns to the browser; the server keeps **no record of the mapping and no copy of the original file**. A wrong map can't be re-run without re-asking the business. Breaks "no data loss."

### 1d. Live-save is fake today
Owner wizard saves a `draft` blob and only fans it into real fields on "Finish." Crash before Finish = only the blob survives. Not real-time, not field-level.

### 1e. Debug code in prod
`activate-tenant.ts` inserts an `activation_debug` row into `notifications` at 6 phase boundaries on every activation. Remove or flag.

---

## 2. THE FIELD AUDIT — every feature and the data it needs

Source of truth for consumption: `getSettings()` (`src/lib/settings.ts`, ~70 fields), the website `SiteConfig` (`src/app/site/template/_config/site.ts`), `activateTenant()`, the finance `entities` row, and the onboarding gate.

Legend: **✓** collected by a form today · **~** partial / defaulted · **✗ MISSING** — a feature needs it, no form collects it.

### Website generation (the "new website" automation) — `SiteConfig`
| Field | Collected? |
|---|---|
| identity.name, siteName | ✓ |
| identity.url (custom domain) | ~ (domain_name on admin page) |
| identity.logo | ✓ logo_url |
| contact.phone / email / supportPhone | ~ (phone/email ✓; **supportPhone ✗**) |
| geo.region, placename, **lat/lng** | ~ (address ✓ → geocoded on activate; region/placename **✗ not explicit**) |
| theme primary/accent/surface/hover | ~ (primary/secondary ✓; **accent/surface/hover ✗** — 5-color palette needed) |
| agent.name | ~ (selena ai_name) |
| **rating, reviewCount** | ✗ MISSING (site shows social proof; no field) |
| services (name/label/hours/emergency) | ~ (service_types table; **emergency flag, label ✗**) |
| funnelMode | ~ (selena_config, no form control) |

### Scheduling / availability — `getSettings`
| Field | Collected? |
|---|---|
| service_types (name, hours, **rate**) | ~ (name/hours ✓ in wizard; **per-service price ✗ in owner form**) |
| business_hours_start / end (numeric) | ✗ MISSING (owner form has free-text "Mon–Fri 8–6", not the numeric hours the engine uses) |
| booking_buffer_minutes, default_duration_hours, min_days_ahead, allow_same_day, open_365 | ✗ MISSING (all defaulted, none collected) |
| funnel_mode, require_team_member, auto_confirm_bookings, smart_recurring_assign | ✗ MISSING (no form control) |

### Finance / bookkeeping — `entities` + `getSettings`
| Field | Collected? |
|---|---|
| legal_name, ein, entity_type, fiscal_year_start | ✓ (owner Identity step) |
| tax_rate | ✗ MISSING |
| expense_categories, currency_symbol | ✗ MISSING (defaulted) |

### Payments
| Field | Collected? |
|---|---|
| payment_methods[] | ✗ MISSING (defaults to zelle+stripe; never chosen) |
| zelle_email, apple_cash_phone | ~ (admin only) |
| stripe key / account id | ✓ (admin Integrations) |

### Reviews / reputation
| Field | Collected? |
|---|---|
| google_place_id, google_review_link | ~ (admin only; owner form has review link) |
| review_followup_enabled/delay/threshold | ✗ MISSING (defaulted) |

### Comms (email/SMS/alerts)
| Field | Collected? |
|---|---|
| resend key/domain/from, telnyx key/phone, telegram token/chat | ✓ (admin Integrations) |
| reminder_days, reminder_hours_before, client_reminder_email/sms | ✗ MISSING (hardcoded fallbacks — never per-tenant) |

### Referrals
| commission_rate, auto_pay_referrals, referral_min_payout | ✗ MISSING (defaulted) |

### Proposals (pipeline funnel tenants)
| proposal_valid_days, deposit_type, deposit_value, proposal_terms | ✗ MISSING (defaulted; a pipeline tenant launches with generic terms) |

### Team defaults
| default_pay_rate, default_working_days, team_roles, team_pay_rates | ✗ MISSING (defaulted) |

### AI / Selena persona
| ai_name, tone, language, greeting, business_description, business_story | ~ (owner Brand step has description/story; **tone/language/greeting ✗ in owner form**, only in admin wizard) |

### Compliance / HR
| license #, state, expiry, insurance carrier/policy/coverage, bonded | ✓ (owner Compliance step) |
| HR doc requirements, employment types (1099/W2) | ~ (seeded template; not collected per business) |

### SEO / geo
| service_radius_miles, service_areas[], indexnow_key | ~ (admin only) |

**Bottom line:** ~30 of ~70 consumed fields are actually collected by a form. The rest ride on defaults — which is why tenants launch generic (default booking hours, no chosen payment methods, hardcoded reminders, generic proposal terms, no per-service pricing). **The redesigned form must expose every field above, grouped, with sane defaults pre-filled and clearly marked.**

---

## 3. Target architecture

### 3a. One canonical profile
A single read/write model — `TenantProfile` — that is the one interface over the 4 real stores (`tenants` cols, `entities` default row, `selena_config`, `compliance`). One `GET` returns the whole profile; one field-level `PATCH` writes it back to the correct store. No form ever hand-maps fragments again.

```
GET  /api/admin/businesses/[id]/profile        → full TenantProfile (every audited field)
PATCH /api/admin/businesses/[id]/profile        → { field, value } | { section, values }  (routes to correct store, live)
GET  /api/admin/businesses/[id]/readiness       → derived: what's filled, what blocks launch
```

### 3b. The one form (main page = Profile)
`/admin/businesses/[id]` becomes **Profile-first**, sectioned to match the audit:
`Identity · Contact & Location · Brand & Site · Services & Pricing · Scheduling · Payments · Comms & Integrations · Reviews · Referrals & Proposals · Team · Compliance · Import`.
Each section = a card on one page (not a linear wizard you can't skip around). Owner-only fields flagged so the share link (3e) can scope them.

### 3c. Live-save, no loss
Field-level auto-save: on blur / 800ms debounce, `PATCH` the single field to its real store. No `onboarding_draft` blob, no draft-vs-final. Optimistic UI + saved/failed indicator per field. Resume = just reload; the profile IS the state.

### 3d. Import v2 — staged, reversible, remembered
New tables: `import_batches` (id, tenant_id, kind, source_filename, raw_file_ref, mapping jsonb, status, counts) and `import_rows` (batch_id, raw jsonb, mapped jsonb, match_status: matched|new|duplicate|unmatched|rejected, target_id).
Flow: **upload → AI classify+map (stored) → rows land in staging → operator reviews buckets → Commit writes live → Undo reverses the batch.** Original file retained. Clients auto-commit before schedules (kills the ordering trap).

### 3e. Owner-fill share link (you fill what you know; they fill the rest)
Tokenized link to the same profile form, scoped to owner-only fields (EIN, license, logo, hours). Both write the same record in real time. No email ping-pong, no re-keying.

### 3f. Readiness engine → the automation button
Replace the 11-section manual checkbox list with readiness **derived from the profile + the existing gate**. The automation button ("Activate") is enabled/annotated by readiness ("Payment method not set · 0 clients imported · Stripe missing"), then runs `activateTenant()` unchanged.

---

## 4. Build stages (in order, each shippable)

### Stage 0 — Foundations (no UI change)
- Define `TenantProfile` type + the profile read/write/readiness API (3a).
- Backfill mapping: prove GET returns today's data for an existing tenant unchanged.
- **Exit:** API returns full profile for a live tenant; PATCH round-trips each field to the right store; tsc clean.

### Stage 1 — The one form + live-save
- Rebuild `/admin/businesses/[id]` Profile as the sectioned one-page form over the API, field-level auto-save (3b, 3c).
- Every audited field present, defaults pre-filled, owner-only flagged.
- **Exit:** operator fills any field, reload shows it saved; no field routes to the wrong store.

### Stage 2 — Kill the duplicates
- Retire operator wizard #2 (`[id]/wizard`) and fold the owner wizard (`/dashboard/onboarding`) into a read/write view of the same profile API.
- Remove `onboarding_draft` usage and the `activation_debug` crumb.
- **Exit:** one form, one model; grep shows no surface hand-writing profile fragments; nothing else reads `onboarding_draft`.

### Stage 3 — Import v2 (staging + undo)
- `import_batches` / `import_rows` migration; refactor client + schedule import to stage→review→commit→undo; retain file + mapping (3d).
- Fix phone-mandatory (allow email-only), enforce clients-before-schedules.
- **Exit:** an import can be reviewed, committed, and fully undone; a wrong map re-runnable from the retained file.

### Stage 4 — Smart intake
- One drop-zone: AI classifies each file (client list / schedule / invoices / price sheet) and routes it; cross-file identity resolution (fuzzy match, operator confirms ambiguous).
- **Exit:** operator drops mixed files, system sorts + maps + resolves identities into staging.

### Stage 5 — Owner share link (3e).
### Stage 6 — Missing data types
- Invoice / A-R (open balances) import, payment history, per-client existing pricing/plans, asset intake (logo, job photos).
- Close the remaining ✗ fields from §2 (payment_methods chooser, numeric hours, reminders, proposal terms, referral rates, per-service pricing).

---

## 5. Open decisions for you
1. **v1 cut:** Stages 0–3 (safe, fast, kills the dangerous gaps) vs 0–5 (adds smart intake + share link). My recommendation: **0–3 first, ship, then 4–6.**
2. **Import source confirmed = files** (CSV/Excel/paste), AI-mapped, no named-system API connectors in v1? (assumed yes)
3. **Plan doc location:** I put this at `docs/onboarding-redesign-plan.md`. Move it, or fine there?

## 6. Not doing yet
No code. No migrations run. No surfaces deleted. Awaiting your sign-off on the stages and the v1 cut.
