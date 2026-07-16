# Weather-based reschedule detection — design doc (proposal, not built)

**Author:** W1 (P1 schema/backfill lane) · **Date:** 2026-07-16 · **Status:** proposal for leader review — no code, no migration, nothing wired

## 1. The gap

Outdoor-trade bookings (`lawn_care`, `landscaping`, `irrigation`, `snow_removal`, `tree_service`, `pressure_washing`, `gutter`, `pool`, `holiday_lighting`, `paving`, `concrete`, `deck`, `fencing`, `roofing`, `siding` — see `src/lib/industry-presets.ts` `IndustryKey`) get scheduled the same way indoor trades do: a fixed `start_time`/`end_time` on `bookings`, no weather awareness anywhere. Grepped the whole codebase for `weather`/`OPENWEATHER`/`NOAA`/etc. — zero hits outside marketing copy strings. There is:

- No weather data source wired in (no API key, no client, no cron).
- No way to flag "this outdoor job is scheduled during a forecasted storm/freeze."
- No automated reschedule path triggered by anything other than a human (client or ops) initiating it via the existing `reschedule_booking` Selena tool (`src/lib/selena-legacy-handlers.ts:403` `handleRescheduleBooking`) or manual dashboard edit.

Today, if a lawn crew has 12 mowing jobs booked for a day and heavy rain rolls in, ops finds out from the crew calling in, or from angry clients — not from the system. That's real, avoidable cost: wasted drive time, no-show fees eaten by the tenant, annoyed clients who weren't proactively told.

## 2. What already exists to build on

