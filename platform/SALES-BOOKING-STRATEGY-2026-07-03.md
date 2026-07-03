# Sales + Booking Strategy — One Pipeline, Two Modes

_Draft 2026-07-03. Covers ALL home-services tenants. No per-industry templates._

## Core principle

A tenant does not "use booking" or "use sales." **Each service the tenant offers is one of two fulfillment modes.** The tenant enables whatever mix it needs — booking-only, sales-only, or both. Tenants differ by **data (the mode flag), never by code** (per platform CLAUDE.md).

```
                        A TENANT
        ┌───────────────────┴───────────────────┐
   BOOKING services                        SALES services
   (instant / automated)                   (quoted / high-touch)
   standard clean, junk pickup,            kitchen remodel,
   lawn-mow subscription                   landscape design, buildout
```

- Cleaning company → booking-only
- Remodeler → sales-only
- Landscaper doing weekly mow subscriptions **and** quoted hardscape → both, same platform

## The two modes

### BOOKING mode — price known/estimable up front
```
lead → (auto) → BOOKED → pay/deposit → job
```
- Front-end: **direct self-book form** → creates a booking immediately
- Minimal human touch. This is what nycmaid already does.

### SALES mode — price requires discovery
```
lead → QUALIFIED → [VISIT] → QUOTED → ACCEPTED → e-SIGN → DEPOSIT → BOOKED → job
```
- Front-end: **collect / qualify form** → creates a lead into the sales pipeline
- Human works the deal. Plugs into the money engine's quote → on-signature → deposit triggers **that already exist**.

## Forms map 1:1 to mode

| Service mode | CTA on site | Form | Outcome |
|---|---|---|---|
| booking | "Book Now" | self-book form | booking created |
| sales | "Get a Quote" | collect/qualify form | lead → sales pipeline |

A service in booking mode renders the self-book path; a sales-mode service renders the collect path. A tenant offering both shows both CTAs. **Automatic — driven by the service's mode flag.**

## One fork for all: single pipeline, single stage spine

Both modes are the **same deal record walking the same stages**. Booking deals auto-complete the middle stages; sales deals walk them. No parallel systems.

Proposed unified stage spine (kills the 3 conflicting vocabularies below):
```
lead → qualified → quoted → accepted → deposit → booked → won | lost
```
- Booking deal: `lead → booked` (middle stages auto-satisfied)
- Sales deal: walks the full spine

### Debt this replaces (3 vocabularies today)
| Where | Stages today |
|---|---|
| `/dashboard/leads` (`/api/leads/feed`) | browsing → form → contacted → quoted → booked → dead |
| `/dashboard/sales` (`/api/deals`) | new → contacted → qualified → quoted → negotiating → booked |
| `src/lib/pipeline.ts` (forecast) | lead → qualified → proposal → negotiation → won → lost |

## Unified Sales surface

Merge the two pages the operator sees today:
- Live-visitor feed (analytics) → one tab
- Deal pipeline (both modes, filterable by mode) → main flow
- Retire standalone `/dashboard/leads`; fold into `/dashboard/sales`

Booking column mostly self-drives; Sales column is where the human works.

## Config home

Each service is tagged `booking` or `sales` at setup, inside the existing **onboarding / Go Live seam**. No new config surface — extend what exists.

## Reuse vs. new

| Already built | New work |
|---|---|
| Money engine (quote, e-sign, deposit, on-signature triggers) | `mode` flag on services + tenant config |
| Deals kanban + `/api/deals` | Unified stage spine (retire 3 vocabularies) |
| Booking/checkout flow (nycmaid) | Lead → deal conversion + triage |
| Leads visitor feed | Merge feed + pipeline onto one Sales page |
| Self-book form (nycmaid) | Collect/qualify form (generalized) |

## Comms automations (both modes, throughout)
Flag-gated per existing comms plan. Booking: confirm → reminder → post-job. Sales: qualify ack → visit reminder → quote sent → nudge → signed → deposit receipt → schedule confirm.

## Open decisions before build
1. Stage spine names — keep `contacted` / `negotiating` as stages, or fold into activity log?
2. Lead → deal: auto-convert on form submit, or triage queue first?
3. Data model: does a "lead" and a "deal" share one table, or convert across two? (Needs schema read — not yet done.)

## Not yet verified
- `deals` / `leads` table schema and `/api/deals` internals — must read before writing build tasks.
