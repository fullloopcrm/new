-- Dedicated waitlist table (additive — touches nothing existing).
-- Tenant-scoped port of NYC Maid's public.waitlist. Lets the PUBLIC booking form
-- (and later admin/agent) waitlist a request when nothing fits a day, WITHOUT
-- faking an sms_conversations row (which the SMS webhook would grab as the
-- client's live thread and corrupt it).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text,
  phone text,
  email text,
  service_type text,
  address text,
  preferred_date date,
  preferred_time text,        -- stored label e.g. "12:00 PM"
  estimated_hours numeric,
  hourly_rate numeric,
  notes text,
  source text not null default 'web',    -- 'web' | 'admin' | 'agent'
  status text not null default 'open',   -- 'open' | 'contacted' | 'booked' | 'expired'
  client_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waitlist_tenant_status_created_idx
  on public.waitlist (tenant_id, status, created_at desc);

-- Lock it to the service role: RLS on + no policies => anon/publishable keys get
-- nothing; the server (service_role) bypasses RLS for the API routes.
alter table public.waitlist enable row level security;
