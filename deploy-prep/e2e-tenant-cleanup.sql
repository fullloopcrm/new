-- deploy-prep/e2e-tenant-cleanup.sql
-- =====================================================================
-- GATED PREP for JEFF-MORNING-QUEUE Q5:
--   Remove the 6 leftover "W1-E2E" test tenants that were left in prod
--   after a prior onboarding E2E run and never auto-cleaned.
--
-- WHAT THESE ARE (from LEADER-CHANNEL, W1 14:22Z + W3 triage 13:28):
--   - Names prefixed  "W1-E2E"
--   - status = 'pending' (never activated, not serving customers)
--   - Each owns a tenant_domains row  w1-e2e-<trade>-*.fullloopcrm.com
--     trades: cleaning / handyman / hvac / junk-removal / pest / towing
--   - UUID prefixes reported by W1:
--       d16872ed 20b3f627 d95c9c9c 656a9cc3 7b151cb6 25c005a4
--
-- SAFETY MODEL:
--   STEP 1  = read-only. Materialize the target set behind a TRIPLE guard,
--             assert there are exactly 6, and prove each carries ZERO real
--             bookings / payments / clients / deals.
--   STEP 2  = the DELETEs, COMMENTED OUT. Run them ONLY after STEP 1's
--             assertion passes and the money/booking/client/deal counts are
--             all zero. They reference the same temp target set built in
--             STEP 1, so the delete cannot drift from what was verified.
--   STEP 3  = re-verify nothing matches the guard afterwards.
--
-- NOTHING IN THIS FILE IS EXECUTED BY AUTHORING IT. A human runs it,
-- reads STEP 1, then (only if clean) uncomments STEP 2 and re-runs STEP 3.
-- Run STEP 1 and STEP 2 in the SAME psql session (the temp table is
-- session-scoped and is what STEP 2 deletes against).
--
-- FK note: tenants(id) is referenced ON DELETE CASCADE by clients, bookings,
-- payments, deals, tenant_domains, team_members, service_types, and the rest
-- of the tenant-scoped tables. Deleting the tenants row alone cascades all
-- children. We still delete tenant_domains explicitly first for clarity.
-- =====================================================================

-- Everything runs inside ONE explicit transaction so nothing persists until
-- the operator types COMMIT by hand after reviewing STEP 3. There is NO
-- auto-COMMIT and NO auto-ROLLBACK at the end of this file — that is on
-- purpose (an auto-ROLLBACK would silently discard an intended delete; an
-- auto-COMMIT would defeat the gate). If STEP 1's guard RAISEs, the
-- transaction aborts and later statements refuse to run until you ROLLBACK.
BEGIN;

-- ---------------------------------------------------------------------
-- STEP 1 — identify + prove-empty  (READ ONLY)
-- ---------------------------------------------------------------------

-- Build the target set ONCE, behind three independent guards. A row must:
--   (a) have a W1-E2E name prefix, AND
--   (b) be status = 'pending' (real tenants are 'active'), AND
--   (c) own at least one w1-e2e-%.fullloopcrm.com alias in tenant_domains.
-- A real customer tenant would have to satisfy ALL THREE to be caught — the
-- slug-collision risk called out in Q5's blast-radius note is neutralized.
-- Session-scoped (default PRESERVE ROWS) so it survives across the STEP 1 /
-- STEP 2 statements; it disappears when the session ends. Re-running this
-- file in a fresh session recreates it; re-running in the SAME session will
-- error on the CREATE — reconnect or DROP TABLE _e2e_cleanup_targets first.
CREATE TEMP TABLE _e2e_cleanup_targets AS
SELECT t.id, t.name, t.slug, t.status
FROM tenants t
WHERE t.name ILIKE 'W1-E2E%'
  AND t.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM tenant_domains d
    WHERE d.tenant_id = t.id
      AND d.domain LIKE 'w1-e2e-%.fullloopcrm.com'
  );

-- 1a. Look at exactly which tenants matched. EXPECT 6 ROWS, all the trades
--     cleaning/handyman/hvac/junk-removal/pest/towing, all status=pending.
SELECT id, name, slug, status
FROM _e2e_cleanup_targets
ORDER BY name;

-- 1b. HARD GATE: refuse to proceed unless the guard caught exactly 6.
--     If this RAISEs, STOP — the fixtures changed; do not uncomment STEP 2.
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM _e2e_cleanup_targets;
  IF n <> 6 THEN
    RAISE EXCEPTION 'ABORT: expected 6 W1-E2E target tenants, found %. Investigate before deleting.', n;
  END IF;
  RAISE NOTICE 'OK: 6 W1-E2E target tenants matched the guard.';
END $$;

-- 1c. Cross-check against the UUID prefixes W1 reported. Informational: every
--     target should map to one of these; anything mismatched = investigate.
SELECT
  c.id,
  c.name,
  (left(c.id::text, 8) IN
    ('d16872ed','20b3f627','d95c9c9c','656a9cc3','7b151cb6','25c005a4'))
    AS matches_w1_reported_id
