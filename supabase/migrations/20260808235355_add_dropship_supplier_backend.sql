-- Provider-agnostic dropship supplier backend. Builds on
-- 20260808232946_add_shop_order_fulfillment_tracking.sql (manual tracking
-- fields on shop_orders) by adding a real supplier registry so a product can
-- be linked to a supplier, an order can be dispatched to one, and a real
-- provider (Printful, Gooten, etc.) can be added later by implementing the
-- DropshipAdapter interface (src/lib/dropship/) and registering it — no
-- schema change needed per new provider.

-- Registry of dropship suppliers a tenant can fulfill through. adapter_key
-- selects which DropshipAdapter implementation handles this supplier;
-- 'manual' (the only adapter that exists today) means no automated API call
-- is made and fulfillment stays hand-entered, same as before this migration.
-- config carries whatever a real adapter needs (API key reference, store id,
-- etc.) -- never a raw secret, same convention as tenants.anthropic_api_key.
create table if not exists dropship_suppliers (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  adapter_key  text not null default 'manual',
  config       jsonb not null default '{}'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_dropship_suppliers_tenant on dropship_suppliers(tenant_id, active);

create or replace function dropship_suppliers_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_dropship_suppliers_updated_at on dropship_suppliers;
create trigger trg_dropship_suppliers_updated_at
  before update on dropship_suppliers
  for each row execute function dropship_suppliers_set_updated_at();

alter table dropship_suppliers enable row level security;

-- Which supplier fulfills a product, and that supplier's own SKU for it.
-- One supplier per product for now (matches how dropship products are
-- actually sold -- a join table for multi-supplier-per-product is a later
-- migration if a real need for it shows up).
alter table service_types add column if not exists dropship_supplier_id uuid references dropship_suppliers(id) on delete set null;
alter table service_types add column if not exists dropship_external_sku text;

-- Which supplier an order was (or should be) dispatched to.
alter table shop_orders add column if not exists dropship_supplier_id uuid references dropship_suppliers(id) on delete set null;
