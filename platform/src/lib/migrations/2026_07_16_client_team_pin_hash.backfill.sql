-- 2026_07_16_client_team_pin_hash.backfill.sql
-- Backfills the pin_hash columns added by
-- 2026_07_16_client_team_pin_hash.sql for every EXISTING plaintext
-- team_members.pin / clients.pin value. MUST run AFTER that file.
--
-- HMAC-SHA256 keyed by ADMIN_TOKEN_SECRET, computed in-database via pgcrypto
-- (already enabled by 014_security_hardening.sql). The message format
-- ('<prefix>:<pin>') and key MUST match src/lib/pin-hash.ts exactly
-- (hashTeamMemberPin / hashClientPin) — those are the JS-side functions any
-- future cutover of the read path would call. Verify parity before trusting
-- this backfill: pick one row post-run and confirm
--   select encode(hmac('team-member-pin:' || pin, '<secret>', 'sha256'), 'hex')
-- matches hashTeamMemberPin(pin) called from a node REPL with the same
-- ADMIN_TOKEN_SECRET.
--
-- The secret is NEVER hardcoded in this file — it is passed at run time as a
-- psql variable so it never lands in git or shell history via this file:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v admin_token_secret="$ADMIN_TOKEN_SECRET" \
--     -f src/lib/migrations/2026_07_16_client_team_pin_hash.backfill.sql
--
-- Idempotent: every UPDATE is guarded by `pin_hash is null`, so re-running
-- (e.g. after a mid-run failure, or once late-arriving rows get a plaintext
-- pin) only fills gaps and never re-hashes or clobbers an already-set value.
--
-- Does NOT touch the plaintext `pin` columns and does NOT change any
-- read/write code path. The team-portal/auth, client/login, cleaners/*,
-- client/collect, client/verify-code, and client/book routes keep comparing
-- against plaintext `pin` unmodified until a separate, leader-scheduled
-- cutover: swap those routes to hash-compare via src/lib/pin-hash.ts, THEN
-- (only after confirming zero plaintext gaps) drop the `pin` columns. Doing
-- the code cutover before this backfill has actually run in prod would break
-- every cleaner and client login — that's why it is out of scope for this
-- file-only pass.

create extension if not exists pgcrypto;

update team_members
set pin_hash = encode(hmac('team-member-pin:' || pin, :'admin_token_secret', 'sha256'), 'hex'),
    pin_hash_set_at = now()
where pin_hash is null
  and pin is not null;

update clients
set pin_hash = encode(hmac('client-pin:' || pin, :'admin_token_secret', 'sha256'), 'hex'),
    pin_hash_set_at = now()
where pin_hash is null
  and pin is not null;

-- ── VERIFICATION (fail-loud) ────────────────────────────────────────────
-- Every row that has a plaintext pin must now have a pin_hash. If not, the
-- UPDATE above missed rows (e.g. a data type surprise) — raise instead of
-- silently leaving some logins on an un-hashed value forever.
do $$
declare
  n_team_gap bigint;
  n_client_gap bigint;
begin
  select count(*) into n_team_gap
    from team_members where pin is not null and pin_hash is null;

  select count(*) into n_client_gap
    from clients where pin is not null and pin_hash is null;

  if n_team_gap > 0 or n_client_gap > 0 then
    raise exception
      '2026_07_16_client_team_pin_hash.backfill: % team_members row(s) and % clients row(s) still have a plaintext pin with no pin_hash after backfill',
      n_team_gap, n_client_gap;
  end if;

  raise notice '2026_07_16_client_team_pin_hash.backfill: OK, every plaintext pin now has a pin_hash';
end $$;
