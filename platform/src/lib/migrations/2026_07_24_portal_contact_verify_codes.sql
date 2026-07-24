-- 2026_07_24_portal_contact_verify_codes.sql
-- OTP codes for verifying a NEW phone/email a client adds to their own
-- client_contacts row via the self-service portal ("My Info"). Kept separate
-- from portal_auth_codes: that table is keyed by phone for LOGIN and would
-- collide if the same phone were also used to verify a new contact.

create table if not exists portal_contact_verify_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  contact_id uuid not null references client_contacts(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  target_value text not null,
  code text not null,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_contact_verify_contact
  on portal_contact_verify_codes (contact_id, channel, used, expires_at);

create index if not exists idx_portal_contact_verify_tenant
  on portal_contact_verify_codes (tenant_id, created_at desc);

comment on table portal_contact_verify_codes is 'OTP codes for verifying a new phone/email added to client_contacts via the client portal.';

-- Service-role only, same as portal_auth_codes — no direct user access.
alter table portal_contact_verify_codes enable row level security;
drop policy if exists "deny_all_portal_contact_verify_codes" on portal_contact_verify_codes;
create policy "deny_all_portal_contact_verify_codes" on portal_contact_verify_codes
  for all to public using (false) with check (false);
