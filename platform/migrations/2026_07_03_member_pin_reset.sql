-- Self-service tenant-member PIN reset codes.
-- Mirrors portal_auth_codes but keyed to a tenant_members row instead of a client.
-- A member who forgot their operator PIN requests a code, delivered via THEIR
-- tenant's own SMS/email, then sets a new PIN — all tenant-scoped. Full Loop
-- platform never issues or sees the PIN.

create table if not exists member_pin_reset_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  member_id uuid not null references tenant_members(id) on delete cascade,
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- Fast lookup of the live (unused) code for a phone during verify.
create index if not exists idx_member_pin_reset_active
  on member_pin_reset_codes (phone) where used = false;

create index if not exists idx_member_pin_reset_tenant
  on member_pin_reset_codes (tenant_id);
