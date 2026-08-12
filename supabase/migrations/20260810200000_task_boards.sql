-- Task Board: Monday.com-style boards/groups/items/columns + per-item notes.
-- Global feature (per platform/CLAUDE.md GLOBAL RULE) — one shared codebase,
-- tenants differ only by data. tenant_id NULL means a platform-level board,
-- owned by Full Loop admin (/admin/boards) rather than a tenant — those rows
-- are only ever reachable through admin routes using supabaseAdmin directly,
-- never through tenantDb() (src/lib/tenant-db.ts), which requires a tenant id.
--
-- No automations, no cross-board connections — just board > group > item,
-- user-defined columns per board, and a per-item notes thread (Monday's
-- "Updates" pane equivalent).
--
-- Idempotent: every statement is IF NOT EXISTS / safe to re-run. No
-- destructive ops. GATED — author only, do not apply without Jeff's explicit
-- go per THE PROCEDURE in platform/docs/runbooks/migration-runbook.md.

-- ─── PRE (informational — confirm nothing here already exists) ─────────
DO $$
BEGIN
  RAISE NOTICE 'PRE task_boards: boards exists=%, board_groups exists=%, board_columns exists=%, board_items exists=%, board_item_notes exists=%',
    (SELECT to_regclass('public.boards') IS NOT NULL),
    (SELECT to_regclass('public.board_groups') IS NOT NULL),
    (SELECT to_regclass('public.board_columns') IS NOT NULL),
    (SELECT to_regclass('public.board_items') IS NOT NULL),
    (SELECT to_regclass('public.board_item_notes') IS NOT NULL);
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_boards_tenant ON boards(tenant_id);

CREATE TABLE IF NOT EXISTS board_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#579bfc',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_board_groups_board ON board_groups(board_id);
CREATE INDEX IF NOT EXISTS idx_board_groups_tenant ON board_groups(tenant_id);

-- `options` holds the choice list for 'status' columns: [{ label, color }, ...].
-- Unused by other column types.
CREATE TABLE IF NOT EXISTS board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'status', 'person', 'date', 'number', 'checkbox')),
  options JSONB NOT NULL DEFAULT '[]',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_board_columns_board ON board_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_tenant ON board_columns(tenant_id);

-- `values` maps column_id -> cell value (jsonb, shape depends on the column's
-- type). Kept wide on the item row rather than a separate values table —
-- this is a spreadsheet, not a normalized entity store, and it avoids an N+1
-- join to render a board.
CREATE TABLE IF NOT EXISTS board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES board_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  values JSONB NOT NULL DEFAULT '{}',
  position INT NOT NULL DEFAULT 0,
  assigned_to UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_board_items_board ON board_items(board_id);
CREATE INDEX IF NOT EXISTS idx_board_items_group ON board_items(group_id);
CREATE INDEX IF NOT EXISTS idx_board_items_tenant ON board_items(tenant_id);

-- Per-item notes thread — Monday's "Updates" pane equivalent. Modeled on
-- connect_messages (migrations/connect-chat.sql). `kind` distinguishes a
-- manually-written note from an auto-logged activity entry (item created,
-- a column value changed) — same feed, rendered differently, so completions
-- and other changes are visible without anyone having to write them up.
CREATE TABLE IF NOT EXISTS board_item_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'activity')),
  author_type TEXT NOT NULL CHECK (author_type IN ('owner', 'team', 'admin')),
  author_id TEXT,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_board_item_notes_item ON board_item_notes(item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_board_item_notes_tenant ON board_item_notes(tenant_id);

CREATE OR REPLACE FUNCTION boards_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_boards_updated_at ON boards;
CREATE TRIGGER trg_boards_updated_at BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION boards_updated_at();

CREATE OR REPLACE FUNCTION board_items_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_board_items_updated_at ON board_items;
CREATE TRIGGER trg_board_items_updated_at BEFORE UPDATE ON board_items
  FOR EACH ROW EXECUTE FUNCTION board_items_updated_at();

-- RLS enabled, no policies — matches tenant_site_content/geo_nearby_places_cache:
-- default-deny for anon/authenticated, reachable only via supabaseAdmin
-- (service_role, bypasses RLS) through tenantDb() for tenant rows or direct
-- admin routes for platform rows (tenant_id IS NULL).
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_item_notes ENABLE ROW LEVEL SECURITY;

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF to_regclass('public.boards') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: boards table missing';
  END IF;
  IF to_regclass('public.board_groups') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: board_groups table missing';
  END IF;
  IF to_regclass('public.board_columns') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: board_columns table missing';
  END IF;
  IF to_regclass('public.board_items') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: board_items table missing';
  END IF;
  IF to_regclass('public.board_item_notes') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: board_item_notes table missing';
  END IF;
  RAISE NOTICE 'task_boards POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
--   DROP TABLE IF EXISTS board_item_notes;
--   DROP TABLE IF EXISTS board_items;
--   DROP TABLE IF EXISTS board_columns;
--   DROP TABLE IF EXISTS board_groups;
--   DROP TABLE IF EXISTS boards;