FROM _e2e_cleanup_targets c
ORDER BY c.name;

-- 1d. THE MONEY/WORK GATE. Per-tenant row counts across the four tables the
--     decision hinges on. EVERY NUMBER MUST BE 0 before deleting. If any is
--     nonzero, a "test" tenant took real work/money — STOP and escalate.
SELECT
  c.id,
  c.name,
  (SELECT count(*) FROM bookings b WHERE b.tenant_id = c.id) AS bookings,
  (SELECT count(*) FROM payments p WHERE p.tenant_id = c.id) AS payments,
  (SELECT count(*) FROM clients  cl WHERE cl.tenant_id = c.id) AS clients,
  (SELECT count(*) FROM deals    dl WHERE dl.tenant_id = c.id) AS deals
FROM _e2e_cleanup_targets c
ORDER BY c.name;

-- 1e. Same gate as a single aggregate for a fast yes/no. EXPECT one row of
--     all zeros. Any nonzero total => DO NOT DELETE.
SELECT
  (SELECT count(*) FROM bookings b WHERE b.tenant_id IN (SELECT id FROM _e2e_cleanup_targets)) AS total_bookings,
  (SELECT count(*) FROM payments p WHERE p.tenant_id IN (SELECT id FROM _e2e_cleanup_targets)) AS total_payments,
  (SELECT count(*) FROM clients  c WHERE c.tenant_id IN (SELECT id FROM _e2e_cleanup_targets)) AS total_clients,
  (SELECT count(*) FROM deals    d WHERE d.tenant_id IN (SELECT id FROM _e2e_cleanup_targets)) AS total_deals;

-- 1f. Informational only — provisioning artifacts (team_members, service_types,
--     tenant_domains, etc.) are EXPECTED to be nonzero for these fixtures and
--     are removed automatically by the ON DELETE CASCADE. They are NOT a
--     blocker; only 1d/1e block.
SELECT
  c.id,
  c.name,
  (SELECT count(*) FROM tenant_domains td WHERE td.tenant_id = c.id) AS tenant_domains,
  (SELECT count(*) FROM team_members tm WHERE tm.tenant_id = c.id)   AS team_members,
  (SELECT count(*) FROM service_types st WHERE st.tenant_id = c.id)  AS service_types
FROM _e2e_cleanup_targets c
ORDER BY c.name;


-- ---------------------------------------------------------------------
-- STEP 2 — the DELETEs  (COMMENTED OUT — run only after STEP 1 is clean)
-- ---------------------------------------------------------------------
-- Preconditions before uncommenting, ALL must hold:
--   * 1a returned exactly the 6 expected trade tenants, all status=pending
--   * 1b printed "OK" (did not RAISE)
--   * 1c: matches_w1_reported_id = true for all 6
--   * 1d/1e: bookings, payments, clients, deals are ALL 0
--
-- Uncomment the two statements below and re-run in the SAME session that
-- built _e2e_cleanup_targets in STEP 1.

-- -- 2a. Delete the alias rows explicitly first (also handled by cascade).
-- DELETE FROM tenant_domains
--  WHERE tenant_id IN (SELECT id FROM _e2e_cleanup_targets);

-- -- 2b. Delete the tenants; ON DELETE CASCADE reaps every remaining child
-- --     (team_members, service_types, ledger, onboarding_tasks, crm_notes,
-- --      partner_requests, and any bookings/payments/clients/deals — proven 0).
-- DELETE FROM tenants
--  WHERE id IN (SELECT id FROM _e2e_cleanup_targets);


-- ---------------------------------------------------------------------
-- STEP 3 — re-verify  (READ ONLY)
-- ---------------------------------------------------------------------
-- After the STEP 2 DELETEs run, the guard should match NOTHING.
-- EXPECT remaining_targets = 0. If STEP 2 is still commented out, this will
-- still report 6 (nothing deleted yet) — that is correct pre-delete.
SELECT count(*) AS remaining_targets
FROM tenants t
WHERE t.name ILIKE 'W1-E2E%'
  AND t.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM tenant_domains d
    WHERE d.tenant_id = t.id
      AND d.domain LIKE 'w1-e2e-%.fullloopcrm.com'
  );

-- Belt-and-suspenders: confirm no w1-e2e fullloopcrm alias domains linger.
-- EXPECT 0 after the delete (6 before).
SELECT count(*) AS remaining_w1e2e_domains
FROM tenant_domains
WHERE domain LIKE 'w1-e2e-%.fullloopcrm.com';

-- The transaction opened by BEGIN is STILL OPEN here. Review the output above,
-- then type ONE of these yourself at the psql prompt:
--   COMMIT;    -- persist the STEP 2 deletes (only after STEP 1 was clean)
--   ROLLBACK;  -- abort and change nothing (also use this if you only ran STEP 1)
-- This file intentionally does NOT COMMIT or ROLLBACK for you.
