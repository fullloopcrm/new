-- Full Loop's OWN team/HR record layer — the people who work FOR Full Loop
-- (not any tenant's cleaner/worker roster). Mirrors hr_employee_profiles'
-- shape (same employment_type/hr_status/comp_type/pay_period enums) but
-- flattened into one table since there's no separate "roster" concept here
-- the way there is per-tenant (team_members + hr_employee_profiles joined).
-- Deliberately not tenant-scoped, same reasoning as platform_finance_transactions.
create table if not exists platform_team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  title text,
  department text,
  employment_type text not null default 'contractor_1099' check (employment_type in ('contractor_1099', 'employee_w2')),
  hr_status text not null default 'active' check (hr_status in ('active', 'on_leave', 'terminated')),
  hire_date date,
  termination_date date,
  comp_type text not null default 'per_job' check (comp_type in ('per_job', 'hourly', 'salary')),
  pay_rate_cents integer,
  pay_period text not null default 'per_job' check (pay_period in ('per_job', 'weekly', 'biweekly', 'semimonthly', 'monthly')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_team_members_hr_status_idx on platform_team_members (hr_status);

alter table platform_team_members enable row level security;
