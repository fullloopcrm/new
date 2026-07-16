-- =====================================================================
-- READ-ONLY SCHEMA CHECK: bookings.cleaner_id / bookings.cleaner_pay
-- Purpose: confirm whether the 5 fields BookingsAdmin.tsx's Check In /
--   Check Out / close-out buttons PUT to /api/bookings/[id] --
--   cleaner_id, cleaner_pay, check_in_time, check_out_time, skip_email --
--   are real columns on public.bookings in PROD. Every statement here is
--   a SELECT against information_schema / pg_catalog. NOTHING creates,
--   alters, drops, inserts, updates, or deletes. Safe to run against prod.
--
-- CONTEXT (reported 19:28 this session, deploy-prep/... W3 report):
--   bookings/[id]'s PUT pick() allowlist (route.ts:54) does NOT include
--   any of these 5 fields, only status/actual_hours/price/team_pay etc.
--   check_in_time/check_out_time ARE confirmed real columns per the
--   checked-in schema.sql (lines 153-154) and are written elsewhere
--   (team-portal/checkin), but never via this admin PUT route.
--   cleaner_id/cleaner_pay/skip_email do NOT appear in schema.sql at all.
--   Separately, src/lib/selena/core.ts:1670 selects a `cleaner_pay`
--   column off bookings AND embeds `cleaners(name)` -- a PostgREST embed
--   that requires a real FK from bookings.cleaner_id -> some table. This
--   session's RLS Tier2-5 census (W2, confirmed via 2 independent read
--   paths) already found the `cleaners` table does NOT exist in prod at
--   all -- so if that's the same relationship, core.ts's query would
--   itself already be broken. Query 3 below checks that directly.
--
-- HOW TO RUN: paste into Supabase SQL editor (read-only role is fine) or
--   the Mgmt API SQL path. Three independent result sets come back.
-- =====================================================================

-- QUERY 1: do cleaner_id / cleaner_pay / check_in_time / check_out_time /
-- skip_email exist as columns on public.bookings, and if so what type?
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name IN (
    'cleaner_id',
    'cleaner_pay',
    'check_in_time',
    'check_out_time',
    'skip_email'
  )
ORDER BY column_name;

-- QUERY 2 (informational, only meaningful if QUERY 1 shows cleaner_id
-- exists): what does bookings.cleaner_id actually reference, if it's a
-- real FK? Confirms/refutes the `cleaners(name)` embed in core.ts.
SELECT
  tc.constraint_name,
  kcu.column_name         AS fk_column,
  ccu.table_name           AS references_table,
  ccu.column_name          AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'bookings'
  AND kcu.column_name = 'cleaner_id';

-- QUERY 3: does a `cleaners` table exist at all in prod right now? (Prior
-- read this session via a different path already found it does not --
-- this re-confirms via a plain to_regclass, independent of that path.)
SELECT to_regclass('public.cleaners') AS cleaners_table_oid;
