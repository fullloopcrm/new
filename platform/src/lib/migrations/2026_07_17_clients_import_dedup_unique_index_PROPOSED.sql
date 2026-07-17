-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes a concurrent-double-submit duplicate-import race on
-- POST /api/clients/import (the standalone CSV import endpoint, separate
-- from the staged import pipeline's commitBatch -- see
-- import-staging.commit-race.test.ts for that sibling fix, commit cea200d0).
--
-- The route loads the tenant's existing clients ONCE into an in-memory
-- Set (email + normalized phone), dedupes the incoming rows against that
-- snapshot, then bulk-inserts the survivors. There is no DB-level backstop:
-- `clients` has no unique constraint on (tenant_id, email) or
-- (tenant_id, phone) at all. Two concurrent POSTs for the same CSV -- a
-- double-click on "Import" while a large file is still uploading, or a
-- retry after a slow/timed-out first response -- both read the same
-- pre-insert snapshot before either write lands, so neither sees the
-- other's rows as duplicates: the entire batch gets inserted twice, with
-- both requests reporting success. RED-confirmed empirically
-- (route.concurrent-duplicate.test.ts): 2 rows submitted by 2 concurrent
-- requests land as 4, not 2.
--
-- Fix: partial unique indexes make the DB the real source of truth,
-- normalized the same way the route's own in-memory dedup already
-- normalizes (lowercased email; phone stripped to digits, only enforced
-- at >=10 digits to match the route's own threshold for treating a phone
-- as comparable). route.ts was updated in the same pass to catch the
-- resulting 23505 and retry the conflicting batch row-by-row so one
-- concurrent duplicate doesn't sink the ~199 other valid rows sharing its
-- batch, reporting the loser's rows as duplicates instead of a raw 500 --
-- mirroring the same-date-booking-race precedent
-- (2026_07_13_bookings_same_date_dedup_PROPOSED.sql). That code path is
-- dormant until this index exists; verified via a simulated-constraint test
-- since there is no real Postgres to enforce it in unit tests today.

CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_tenant_email
  ON clients (tenant_id, lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_tenant_phone_digits
  ON clients (tenant_id, regexp_replace(phone, '\D', '', 'g'))
  WHERE phone IS NOT NULL AND length(regexp_replace(phone, '\D', '', 'g')) >= 10;
