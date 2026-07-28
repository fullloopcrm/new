# FROZEN — historical record only, as of 2026-07-28

This directory (158 hand-run `.sql` files, no tracked applied-state) is
**frozen**. Do not add new files here.

**New migrations go through the Supabase CLI**: `supabase migration new
<name>` writes a timestamped file into `supabase/migrations/` at the repo
root. See `docs/adr/0008-migration-tool-cutover.md` and the "NEW WORKFLOW"
section at the top of `docs/runbooks/migration-runbook.md` for the full
process (still gated the same way — a prod write still needs Jeff's
per-migration go, only the apply mechanism changed).

Every file in this directory has been converted 1:1 into
`supabase/migrations/` (see `platform/scripts/migrate-legacy-to-cli.mjs`) and
is being adopted as the tracked baseline — these files stay here unmodified
as the historical record of what was actually run, but this directory itself
is no longer where new work happens.
