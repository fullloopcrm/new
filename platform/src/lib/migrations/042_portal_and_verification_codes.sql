-- 042_portal_and_verification_codes.sql
-- Two tables required by the ported nycmaid client-portal flows.
--
-- portal_auth_codes: existing /api/portal/auth route referenced this table
--   but it was never created. SMS-code login would 500 on any real call.
--
-- verification_codes: used by /api/client/send-code + /api/client/verify-code
--   for email-or-SMS verification in the ported dashboard login.

create table if not exists portal_auth_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_auth_codes_phone_used
  on portal_auth_codes (phone, used, expires_at);

create index if not exists idx_portal_auth_codes_tenant
  on portal_auth_codes (tenant_id, created_at desc);

create table if not exists verification_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  -- identifier = lowercased email OR 'sms:<digits>' — unique within a tenant
  identifier text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, identifier)
);

create index if not exists idx_verification_codes_tenant_exp
  on verification_codes (tenant_id, expires_at);

comment on table portal_auth_codes is 'SMS verification codes for client portal HMAC-token login.';
comment on table verification_codes is 'Email/SMS verification codes for client dashboard login (ported nycmaid flow).';
