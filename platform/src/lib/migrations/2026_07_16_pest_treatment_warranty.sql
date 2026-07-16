-- 2026_07_16_pest_treatment_warranty.sql
-- W1 (P1 schema lane) — pest re-treat guarantee/warranty window tracking.
--
-- WHY: the-nyc-exterminator's marketing makes an explicit, specific, recurring
-- promise across page.tsx/faq/page.tsx/quote-request/page.tsx/schedule-service/
-- page.tsx/about/page.tsx: "general pest control carries a 30-day guarantee,
-- bed bug heat treatment includes a 90-day guarantee, termite treatment with
-- bait station monitoring carries an annual renewable guarantee — if pests
-- return within the guarantee window we come back and re-treat at no
-- additional charge." pest_treatment_logs (2026_07_16_pest_treatment_logs.sql,
-- landed earlier today) records THAT a treatment happened but has no field for
-- the guarantee window the customer was promised, and no way to tell "is this
-- property still covered" or "was this visit a paid job or a free warranty
-- honor" months later when a customer calls back. Ops has no way to check the
-- promise it's on the hook for, and finance has no way to see how much free
-- re-service work the guarantee is actually costing.
--
-- Additive-only, all new/nullable columns on the existing table — nothing
-- else touched.
alter table pest_treatment_logs
  add column if not exists warranty_days integer;

-- Guard against a nonsensical negative/zero window (NULL — "no guarantee
-- stated for this visit" — stays allowed).
alter table pest_treatment_logs
  drop constraint if exists pest_treatment_logs_warranty_days_positive;
alter table pest_treatment_logs
  add constraint pest_treatment_logs_warranty_days_positive
  check (warranty_days is null or warranty_days > 0);

-- Generated, not app-computed: always in sync with application_date +
-- warranty_days even if a row is edited directly, and lets the "which
-- properties are still under warranty" / "what's expiring this week" queries
-- filter on a real indexed column instead of computing per-row in application
-- code. NULL when warranty_days is NULL (no guarantee stated).
alter table pest_treatment_logs
  add column if not exists warranty_expires_on date
  generated always as (
    case when warranty_days is null then null
    else application_date + warranty_days end
  ) stored;

-- Links a free warranty re-treat visit back to the original paid application
-- it's honoring, so "how many re-services did this guarantee cost us" is a
-- real query instead of manual notes-field archaeology. ON DELETE SET NULL —
-- the re-service record must survive the original being deleted later.
alter table pest_treatment_logs
  add column if not exists is_reservice boolean not null default false;
alter table pest_treatment_logs
  add column if not exists reservice_of_log_id uuid references pest_treatment_logs(id) on delete set null;

-- Powers "what's still under warranty" / "what's expiring soon" dashboard
-- queries (tenant_id, warranty_expires_on >= today, ordered).
create index if not exists idx_pest_treatment_logs_warranty_expiry
  on pest_treatment_logs (tenant_id, warranty_expires_on)
  where warranty_expires_on is not null;
