-- NYC Maid → FullLoop column parity (additive, safe). Adds columns NYC has that
-- fullloop lacked, so migrated data lands cleanly + ported routes stop erroring.
-- Rename-artifact cleaner_* cols intentionally skipped (fullloop uses team_member_*).

alter table clients add column if not exists active boolean default true;
alter table clients add column if not exists notes_private text;
alter table clients add column if not exists notes_public text;
alter table clients add column if not exists selena_memory text;

alter table bookings add column if not exists is_emergency boolean default false;
alter table bookings add column if not exists max_hours numeric;

alter table payments add column if not exists amount numeric;
alter table payments add column if not exists notes text;
alter table payments add column if not exists stripe_payment_intent text;
alter table payments add column if not exists tip numeric;

alter table tenant_settings add column if not exists cleaner_guidelines text;
alter table tenant_settings add column if not exists google_tokens jsonb;
alter table tenant_settings add column if not exists google_business jsonb;
alter table tenant_settings add column if not exists budget_rate numeric;
alter table tenant_settings add column if not exists reschedule_notice_onetime_hours integer;
alter table tenant_settings add column if not exists reschedule_notice_recurring_days integer;

alter table referrers add column if not exists active boolean default true;
alter table referrers add column if not exists apple_cash_phone text;
alter table referrers add column if not exists ref_code text;
alter table referrers add column if not exists zelle_email text;
alter table referrers add column if not exists zelle_phone text;

alter table notifications add column if not exists read boolean default false;
alter table notifications add column if not exists deal_id uuid;

alter table email_logs add column if not exists booking_id uuid;
alter table email_logs add column if not exists recipient text;
alter table email_logs add column if not exists sent_at timestamptz default now();

alter table error_logs add column if not exists dismissed_at timestamptz;
alter table error_logs add column if not exists dismissed_by text;
alter table error_logs add column if not exists method text;
alter table error_logs add column if not exists payload_sample text;
alter table error_logs add column if not exists source text;
alter table error_logs add column if not exists suppress_reason text;
alter table error_logs add column if not exists suppressed boolean default false;

alter table sms_conversations add column if not exists contact_id uuid;
alter table sms_conversations add column if not exists escalation_locked_until timestamptz;
alter table sms_conversations add column if not exists language text;

alter table travel_time_cache add column if not exists from_address text;
alter table travel_time_cache add column if not exists to_address text;
alter table travel_time_cache add column if not exists duration_minutes numeric;
alter table travel_time_cache add column if not exists created_at timestamptz default now();

alter table unmatched_payments add column if not exists amount numeric;
alter table unmatched_payments add column if not exists matched boolean default false;
alter table unmatched_payments add column if not exists reference_id text;

alter table campaigns add column if not exists channel text;
alter table campaigns add column if not exists email_body text;
alter table campaigns add column if not exists sms_body text;
alter table campaigns add column if not exists audience_filter jsonb;

alter table sms_logs add column if not exists inbound_to text;
alter table client_reviews add column if not exists cleaner_id uuid;
alter table reviews add column if not exists cleaner_name text;
alter table reviews add column if not exists featured boolean default false;

-- lead_clicks: NYC's rich attribution/tracking columns
alter table lead_clicks add column if not exists connection text;
alter table lead_clicks add column if not exists cta_clicked_at timestamptz;
alter table lead_clicks add column if not exists engaged_30s boolean;
alter table lead_clicks add column if not exists final_scroll integer;
alter table lead_clicks add column if not exists final_time integer;
alter table lead_clicks add column if not exists first_domain text;
alter table lead_clicks add column if not exists first_visit_at timestamptz;
alter table lead_clicks add column if not exists last_domain text;
alter table lead_clicks add column if not exists lead_id text;
alter table lead_clicks add column if not exists load_speed numeric;
alter table lead_clicks add column if not exists manual_conversion boolean;
alter table lead_clicks add column if not exists manual_sale numeric;
alter table lead_clicks add column if not exists placement text;
alter table lead_clicks add column if not exists referrer text;
alter table lead_clicks add column if not exists scroll_at_cta integer;
alter table lead_clicks add column if not exists time_before_cta integer;
alter table lead_clicks add column if not exists time_on_page integer;
alter table lead_clicks add column if not exists true_close boolean;
alter table lead_clicks add column if not exists true_conversion boolean;
alter table lead_clicks add column if not exists visitor_ip text;
