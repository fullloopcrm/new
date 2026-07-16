-- 2026_07_16_client_team_pin_hash.sql
-- W1 broad-hunt finding (2026-07-16). team_members.pin and clients.pin are
-- both stored PLAINTEXT (added by 011_parity_with_nycmaid.sql / an early
-- team_members schema) — unlike tenant_members.pin_hash, which is
-- deliberately HMAC-SHA256-hashed keyed by ADMIN_TOKEN_SECRET (see
-- migrations/tenant-member-admin-pins.sql, src/lib/admin-pin.ts). A DB-only
-- leak (backup exfil, misconfigured read access, etc.) exposes every cleaner's
-- and every client's live login PIN in the clear today.
--
-- This file ONLY adds the nullable pin_hash columns, mirroring the
-- tenant_members precedent exactly. It does NOT touch the existing plaintext
-- `pin` columns and does NOT change any read/write code path — see
-- 2026_07_16_client_team_pin_hash.backfill.sql header for why the auth
-- cutover (team-portal/auth, client/login, cleaners/*, client/collect,
-- client/verify-code, client/book) is a deliberately separate, leader-gated
-- follow-up, not part of this file-only pass.
--
-- RUN ORDER:
--   1. 2026_07_16_client_team_pin_hash.sql          <-- this file (add nullable)
--   2. 2026_07_16_client_team_pin_hash.backfill.sql  <-- populate every existing row
--   3. (follow-up, NOT in this pass) cut the read/write paths over to
--      pin_hash, then drop the plaintext `pin` columns.
--
-- Additive + reversible. Safe to run while the existing plaintext-PIN login
-- paths keep working unmodified.

alter table clients
  add column if not exists pin_hash text;
alter table clients
  add column if not exists pin_hash_set_at timestamptz;

alter table team_members
  add column if not exists pin_hash text;
alter table team_members
  add column if not exists pin_hash_set_at timestamptz;

-- Per-tenant uniqueness on the hash, mirroring idx_team_members_tenant_pin_unique
-- (014_security_hardening.sql) and idx_tenant_members_tenant_pinhash
-- (tenant-member-admin-pins.sql). Partial: only enforced where a hash is
-- actually set, so it is a no-op until the backfill runs.
create unique index if not exists idx_team_members_tenant_pinhash
  on team_members (tenant_id, pin_hash)
  where pin_hash is not null and status = 'active';

-- clients.pin has NO uniqueness guarantee today: idx_clients_pin
-- (011_parity_with_nycmaid.sql:17) is a plain index, not UNIQUE, and every
-- write site (client/collect, client/verify-code, client/book) inserts a
-- fresh crypto-random 6-digit PIN with no collision check first. A UNIQUE
-- index on (tenant_id, pin_hash) here would risk failing at CREATE INDEX
-- time if any tenant already has two clients sharing a PIN (low odds per
-- pair, non-trivial with enough clients per tenant — birthday paradox).
-- Deliberately NOT unique in this pass. Before tightening to UNIQUE, the
-- leader should run:
--   select tenant_id, pin, count(*) from clients
--   where pin is not null group by tenant_id, pin having count(*) > 1;
-- and resolve any hits first.
create index if not exists idx_clients_tenant_pinhash
  on clients (tenant_id, pin_hash)
  where pin_hash is not null;
