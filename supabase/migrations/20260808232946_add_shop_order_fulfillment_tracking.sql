-- Fulfillment/supplier tracking on shop_orders. No dropship or carrier API
-- integration exists yet (see 20260806150000_shop_orders.sql) -- an operator
-- can only flip status by hand today, with nothing recorded about who's
-- actually fulfilling the order or a tracking number to hand the customer.
-- These columns are the provider-agnostic base every future integration
-- (Printful, a generic vendor webhook, etc.) writes into; a specific
-- integration is a separate migration once a tenant has a real provider.
alter table shop_orders add column if not exists supplier_name text;
alter table shop_orders add column if not exists external_order_id text;
alter table shop_orders add column if not exists tracking_number text;
alter table shop_orders add column if not exists carrier text;
alter table shop_orders add column if not exists tracking_url text;
