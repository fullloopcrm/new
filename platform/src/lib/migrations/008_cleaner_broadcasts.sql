-- find-cleaner / cleaner-dispatch broadcast tables (ported from standalone nycmaid).
-- Tenant-scoped. NOT YET APPLIED to prod — apply explicitly before enabling /api/admin/find-cleaner/send.

create table if not exists cleaner_broadcasts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  job_date      date not null,
  start_time    text not null,
  end_time      text,
  qty_needed    integer default 1,
  job_address   text,
  job_zone      text,
  hourly_rate   numeric,
  service_type  text,
  message       text,
  notes         text,
  status        text default 'open',
  test_mode     boolean default true,
  sent_at       timestamptz default now(),
  created_at    timestamptz default now()
);
create index if not exists idx_cleaner_broadcasts_tenant on cleaner_broadcasts(tenant_id, sent_at desc);

create table if not exists cleaner_broadcast_recipients (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  broadcast_id    uuid not null references cleaner_broadcasts(id) on delete cascade,
  cleaner_id      uuid,                 -- team_members.id
  phone           text,
  status          text default 'pending',
  delivery_status text,
  reply_text      text,
  sent_at         timestamptz default now(),
  replied_at      timestamptz
);
create index if not exists idx_cbr_broadcast on cleaner_broadcast_recipients(broadcast_id);
create index if not exists idx_cbr_tenant on cleaner_broadcast_recipients(tenant_id);

alter table cleaner_broadcasts enable row level security;
alter table cleaner_broadcast_recipients enable row level security;
