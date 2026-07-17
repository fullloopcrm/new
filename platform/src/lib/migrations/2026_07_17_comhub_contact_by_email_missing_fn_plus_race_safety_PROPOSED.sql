-- 2026_07_17_comhub_contact_by_email_missing_fn_plus_race_safety_PROPOSED.sql
--
-- PART 1 — MISSING FUNCTION (currently broken in production on every call).
--
-- `comhub_get_or_create_contact_by_email` is called live via
-- `supabaseAdmin.rpc('comhub_get_or_create_contact_by_email', ...)` from 5
-- call sites:
--   - src/app/api/portal/messages/route.ts        (customer portal message thread)
--   - src/app/api/admin/comhub/send/route.ts       (admin sending an email to a new contact)
--   - src/app/api/admin/comhub/email/backfill/route.ts (manual email backfill)
--   - src/app/api/cron/comhub-email/route.ts       (scheduled inbound-email ingestion)
-- but no `CREATE FUNCTION comhub_get_or_create_contact_by_email` exists
-- anywhere in this repo's tracked migrations (migrations/2026_05_19_comhub.sql
-- defines only `comhub_get_or_create_contact_by_phone` and
-- `comhub_get_or_create_thread` — the by-email sibling was referenced by the
-- calling code in the same commit but its own CREATE FUNCTION was never
-- written). Unless it was created ad hoc directly against prod outside any
-- tracked migration (unconfirmed — this worker has no DB access to check
-- `pg_proc`), every one of those 5 call sites has been failing on
-- "function comhub_get_or_create_contact_by_email(...) does not exist"
-- (Postgres 42883 / PostgREST PGRST202) since the day they shipped:
--   - portal/messages/route.ts: swallows the RPC error entirely (destructures
--     only `data`), so an email-only client (no phone on file) silently gets
--     an empty message thread instead of their real history — no error
--     surfaced anywhere.
--   - admin/comhub/send/route.ts: returns HTTP 500 on every attempt to email
--     a contact that doesn't have a comhub_contacts row yet — directly
--     user-visible, reproducible every time.
--   - email/backfill + cron/comhub-email: both `skipped++; continue` on RPC
--     error — every inbound email for a not-yet-known sender is silently
--     dropped from comhub. The "email channel" of the comms hub has
--     effectively never ingested a new-sender message in production.
-- Jeff should confirm via `SELECT proname FROM pg_proc WHERE proname =
-- 'comhub_get_or_create_contact_by_email'` against prod before applying —
-- if it turns out to already exist (untracked ad hoc creation), this
-- CREATE OR REPLACE just reconciles the tracked migration history with
-- prod's real definition instead of creating it fresh, and PART 2's
-- hardening still applies either way.
--
-- PART 2 — TOCTOU RACE (same class as
-- 2026_07_17_rate_limit_check_and_record_atomic_PROPOSED.sql and
-- 2026_07_16_booking_overlap_trigger_advisory_lock_PROPOSED.sql).
--
-- All three get-or-create functions in this family (`..._by_phone`,
-- `..._by_email` new here, `comhub_get_or_create_thread`) do a plain
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
-- today — no TypeScript changes needed, no fallback path required. Once
-- applied, all 5 existing call sites for `_by_email` start working (today
-- they 100%-fail), and the phone/thread race closes for every existing
-- caller transparently.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_17_comhub_contact_by_email_missing_fn_plus_race_safety_PROPOSED.sql

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

-- ─── comhub_get_or_create_contact_by_email — NEW (was missing entirely) ─
-- Mirrors comhub_get_or_create_contact_by_phone's shape, keyed by email,
-- with the same race-safe retry loop from day one.
CREATE OR REPLACE FUNCTION comhub_get_or_create_contact_by_email(
  p_tenant_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_contact_id UUID;
  v_phone TEXT;
  v_name_lookup TEXT;
  v_client_id UUID := p_client_id;
  v_team_member_id UUID;
  v_attempt INT := 0;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN RETURN NULL; END IF;
  IF v_client_id IS NOT NULL THEN
    PERFORM 1 FROM clients WHERE id = v_client_id AND tenant_id = p_tenant_id;
    IF NOT FOUND THEN v_client_id := NULL; END IF;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND lower(email) = lower(p_email) LIMIT 1;
    IF v_contact_id IS NOT NULL THEN
      UPDATE comhub_contacts SET name = COALESCE(name, p_name), client_id = COALESCE(client_id, v_client_id), updated_at = now() WHERE id = v_contact_id;
      RETURN v_contact_id;
    END IF;
    IF v_client_id IS NULL THEN
      SELECT id, phone, name INTO v_client_id, v_phone, v_name_lookup FROM clients WHERE tenant_id = p_tenant_id AND lower(email) = lower(p_email) LIMIT 1;
    ELSE
      SELECT phone, name INTO v_phone, v_name_lookup FROM clients WHERE id = v_client_id LIMIT 1;
    END IF;
    IF v_client_id IS NULL THEN
      SELECT id INTO v_team_member_id FROM team_members WHERE tenant_id = p_tenant_id AND lower(email) = lower(p_email) LIMIT 1;
    END IF;
    IF v_phone IS NOT NULL THEN
      SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND phone = v_phone LIMIT 1;
      IF v_contact_id IS NOT NULL THEN
        UPDATE comhub_contacts
           SET email = COALESCE(email, p_email), name = COALESCE(name, p_name, v_name_lookup),
               client_id = COALESCE(client_id, v_client_id), team_member_id = COALESCE(team_member_id, v_team_member_id),
               updated_at = now()
         WHERE id = v_contact_id;
        RETURN v_contact_id;
      END IF;
    END IF;
    BEGIN
      INSERT INTO comhub_contacts (tenant_id, phone, email, name, client_id, team_member_id)
        VALUES (p_tenant_id, v_phone, p_email, COALESCE(p_name, v_name_lookup), v_client_id, v_team_member_id)
        RETURNING id INTO v_contact_id;
      RETURN v_contact_id;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 3 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

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
--   (expect all 3: _by_phone, _by_email, _thread)
-- SELECT comhub_get_or_create_contact_by_email('<a real tenant_id>', 'smoke-test@example.com', 'Smoke Test');
--   (expect a UUID back, not a 42883 "does not exist" error)
--
-- Manual race repro for the hardening (run concurrently in two psql sessions
-- against a phone/email/contact+channel combo that does NOT exist yet):
--   Session A: BEGIN; SELECT comhub_get_or_create_contact_by_phone('<tenant>', '+15550001111'); -- hold, don't commit
--   Session B: SELECT comhub_get_or_create_contact_by_phone('<tenant>', '+15550001111');
--   Before this fix: B's INSERT can raise unique_violation once A commits,
--   propagating as an RPC error to the caller (500 / silent skip depending
--   on route).
--   After this fix: B's exception handler catches unique_violation, loops
--   back, and returns A's committed contact_id instead of erroring.
