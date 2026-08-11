-- Stripe Checkout already collects phone (phone_number_collection: enabled,
-- see /api/shop/checkout) but the webhook (handleShopOrder) never read
-- session.customer_details.phone -- a real gap for any dropship provider
-- (Printify's address_to requires phone). Storing it, not re-deriving.
alter table shop_orders add column if not exists customer_phone text;
