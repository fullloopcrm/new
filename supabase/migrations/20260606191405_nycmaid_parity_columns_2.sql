-- Adopted from legacy hand-run migration: 010_nycmaid_parity_columns_2.sql
-- Original commit date (git first-add): 2026-06-06T15:14:05-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- NYC Maid parity, round 2 — remaining columns (mapped to fullloop table names) + missing stats table.
alter table admin_tasks add column if not exists booking_id uuid;
alter table admin_tasks add column if not exists client_id uuid;
alter table admin_tasks add column if not exists last_escalated_at timestamptz;
alter table admin_tasks add column if not exists resolved boolean default false;
alter table bank_statements add column if not exists month text;
alter table bank_statements add column if not exists notes text;
alter table blocked_referrers add column if not exists domain text;
alter table campaign_recipients add column if not exists sent_at timestamptz;
alter table team_member_payouts add column if not exists amount numeric;
alter table team_member_payouts add column if not exists method text;
alter table team_members add column if not exists active boolean default true;
alter table team_members add column if not exists welcome_email_sent_at timestamptz;
alter table team_members add column if not exists welcome_sms_sent_at timestamptz;
alter table deals add column if not exists last_contacted_at timestamptz;
alter table expenses add column if not exists vendor text;
alter table referral_commissions add column if not exists commission_amount numeric;
alter table referral_commissions add column if not exists gross_amount numeric;
alter table tenant_settings add column if not exists attribution_window_hours integer;
alter table sms_conversation_messages add column if not exists tenant_id uuid;
alter table verification_codes add column if not exists email text;
create table if not exists client_referral_stats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  referrer_id uuid,
  ref_code text,
  referrer_name text,
  clients_referred integer default 0,
  total_bookings integer default 0,
  total_revenue numeric default 0
);
