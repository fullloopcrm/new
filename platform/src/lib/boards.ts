// Shared Task Board types/helpers — used by both the tenant-scoped
// (/api/boards/*) and platform-level (/api/admin/boards/*) route handlers so
// the two surfaces stay in sync without duplicating validation.

export type BoardColumnType = 'text' | 'status' | 'person' | 'date' | 'number' | 'checkbox'

export const BOARD_COLUMN_TYPES: BoardColumnType[] = [
  'text', 'status', 'person', 'date', 'number', 'checkbox',
]

export function isBoardColumnType(value: unknown): value is BoardColumnType {
  return typeof value === 'string' && (BOARD_COLUMN_TYPES as string[]).includes(value)
}

export type StatusOption = { label: string; color: string }

// Final spec (2026-08-10): every board's Stage column uses exactly these
// three values — Started / Working / Complete — not a generic status set.
export const STAGE_OPTIONS: StatusOption[] = [
  { label: 'Started', color: '#c4c4c4' },
  { label: 'Working', color: '#fdab3d' },
  { label: 'Complete', color: '#00c875' },
]

export const DEFAULT_STATUS_OPTIONS: StatusOption[] = STAGE_OPTIONS

export const DEFAULT_GROUP_COLOR = '#579bfc'

// Final spec (2026-08-10): every new board gets exactly these three columns
// — Task Name is the item's own name field, not a column. Assignee/Stage/
// Notes are the fixed, standard shape; boards no longer start empty and
// build the concept in via "+ Add column" one at a time.
export type DefaultColumnDef = { name: string; type: BoardColumnType; options: StatusOption[] }
export const DEFAULT_BOARD_COLUMNS: DefaultColumnDef[] = [
  { name: 'Assignee', type: 'person', options: [] },
  { name: 'Stage', type: 'status', options: STAGE_OPTIONS },
  { name: 'Notes', type: 'text', options: [] },
]

// PostgREST's error code when .single() matches zero rows — happens whenever
// an update/select is scoped to an id that doesn't belong to the given
// board (wrong board id in the URL, or a plain typo). Without checking this,
// that case throws a raw Postgres error and surfaces as a 500 instead of a
// clean 404.
export const NO_ROWS_ERROR_CODE = 'PGRST116'

type ColumnMeta = { id: string; name: string; type: BoardColumnType }

function formatBoardValue(value: unknown, type: BoardColumnType): string {
  if (value === null || value === undefined || value === '') return '(empty)'
  if (type === 'checkbox') return value ? 'checked' : 'unchecked'
  if (type === 'date' && typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { timeZone: 'America/New_York' })
  }
  return String(value)
}

// One "{Column} changed to {value}" line per touched column — this is what
// makes a status flip to Done (or any other field edit) show up in the same
// Updates feed as manual notes, without anyone having to write it up.
export function describeValueChanges(
  changedValues: Record<string, unknown>,
  columns: ColumnMeta[],
): string[] {
  const byId = new Map(columns.map((c) => [c.id, c]))
  const lines: string[] = []
  for (const [columnId, value] of Object.entries(changedValues)) {
    const col = byId.get(columnId)
    if (!col) continue
    lines.push(`${col.name} changed to ${formatBoardValue(value, col.type)}`)
  }
  return lines
}

// item.assigned_to is a dedicated column (not part of the generic `values`
// blob describeValueChanges reads), so a reassignment needs its own line —
// same Updates feed as the rest of describeValueChanges' output, just a
// separate entry point since the caller resolves the name (team directory
// lookup) before this is called.
export function describeAssignmentChange(assigneeName: string | null): string {
  return assigneeName ? `Assigned to ${assigneeName}` : 'Unassigned'
}

// Pulls tenant_member ids out of the @mention chips TipTap's Mention
// extension writes into a note body (<span data-type="mention" data-id="...">),
// after sanitizeNoteHtml has already run — data-type/data-id/data-label are
// on that allowlist specifically so this keeps working post-sanitization.
// Dedupes since the same person can be @mentioned more than once in one note.
const MENTION_SPAN_RE = /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>/g

export function extractMentionedMemberIds(sanitizedHtml: string): string[] {
  const ids = new Set<string>()
  let m: RegExpExecArray | null
  MENTION_SPAN_RE.lastIndex = 0
  while ((m = MENTION_SPAN_RE.exec(sanitizedHtml)) !== null) {
    ids.add(m[1])
  }
  return Array.from(ids)
}
