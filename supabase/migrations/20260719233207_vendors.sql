-- Adopted from legacy hand-run migration: 2026_07_18_vendors.sql
-- Original commit date (git first-add): 2026-07-19T19:32:04-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Vendors (2026-07-18)
-- Basic vendor directory under Production — name, contact, category/supplies
-- type, address, notes. Supply-linking + auto-ordering is a later feature;
-- this is just the record store + CRUD page.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  category text,
  address text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON public.vendors(tenant_id);
