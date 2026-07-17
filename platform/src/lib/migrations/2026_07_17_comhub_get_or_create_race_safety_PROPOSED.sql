-- 2026_07_17_comhub_get_or_create_race_safety_PROPOSED.sql
--
-- CORRECTION (2026-07-17 ~17:26): this migration originally shipped as
-- "add missing comhub_get_or_create_contact_by_email fn + race safety" on
-- the assumption that the function was undefined in prod (it's absent from
-- every tracked migration file). A read-only prod check
-- (`pg_proc`) confirmed `comhub_get_or_create_contact_by_email` DOES exist
-- live, same as `_by_phone` and `comhub_get_or_create_thread` — untracked
-- in migration files, but not actually missing from the live DB. So the 5
-- call sites (portal messages, admin send, email backfill, comhub-email
-- cron) have NOT been silently failing since inception; that part of the
-- original write-up was wrong. Trimmed this file down to just the part
-- that's still real: the TOCTOU race hardening below, applied ONLY to
-- `_by_phone` and `comhub_get_or_create_thread` — their bodies are tracked
-- in migrations/2026_05_19_comhub.sql, so this CREATE OR REPLACE is a known
-- 1:1 patch (retry loop added, nothing else changed). `_by_email`'s live
-- body was never tracked anywhere; the original file's `_by_email` block
-- was a guess (mirrored from `_by_phone`) written back when we still
-- thought the function needed creating from scratch. Applying that guess
-- now, against a live function we've only confirmed *exists* (not what it
-- actually contains), would risk silently overwriting real prod logic.
-- Left out — see the comment at its former position below.
--
-- TOCTOU RACE (same class as
-- 2026_07_17_rate_limit_check_and_record_atomic_PROPOSED.sql and
-- 2026_07_16_booking_overlap_trigger_advisory_lock_PROPOSED.sql).
--
-- All three get-or-create functions in this family (`..._by_phone`,
-- `..._by_email`, `comhub_get_or_create_thread`) share this race shape;
-- this migration hardens the two whose bodies are known. Plain
-- SELECT-then-INSERT with no locking between the two steps. Two concurrent
-- callers for the same not-yet-existing key (e.g. an inbound SMS and an
-- inbound voice call landing near-simultaneously for the same new customer
-- phone number, or a webhook redelivery racing the original delivery before
-- this session's earlier customer_call_id claim-guard runs — see
-- aba41390) can both pass the SELECT before either INSERT commits. Because
-- `comhub_contacts` has real unique indexes
-- (`uniq_comhub_contacts_tenant_phone`, `uniq_comhub_contacts_tenant_email`)
-- and `comhub_threads` has one too
-- (`uniq_comhub_threads_open_contact_channel`), the race doesn't create
-- silent duplicates — it makes the LOSING transaction's INSERT raise
-- `unique_violation`, which the calling routes above all treat as total
-- failure (500, or silently skipped/swallowed) even though the row it
-- wanted already exists one query away. Concretely: telnyx-voice's
-- get-or-create-contact call (route.ts:560) races here BEFORE its own
-- customer_call_id claim-guard runs, so a genuine inbound call can lose a
-- race against a concurrent SMS/email touch for the same contact and get
-- dropped with `{ ok: true, note: 'contact create failed' }` — no admin
-- ring, no thread, and Telnyx never retries because the response was 200.
--
-- THE FIX: wrap each function's terminal INSERT in a bounded
-- retry-on-unique_violation loop (the standard Postgres idiom for
-- get-or-create races that can't use a single `INSERT ... ON CONFLICT`
-- because the lookup key isn't a single column/constraint — here it's
-- phone-or-email-or-client_id). On `unique_violation`, loop back and
-- re-SELECT: the winning transaction's row is now visible and gets
-- returned/updated instead of erroring. Capped at 3 attempts so a genuinely
-- pathological repeated-conflict case still surfaces as an error instead of
-- looping forever.
--
-- ROLLOUT SAFETY: pure CREATE OR REPLACE FUNCTION, same signatures as
-- today — no TypeScript changes needed, no fallback path required. The
-- race closes for every existing `_by_phone` / `_thread` caller
-- transparently. `_by_email`'s race is NOT addressed here (see above).
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_17_comhub_get_or_create_race_safety_PROPOSED.sql

BEGIN;

