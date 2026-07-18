-- 2026_07_17_clients_pin_dedupe.backfill.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: clients.pin (the client-portal login credential, checked by
-- client/login and client-auth.ts) has NEVER had a uniqueness guarantee --
-- idx_clients_pin (011_parity_with_nycmaid.sql) is a plain index, not
-- unique, and every write site that mints a PIN (client/collect,
-- client/verify-code, client/book) inserts a fresh crypto-random 6-digit
-- value with no collision check first. 2026_07_16_client_team_pin_hash.sql's
-- header already flagged this ("clients.pin has NO uniqueness guarantee
-- today ... Before tightening to UNIQUE, the leader should run: select
-- tenant_id, pin, count(*) from clients where pin is not null group by
-- tenant_id, pin having count(*) > 1") but deferred both the check and the
-- fix. This file is that deferred follow-up.
--
-- The runtime consequence is real, not theoretical: client/login/route.ts's
-- PIN lookup used .maybeSingle(), which swallows a 2+-row match as data:null
-- (same PGRST116 code postgrest-js uses for the 0-row case) -- any client
-- whose PIN collided with another client's in the same tenant got a
-- permanent "Invalid PIN" lockout from self-service portal login. That app
-- fix (limit(2)-pick-first) lands in the same pass as this file, but it only
-- masks symptoms for logins going forward -- it doesn't stop the collision
-- rate from climbing, since new PINs are still minted with no collision
-- check. This backfill clears the existing collisions so
-- 2026_07_17_clients_pin_unique.sql (run after this) can actually enforce
-- the invariant at the DB level going forward.
--
-- STRATEGY: for every (tenant_id, pin) group with 2+ non-null rows, keep the
-- oldest row (by created_at, then id, as the deterministic tiebreak) and
-- assign every OTHER row in the group a freshly generated 6-digit PIN that
-- doesn't collide with anything else already in that tenant (including
-- other reassignments happening in this same run). Matches the app's own
-- generation shape (String(100000 + randomInt(0, 900000))).
--
-- Regenerated rows have their pin_hash/pin_hash_set_at cleared (set NULL)
-- rather than recomputed here -- this file has no access to
-- ADMIN_TOKEN_SECRET, and 2026_07_16_client_team_pin_hash.backfill.sql is
-- already idempotent on `where pin_hash is null`, so simply re-running that
-- backfill after this one fills the hash back in correctly. Run order:
--   1. 2026_07_17_clients_pin_dedupe.backfill.sql            <-- this file
--   2. 2026_07_16_client_team_pin_hash.backfill.sql           <-- re-run, fills the gaps this file opens
--   3. 2026_07_17_clients_pin_unique.sql                      <-- enforce the constraint
--
-- Idempotent: a re-run finds no remaining collisions (the fail-loud
-- verification below confirms zero groups with count > 1) and is a no-op.

do $$
declare
  grp record;
  victim record;
  is_keeper boolean;
  new_pin text;
  attempts int;
begin
  for grp in
    select tenant_id, pin
    from clients
    where pin is not null
    group by tenant_id, pin
    having count(*) > 1
  loop
    is_keeper := true;
    for victim in
      select id
      from clients
      where tenant_id = grp.tenant_id and pin = grp.pin
      order by created_at asc, id asc
    loop
      if is_keeper then
        -- First row in creation order keeps the original PIN.
        is_keeper := false;
        continue;
      end if;

      -- Generate a fresh PIN that doesn't collide with anything else
      -- already assigned in this tenant (bounded retry -- 900,000 possible
      -- 6-digit values per tenant makes exhaustion practically impossible).
      attempts := 0;
      loop
        new_pin := (100000 + floor(random() * 900000))::int::text;
        attempts := attempts + 1;
        exit when not exists (
          select 1 from clients where tenant_id = grp.tenant_id and pin = new_pin
        );
        if attempts > 50 then
          raise exception
            '2026_07_17_clients_pin_dedupe.backfill: could not find a free PIN for tenant % after 50 attempts (client id %)',
            grp.tenant_id, victim.id;
        end if;
      end loop;

      update clients
      set pin = new_pin,
          pin_hash = null,
          pin_hash_set_at = null
      where id = victim.id;
    end loop;
  end loop;
end $$;

-- ── VERIFICATION (fail-loud) ────────────────────────────────────────────
-- No (tenant_id, pin) group should have more than one non-null-pin row left.
do $$
declare
  n_remaining bigint;
begin
  select count(*) into n_remaining
  from (
    select tenant_id, pin
    from clients
    where pin is not null
    group by tenant_id, pin
    having count(*) > 1
  ) dupes;

  if n_remaining > 0 then
    raise exception
      '2026_07_17_clients_pin_dedupe.backfill: % (tenant_id, pin) group(s) still collide after dedupe',
      n_remaining;
  end if;

  raise notice '2026_07_17_clients_pin_dedupe.backfill: OK, no clients.pin collisions remain';
end $$;
