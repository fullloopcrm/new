-- ============================================================================
-- SUCCESSOR INVENTORY QUERY  (READ-ONLY)
-- ----------------------------------------------------------------------------
-- Purpose: inventory successor-relevant data (operating brands/tenants, their
--          owners, and revenue/cost figures) to fill in
--          deploy-prep/successor-package-template.md.
--
-- DO NOT EXECUTE AS PART OF DEPLOY. This is a FILE ARTIFACT ONLY. It is run
-- MANUALLY by Jeff / the leader against the DB after review — never by a worker,
-- never automatically. It performs ZERO writes (no INSERT/UPDATE/DELETE/DDL).
--
-- SAFETY NOTES:
--   * Every statement is a SELECT. No CTE writes, no functions with side effects.
--   * Sensitive per-tenant secret columns (stripe_api_key, telnyx_api_key,
--     resend_api_key, etc.) are DELIBERATELY EXCLUDED — this query only reports
--     their PRESENCE (boolean), never their value. See
--     deploy-prep/successor-package-encryption-note.md.
--   * Money units differ by table (documented inline). Do not sum across units.
--   * Wrap the whole run in a read-only transaction when executing manually:
--         BEGIN; SET TRANSACTION READ ONLY;  -- then run the SELECTs
--         ROLLBACK;
--     so an accidental write cannot commit.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Q1. OPERATING BRANDS  (template §1)
--     One row per tenant = one operating brand. Secrets reported as presence only.
-- ----------------------------------------------------------------------------
SELECT
  t.id                              AS tenant_id,
  t.name                            AS brand_name,
  t.slug,
  t.industry,
  t.status,                                         -- active / suspended / cancelled
  t.currency,
  t.created_at,
  t.last_active_at,
  (t.stripe_api_key   IS NOT NULL)  AS has_stripe_key,   -- presence only, never value
  (t.telnyx_api_key   IS NOT NULL)  AS has_telnyx_key,
  (t.resend_api_key   IS NOT NULL)  AS has_resend_key,
  (t.stripe_account_id IS NOT NULL) AS has_stripe_connect
FROM tenants t
ORDER BY t.status, t.name;


-- ----------------------------------------------------------------------------
-- Q2. OWNERS / KEY OPERATORS PER BRAND  (template §1 operator, §2 owners)
--     tenant_members with an owner/admin role = who can run each brand.
-- ----------------------------------------------------------------------------
SELECT
  t.name                            AS brand_name,
  t.slug,
  m.role,                                           -- owner, admin, dispatcher, viewer
  m.name                            AS member_name,
  m.email                           AS member_email,
  m.phone                           AS member_phone,
  m.created_at
FROM tenant_members m
JOIN tenants t ON t.id = m.tenant_id
WHERE m.role IN ('owner', 'admin')
ORDER BY t.name, (m.role = 'owner') DESC, m.created_at;


-- ----------------------------------------------------------------------------
-- Q3. PLATFORM RECURRING REVENUE  (template §3a — what tenants pay the platform)
--     tenants.monthly_rate / setup_fee are in DOLLARS (INTEGER).
-- ----------------------------------------------------------------------------
SELECT
  t.name                            AS brand_name,
  t.slug,
  t.status,
  t.monthly_rate                    AS monthly_rate_usd,   -- dollars/mo
  t.admin_seats,
  t.team_seats,
  t.setup_fee                       AS setup_fee_usd,      -- dollars, one-time
  t.setup_fee_paid_at
FROM tenants t
ORDER BY t.monthly_rate DESC NULLS LAST, t.name;


-- Q3b. MRR ROLL-UP (active tenants only). monthly_rate in DOLLARS.
SELECT
  COUNT(*)                          AS active_tenants,
  COALESCE(SUM(t.monthly_rate), 0)  AS total_mrr_usd,
  COALESCE(SUM(t.admin_seats), 0)   AS total_admin_seats,
  COALESCE(SUM(t.team_seats), 0)    AS total_team_seats
FROM tenants t
WHERE t.status = 'active';


-- ----------------------------------------------------------------------------
-- Q4. PROPOSAL / PIPELINE REVENUE  (template §3a — signed vs. proposed)
--     partner_requests.proposal_* are in DOLLARS. converted_tenant_id links a
--     won proposal to its live tenant.
-- ----------------------------------------------------------------------------
SELECT
  pr.id                             AS partner_request_id,
  pr.converted_tenant_id,
  t.name                            AS converted_brand_name,
  pr.proposal_admins,
  pr.proposal_team_members,
  pr.proposal_setup_fee             AS proposal_setup_fee_usd,   -- dollars, default 25000
  pr.proposal_monthly               AS proposal_monthly_usd,     -- dollars/mo
  pr.proposal_sent_at
FROM partner_requests pr
LEFT JOIN tenants t ON t.id = pr.converted_tenant_id
WHERE pr.proposal_monthly IS NOT NULL
   OR pr.proposal_setup_fee IS NOT NULL
ORDER BY pr.proposal_sent_at DESC NULLS LAST;


-- ----------------------------------------------------------------------------
-- Q5. TENANT-LEVEL GROSS BILLINGS  (template §3 context — their clients' revenue)
--     bookings.price and tip_amount are in CENTS. Reported as dollars here.
--     This is the tenants' own revenue flowing through the platform, NOT
--     platform revenue — keep the distinction in the package.
-- ----------------------------------------------------------------------------
SELECT
  t.name                                          AS brand_name,
  t.slug,
  COUNT(b.id)                                     AS booking_count,
  ROUND(COALESCE(SUM(b.price), 0) / 100.0, 2)     AS gross_booking_usd,   -- cents → dollars
  ROUND(COALESCE(SUM(b.tip_amount), 0) / 100.0, 2) AS gross_tips_usd,
  COUNT(*) FILTER (WHERE b.payment_status = 'paid')    AS paid_bookings,
  COUNT(*) FILTER (WHERE b.payment_status = 'unpaid')  AS unpaid_bookings
FROM tenants t
LEFT JOIN bookings b ON b.tenant_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY gross_booking_usd DESC;


-- ----------------------------------------------------------------------------
-- Q6. LABOR COST  (template §3b — payroll paid out per brand)
--     payroll_payments.amount is INTEGER; confirm unit (cents vs. dollars)
--     against the app's payroll code before pasting into the package.
-- ----------------------------------------------------------------------------
SELECT
  t.name                            AS brand_name,
  t.slug,
  COUNT(p.id)                       AS payment_count,
  COALESCE(SUM(p.amount), 0)        AS total_paid_raw_units,   -- CONFIRM UNIT
  MIN(p.paid_at)                    AS first_payment_at,
  MAX(p.paid_at)                    AS last_payment_at
FROM tenants t
LEFT JOIN payroll_payments p ON p.tenant_id = t.id
GROUP BY t.id, t.name, t.slug
ORDER BY total_paid_raw_units DESC;

-- ============================================================================
-- END. All statements above are read-only SELECTs. No writes. Run manually only.
-- ============================================================================