-- ─── comhub_get_or_create_contact_by_phone — hardened (race-safe) ───────
CREATE OR REPLACE FUNCTION comhub_get_or_create_contact_by_phone(
  p_tenant_id UUID,
  p_phone TEXT,
  p_name TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_contact_id UUID;
  v_email TEXT;
  v_name_lookup TEXT;
  v_client_id UUID := p_client_id;
  v_team_member_id UUID;
  v_attempt INT := 0;
BEGIN
  IF p_phone IS NULL OR p_phone = '' THEN RETURN NULL; END IF;
  IF v_client_id IS NOT NULL THEN
    PERFORM 1 FROM clients WHERE id = v_client_id AND tenant_id = p_tenant_id;
    IF NOT FOUND THEN v_client_id := NULL; END IF;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND phone = p_phone LIMIT 1;
    IF v_contact_id IS NOT NULL THEN
      UPDATE comhub_contacts SET name = COALESCE(name, p_name), client_id = COALESCE(client_id, v_client_id), updated_at = now() WHERE id = v_contact_id;
      RETURN v_contact_id;
    END IF;
    IF v_client_id IS NULL THEN
      SELECT id, email, name INTO v_client_id, v_email, v_name_lookup FROM clients WHERE tenant_id = p_tenant_id AND phone = p_phone LIMIT 1;
    ELSE
      SELECT email, name INTO v_email, v_name_lookup FROM clients WHERE id = v_client_id LIMIT 1;
    END IF;
    IF v_client_id IS NULL THEN
      SELECT id INTO v_team_member_id FROM team_members WHERE tenant_id = p_tenant_id AND phone = p_phone LIMIT 1;
    END IF;
    IF v_email IS NOT NULL THEN
      SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND lower(email) = lower(v_email) LIMIT 1;
      IF v_contact_id IS NOT NULL THEN
        UPDATE comhub_contacts
           SET phone = COALESCE(phone, p_phone), name = COALESCE(name, p_name, v_name_lookup),
               client_id = COALESCE(client_id, v_client_id), team_member_id = COALESCE(team_member_id, v_team_member_id),
               updated_at = now()
         WHERE id = v_contact_id;
        RETURN v_contact_id;
      END IF;
    END IF;
    BEGIN
      INSERT INTO comhub_contacts (tenant_id, phone, email, name, client_id, team_member_id)
        VALUES (p_tenant_id, p_phone, v_email, COALESCE(p_name, v_name_lookup), v_client_id, v_team_member_id)
        RETURNING id INTO v_contact_id;
      RETURN v_contact_id;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 3 THEN RAISE; END IF;
      -- a concurrent caller committed a row on (tenant_id,phone) or
      -- (tenant_id,lower(email)) between our SELECT and our INSERT; loop
      -- back and pick up the row they just created instead of erroring.
    END;
  END LOOP;
END;
$$;

-- ─── comhub_get_or_create_contact_by_email — INTENTIONALLY OMITTED ──────
-- This function is confirmed live in prod (pg_proc) but its body was never
-- tracked in any migration file — the prior version of this file guessed a
-- body by mirroring `_by_phone` (phone/email swapped) and proposed a
-- CREATE OR REPLACE using that guess. Applying an unverified guessed body
-- against a live, untracked, possibly-different implementation risks
-- silently replacing real prod logic with something that only looks
-- equivalent. Left out of this migration entirely. If the race-safety
-- retry loop should also apply here, that requires first pulling the
-- actual live body (`SELECT pg_get_functiondef('comhub_get_or_create_contact_by_email'::regproc)`)
-- and hardening THAT — a separate, follow-up migration.

-- ─── comhub_get_or_create_thread — hardened (race-safe) ─────────────────
CREATE OR REPLACE FUNCTION comhub_get_or_create_thread(
  p_tenant_id UUID, p_contact_id UUID, p_channel TEXT
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_thread_id UUID;
  v_attempt INT := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    SELECT id INTO v_thread_id FROM comhub_threads
     WHERE tenant_id = p_tenant_id AND contact_id = p_contact_id AND channel = p_channel AND status != 'closed'
     LIMIT 1;
    IF v_thread_id IS NOT NULL THEN RETURN v_thread_id; END IF;
    BEGIN
      INSERT INTO comhub_threads (tenant_id, contact_id, channel) VALUES (p_tenant_id, p_contact_id, p_channel) RETURNING id INTO v_thread_id;
      RETURN v_thread_id;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 3 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

COMMIT;

-- Verify:
-- SELECT proname FROM pg_proc WHERE proname LIKE 'comhub_get_or_create%';
--   (expect all 3: _by_phone, _by_email, _thread — _by_email untouched by
--   this migration, confirm it's still there as a sanity check only)
--
-- Manual race repro for the hardening (run concurrently in two psql sessions
-- against a phone/contact+channel combo that does NOT exist yet):
--   Session A: BEGIN; SELECT comhub_get_or_create_contact_by_phone('<tenant>', '+15550001111'); -- hold, don't commit
--   Session B: SELECT comhub_get_or_create_contact_by_phone('<tenant>', '+15550001111');
--   Before this fix: B's INSERT can raise unique_violation once A commits,
--   propagating as an RPC error to the caller (500 / silent skip depending
--   on route).
--   After this fix: B's exception handler catches unique_violation, loops
--   back, and returns A's committed contact_id instead of erroring.
