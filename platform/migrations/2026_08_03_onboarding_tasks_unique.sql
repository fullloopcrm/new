-- Lets the settings-save auto-verify flow (PUT /api/settings) safely upsert
-- an onboarding_tasks row to 'completed' when a key verifies live, instead
-- of a race-prone select-then-write. No existing duplicates as of
-- 2026-08-03 (checked before adding).
alter table onboarding_tasks
  add constraint onboarding_tasks_tenant_task_unique unique (tenant_id, task_type);