- **`cron/schedule-monitor`** (`src/app/api/cron/schedule-monitor/route.ts`) already runs daily across every active tenant, pulls upcoming `bookings` joined to `clients`/`team_members`, and emits an `Issue[]` (type/severity/message) for ops to see — the exact shape a weather-issue detector would also want to produce. Same iteration pattern (`for (const tenant of tenants)`, 14-day lookahead window) is directly reusable.
- **`reschedule_booking`** tool + `handleRescheduleBooking` already implements the single-booking reschedule mutation and triggers the existing SMS reschedule template (`src/lib/sms-templates.ts:46`, `"Your appointment has been rescheduled to {date} at {time}"`). A weather-triggered flow should call into (or share code with) this path, not reinvent booking-mutation logic.
- **`client_properties.latitude`/`longitude`** (052_client_properties.sql) already exist per property — the geocode a weather API call needs is already on file for most bookings (falls back to `clients.address` when a property isn't set, same as the rest of the booking address-resolution chain in `lib/client-properties.ts`).
- **`industry-presets.ts` `IndustryKey`** is already the platform's single source of trade classification — "is this an outdoor trade" is a lookup against a small explicit set in that same file, not a new taxonomy.

## 3. Proposed approach

### 3.1 Data source

Pick one weather API with a free/cheap tier and hourly-or-better forecast granularity — candidates: **NOAA/NWS API** (free, US-only, no key required, matches this platform's US-only tenant base) or **Tomorrow.io** / **OpenWeatherMap** (paid tiers, global, more consistent SLA than NOAA's). Recommend starting with **NWS** (`api.weather.gov`) — zero marginal cost, no new secret to provision/rotate (fits `~/.claude/access.json`'s "ask before adding a credential" posture), and every affected tenant is US-based today. Revisit if/when the platform takes on non-US tenants.

### 3.2 New table: `weather_forecast_cache`

Cache raw forecast pulls per rounded lat/lng grid cell (NWS's own gridpoint model, or a rounded-to-0.05° key for a different provider) so 500 lawn-care bookings in the same ZIP don't trigger 500 API calls. Columns (sketch, not final):

```
id, grid_key (text), forecast_date (date), condition (text: 'rain'|'snow'|'storm'|'extreme_heat'|'extreme_cold'|'high_wind'|'clear'),
severity (text: 'advisory'|'watch'|'warning'), precipitation_probability_pct (int), raw_payload (jsonb), fetched_at (timestamptz)
```

Cross-tenant (no `tenant_id`) — weather is a location fact, not tenant-owned data. Short TTL (forecasts go stale; re-fetch daily per grid cell that has upcoming bookings, not per booking).

### 3.3 New table: `weather_reschedule_flags`

One row per booking the detector has flagged, so a flag is visible in the dashboard, doesn't get re-created every cron run, and records the outcome (dismissed by ops / auto-rescheduled / booking went ahead anyway):

```
id, tenant_id, booking_id (FK), forecast_condition (text), forecast_severity (text),
status (text: 'flagged'|'dismissed'|'rescheduled'|'proceeded'), flagged_at, resolved_at, resolved_by
```

### 3.4 Detection cron: `cron/weather-reschedule-check`

New cron, same shape as `schedule-monitor`:

1. Pull tenants whose resolved `IndustryKey` (via `mapIndustry`) is in the outdoor set.
2. Pull their `bookings` in the next 3 days with status in `('scheduled','pending','confirmed')`.
3. Resolve each booking's address → lat/lng (property → client fallback, same chain as `getBookingAddress`).
4. Round to a grid cell, fetch/reuse cached forecast for that cell + date.
5. Classify: does the forecast for that booking's date/time cross a trade-specific threshold? (see 3.5)
6. If yes and no open `weather_reschedule_flags` row already exists for that booking, insert one and notify ops (reuse the existing `notify`/`notify-team` + tenant-owner-messages plumbing referenced in `platform/CLAUDE.md`'s messaging section — not a new channel).

### 3.5 Trade-specific thresholds (config, not hardcoded per-tenant)

Different trades care about different weather, so this is a lookup table keyed by `IndustryKey`, not a single global rain/no-rain check:

| Trade | Flags on |
|---|---|
| `lawn_care`, `landscaping` | sustained rain > 60% probability, or already-wet ground (rain in prior 24h) — mowing wet grass is bad for the lawn and the mower |
| `snow_removal` | **inverse** — this is the one trade where the detector should confirm a job is scheduled *ahead* of predicted snowfall, not flag it as a conflict |
| `tree_service` | high wind advisory/warning (chainsaw + ladder work in wind is a safety issue, not just a scheduling nuisance) |
| `pressure_washing`, `gutter`, `holiday_lighting` | rain, freezing temps (surfaces don't dry, ladder ice risk) |
| `pool` | no weather gate — largely indifferent, low priority for phase 1 |
| `paving`, `concrete` | rain (won't cure correctly) or temps outside the pour-safe range |
| `roofing`, `siding`, `deck`, `fencing` | rain, high wind (fall-hazard trades) |
| `irrigation` | freeze warning only (relevant mostly for winterization timing) |

This threshold table is the actual design work — start with a conservative subset (rain/snow/high-wind) covering the highest-volume trades (`lawn_care`, `landscaping`, `tree_service`) rather than all fifteen at once, and expand once the false-positive rate on the first few is understood.

### 3.6 Ops-facing surface

- A "Weather" badge/section on `/dashboard/bookings` (or a new small `/dashboard/weather` list, mirroring the `schedule-monitor` issues panel pattern) showing open `weather_reschedule_flags`, grouped by day.
- One-click actions per flag: **Reschedule** (calls the same mutation `handleRescheduleBooking` uses, pre-filled to the next clear day from the cached forecast) or **Proceed anyway** (marks `proceeded`, dismisses).
- Optional phase 2: auto-notify the client via the existing reschedule SMS template *only* after ops confirms — do not auto-reschedule + auto-notify without a human in the loop in phase 1. Weather forecasts are probabilistic and wrong often enough that an unattended auto-reschedule would itself become a support-ticket generator.

## 4. Why not simpler alternatives

- **Just check weather manually every morning** — this is what happens today; it doesn't scale past one tenant/one region and this platform is multi-tenant/multi-region by design.
- **Push the forecast check into `schedule-monitor` directly instead of a new cron** — considered, but `schedule-monitor`'s existing issue set is client/team-member-availability focused and already does a lot of work per tenant; a weather check needs an external API call per unique grid cell (batchable across tenants, not per-tenant), so it fits better as its own cron that can batch grid-cell lookups platform-wide before iterating into per-tenant flags.
- **Auto-reschedule without ops approval** — rejected for phase 1 per 3.6; a wrong auto-reschedule (false-positive forecast, or a trade that's actually fine to run in light rain) erodes trust faster than the manual status quo.

## 5. Open questions for the leader / Jeff

1. Confirm NWS vs. a paid provider — NWS is free but US-only and has looser SLA guarantees than a paid API; worth confirming no tenant is non-US before committing.
2. Confirm the phase-1 trade subset (recommend `lawn_care`, `landscaping`, `tree_service` first — highest booking volume among outdoor trades per the industry preset list).
3. Confirm notification channel for ops (existing `notify`/tenant-owner-messages vs. a dedicated dashboard-only surface with no push) — affects whether this needs a new Level-2-messaging-style bot sender or is pure UI.

## 6. Non-scope (explicitly not part of this proposal)

- No auto-rebooking/auto-dispatch logic — this proposal only detects and flags, ops/clients still decide the new time.
- No client-facing "check weather before you book" UI on the public booking pages — that's a separate, much smaller feature if wanted later.
- No changes to `bookings`, `client_properties`, or any existing table — everything above is net-new tables.
