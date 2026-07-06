-- 2026_07_05_calendar_projects.sql
-- Calendar redesign — data model for the multi-view scheduling surface
-- (Timeline / Month / Kanban / Projects). All additive + nullable → safe to run
-- on live prod, no backfill required. Existing cleaning (nycmaid) bookings keep
-- working unchanged: no project_id, duration_class derived on read.
--
-- WHY: one job model, four projections. A 2hr maid job and a 1-year interior-
-- design build must coexist. Short jobs stay atomic `bookings`. Long jobs become
-- a `projects` span whose scheduled visits are ordinary `bookings` linked by
-- project_id (project + touchpoints model). Kanban groups by `stage`.

-- 1. Projects: the span + stage layer for weeks-to-year work. One project owns
--    many bookings (its scheduled touchpoints/visits). Tenant-scoped like all else.
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  client_id     uuid references clients(id) on delete set null,
  title         text not null,
  -- Unified pipeline stage the Kanban board groups by. Slot jobs never need a
  -- project; project stages extend the booking lifecycle with span-level phases.
  stage         text not null default 'lead',
  service_type  text,
  start_date    date,           -- span start (first commitment)
  end_date      date,           -- span end (target completion); null = open-ended
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_projects_tenant on projects(tenant_id);
create index if not exists idx_projects_tenant_stage on projects(tenant_id, stage);

comment on table projects is
  'Span+stage layer for long (weeks-to-year) jobs. Owns many bookings as touchpoints. Slot jobs do not use this.';
comment on column projects.stage is
  'Kanban pipeline stage (e.g. lead, scheduled, in_progress, milestone, done). Trade-agnostic; values are data.';

-- 2. Link a booking to its parent project (null for ordinary slot jobs).
alter table bookings
  add column if not exists project_id uuid references projects(id) on delete set null;

create index if not exists idx_bookings_project on bookings(project_id);

comment on column bookings.project_id is
  'Parent project for a scheduled touchpoint/visit. NULL = standalone slot job (the common case).';

-- 3. Duration class drives which view lane a job renders in. Nullable →
--    derived on read from (end_time - start_time) + project_id when unset, so no
--    backfill is needed and existing rows keep working.
--      slot     = within one day (maid, salon, pest, tow, junk, laundry, fitness)
--      multiday = spans 2-14 days (dumpster rental, small landscaping)
--      project  = has a project_id / spans weeks+ (interior design, construction)
alter table bookings
  add column if not exists duration_class text;

comment on column bookings.duration_class is
  'slot | multiday | project. Optional override; when null, derived on read from duration + project_id.';
