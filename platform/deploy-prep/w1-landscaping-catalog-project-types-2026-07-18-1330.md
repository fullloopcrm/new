# W1 -- Master Catalog PROJECT-type services (Tucker's Landscaping Company)

Per LEADER 13:12 priority override: own PROJECT-type services (pavers, retaining
walls, hardscaping, drainage, sod install, landscape design/install, outdoor
lighting, fencing, decking) in the same Master Catalog W2 seeded 220 items into
(`service_types`, tenant_id `cf50c81f-f726-48e0-82a8-673f1112fbe8`).

## What was found

Checked live state first (`scripts/check-catalog-state.mjs`) instead of assuming.
W2's 220-item seed already tagged most big install jobs correctly as
`item_type='project'` (pavers, retaining walls, sod/turf, decks, fire pits,
etc -- 32 rows). But two of my assigned categories had **zero** project-tagged
rows despite having real installation-scale items sitting in the table at
`item_type='service'` (the column default): fencing (Privacy Fence Wood/Vinyl,
Chain Link Fence) and drainage (French Drain, Dry Well, Catch Basin, Yard
Grading & Regrading). This is exactly the failure mode the leader's 13:19
message described (items silently defaulting to "service"). Landscape
design/install and outdoor lighting also only had 1-2 project rows each --
thin coverage for a "project" category vs. their maintenance-item siblings.

## What was done

`scripts/seed-landscaping-catalog-projects.ts` (committed):

1. **Retagged 7 existing rows** from `item_type='service'` to `'project'` --
   only the full one-off installation jobs (fence *builds*, drain/basin/regrade
   *installs*), not their repair/staining/maintenance siblings (Fence Repair,
   Fence Staining, Silt Fence Installation, Erosion Control Matting, Downspout
   Extension, Sump Pump Discharge Line all correctly stay `service`).
2. **Inserted 15 new project-type rows** rounding out landscape design/install
   (4), outdoor lighting (3), drainage (2), fencing (3), and hardscaping (3) --
   checked against all 224 existing names first, zero collisions, distinct
   from every name in W2's set (coordinated via file path, no duplication).

Tenant now has 239 total catalog items, 54 of them `item_type='project'` (up
from 32). Read back after write to confirm every touched/inserted row actually
persisted `item_type='project'` (not just assumed from the insert payload) --
this was scripted as a hard failure (`process.exit(1)`) if any row didn't save
correctly, precisely to catch the "all showing as service" bug class before
reporting done.

## Judgment call flagged

My worker standing instructions say prepare DB scripts as files only, leader
runs prod writes. But LEADER's 13:22 broadcast to ALL workers explicitly
authorized direct writes to this specific tenant ("real, persisted prod data
... keep working directly on it, no more test-env hedging for this tenant
specifically"), and W2 already executed the same category of write (220-row
insert) under that authorization. I ran this script directly rather than
leaving it file-only, treating the 13:22 broadcast as current instruction
superseding the standing DDL-prep-only rule for this tenant's catalog data
(not a schema/DDL change). Flagging this explicitly in case that read is wrong.

## Verification

- Read back post-write: 239 total rows, 54 `item_type='project'`, 0 wrong-type
  rows among the 7 retagged + 15 inserted (script asserts this and would have
  exited non-zero otherwise).
- `npx tsc --noEmit`: clean for both new files; 4 pre-existing unrelated errors
  remain (admin-auth route, 2 cron test files, sunnyside site-nav.ts) -- none
  touched by this change.
- Not verified in the browser UI -- recommend a look at the Master Catalog
  page filtered to "Project" on this tenant to confirm the UI actually renders
  `item_type` correctly (separate from the data-layer bug this fixes).

## Not done / out of scope

- Did not touch W2's maintenance/recurring service rows or the edit-UI/
  category-type work (W2's lane).
- Did not add a `Landscape Design/Install` etc. new top-level category string
  -- reused W2's existing `category` grouping values (Hardscaping, Drainage &
  Grading, Outdoor Living & Structures, Holiday & Landscape Lighting, Planting
  & Garden Design) for UI consistency.
