-- Rep's answers to the preset qualifying questions, captured at the Qualified stage.
alter table partner_requests
  add column if not exists qualifying_answers jsonb;
