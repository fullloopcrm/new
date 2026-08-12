-- Task Board: add file attachments to the per-item "Updates" notes thread.
-- Additive-only (single column add), idempotent. Companion to
-- 20260810200000_task_boards.sql. GATED — author only, do not apply without
-- Jeff's explicit go per THE PROCEDURE in platform/docs/runbooks/migration-runbook.md.

-- ─── PRE (informational) ────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'PRE task_board_notes_attachments: column exists=%',
    (SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'board_item_notes' AND column_name = 'attachments'
    ));
END $$;

ALTER TABLE board_item_notes ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'board_item_notes' AND column_name = 'attachments'
  ) THEN
    RAISE EXCEPTION 'POST FAILED: board_item_notes.attachments column missing';
  END IF;
  RAISE NOTICE 'task_board_notes_attachments POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
--   ALTER TABLE board_item_notes DROP COLUMN IF EXISTS attachments;
