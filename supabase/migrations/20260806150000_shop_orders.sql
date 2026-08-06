-- E-commerce orders. A Stripe Checkout Session alone recorded nothing in our
-- own DB (see /api/shop/checkout + the source:'shop' webhook guard) --
-- fulfillment and the future order-confirmation/digital-delivery comms need
-- a real order row to attach a shipping address, status, and per-item
-- digital delivery link to.
alter table service_types add column if not exists is_digital boolean not null default false;
alter table service_types add column if not exists digital_delivery_url text;

create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  stripe_checkout_session_id text not null,
  customer_email text,
  customer_name text,
  shipping_address jsonb,
  subtotal_cents integer not null,
  status text not null default 'paid' check (status in ('paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  fulfillment_type text not null default 'physical' check (fulfillment_type in ('physical', 'digital', 'mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shop_orders_session_idx on shop_orders (stripe_checkout_session_id);
create index if not exists shop_orders_tenant_idx on shop_orders (tenant_id, created_at desc);

create table if not exists shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop_orders(id) on delete cascade,
  service_type_id uuid references service_types(id) on delete set null,
  name text not null,
  price_cents integer not null,
  qty integer not null,
  is_digital boolean not null default false,
  digital_delivery_url text
);

create index if not exists shop_order_items_order_idx on shop_order_items (order_id);

alter table shop_orders enable row level security;
alter table shop_order_items enable row level security;
