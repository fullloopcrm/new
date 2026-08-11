-- A single dropship_external_sku isn't enough to identify an order line item
-- for a real provider. Printify (the first real integration being built)
-- needs BOTH a product id and a variant id per line item -- one text field
-- can't hold both cleanly. dropship_external_sku keeps its existing meaning
-- (the provider's primary product identifier); this adds the second one.
alter table service_types add column if not exists dropship_external_variant_id text;
