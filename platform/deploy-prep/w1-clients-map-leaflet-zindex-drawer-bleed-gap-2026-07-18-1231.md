# Leaflet map controls/popups painted over the client-profile slide-over — no stacking context on `.leaflet-container` (2026-07-18 12:31)

## Bug (Jeff-reported, screenshot-confirmed)
Reported as: navigate to `/dashboard` "The Loop," click into an active job —
the resulting view renders with the client-profile slide-over panel torn up:
a full map bleeding through/overlapping it, panel sections showing
transparent/misaligned, "TEAM MEMBER AFFINITY" and other content visible
through/behind the map.

## Reproduction / root-cause trace
"TEAM MEMBER AFFINITY" only exists in one place in the codebase:
`src/app/dashboard/clients/client-drawer.tsx` — the `{worker.singular}
Affinity` section header (default label `Team member`, rendered uppercase
via `.clients-section-label { text-transform: uppercase }` in
`clients.css`). That drawer is only ever mounted from
`src/app/dashboard/clients/page.tsx`, alongside a Leaflet map
(`ClientsMap`, `src/components/ClientsMap.tsx`) rendered directly above the
client table in the same view. "The Loop" (`/dashboard`) itself has a
Leaflet map (`JobsMap`/`DashboardMap`) but no client-profile drawer —
clicking a map pin there just opens a plain Leaflet `Popup`, no slide-over.
So the actual surface is `/dashboard/clients` (reached off an active
client/job row), not the dashboard root — the exact "TEAM MEMBER AFFINITY"
string match makes this unambiguous.

Root cause is a CSS stacking-context gap, not a component z-index typo:

- `.clients-drawer` (the slide-over) is `position: fixed; z-index: 60`.
  `.clients-scrim` is `position: fixed; z-index: 50`. Both fixed relative to
  the viewport, as expected for a slide-over.
- Leaflet (`node_modules/leaflet/dist/leaflet.css`) gives its internal panes
  and controls real z-index values: `.leaflet-popup-pane { z-index: 700 }`,
  `.leaflet-control { z-index: 800 }`, `.leaflet-top`/`.leaflet-bottom`
  (zoom controls, attribution) `{ z-index: 1000 }`.
- Leaflet's JS sets `position: relative` on `.leaflet-container` at runtime
  (`Map.js`, only if the container isn't already positioned) but never sets
  a `z-index` on it. `position: relative` + `z-index: auto` does **not**
  establish a new CSS stacking context. Nothing between the map's wrapper
  `<div>` in `clients/page.tsx` and the document root sets a stacking
  context either (`<main>` in `dashboard-shell.tsx` only has
  `overflow-y-auto`, which doesn't create one).
- Net effect: Leaflet's internal 700–1000 z-index layers aren't contained
  by their own map box — they compete directly in the page's root stacking
  context against `.clients-drawer` (60) and `.clients-scrim` (50) and win.
  Map zoom controls, attribution, and any open marker popup render on top
  of the slide-over whenever both are visible, which is exactly the
  "map bleeding through/overlapping the panel" and "sections visible
  through/behind the map" Jeff saw.

This is a well-known Leaflet integration footgun (missing stacking-context
containment on `.leaflet-container`), not something specific to this one
page — every Leaflet map in the dashboard (`ClientsMap`, `DashboardMap`/
`JobsMap`, `TeamJobsMap`, `CoverageMap`, `TeamCoverageMap`) shares the same
`.leaflet-container` class and was equally exposed; it just happens that
`/dashboard/clients` is the only surface that also stacks a fixed drawer
over the same map, so it's the only place the bug was visible.

## Fix (file-only, no push/deploy/DB)
`src/app/globals.css` — added:

```css
.leaflet-container { z-index: 0; }
```

`z-index: 0` combined with Leaflet's existing inline `position: relative`
makes `.leaflet-container` a stacking-context root, so its own internal
panes/controls (however high their internal z-index) are permanently
contained inside it and can never again paint over sibling fixed-position
UI on the page. This is a global, one-line fix per the repo's "one shared
codebase" rule — no per-page patch needed, and it protects every other
Leaflet map instance in the dashboard from the same latent bug, not just
the one Jeff hit.

## Test coverage
None added. This is a CSS cascade/paint-order bug — jsdom (the project's
test environment) doesn't run a layout/paint engine and can't observe
stacking-context containment, so a unit test would not exercise the actual
defect. Verifying this requires a real browser: open `/dashboard/clients`,
open the client drawer while the map has an active popup/visible zoom
controls, confirm the drawer paints fully opaque on top. Flagging per
verify-skill rather than claiming coverage that doesn't exist.

## Verification performed
- `npx tsc --noEmit`: unaffected — pre-existing, unrelated errors only
  (`.next/dev/types/app/api/admin-auth/route.ts`, two pre-existing test
  files under `src/app/api/cron/...`, `sunnyside-clean-nyc/_lib/site-nav.ts`
  import mismatch). None touch `globals.css`, `clients/`, or any Leaflet
  map component.
- Not run in a browser (no dev server / visual check performed this pass —
  file-only change per standing rules). Leader/Jeff should confirm visually
  before/while promoting.
