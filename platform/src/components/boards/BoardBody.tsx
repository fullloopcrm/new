'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import BoardCell from './BoardCell'
import BoardItemDrawer from './BoardItemDrawer'
import { boardsFetch } from './boardsFetch'
import type { BoardColumn, BoardColumnType, BoardGroup, BoardItem, TeamMember } from './types'

interface BoardBodyProps {
  apiBase: string
  boardId: string
  /** See BoardItemDrawer's richUpdates doc — off for platform-level admin boards. */
  richUpdates?: boolean
}

type BoardData = {
  board: { id: string; name: string }
  groups: BoardGroup[]
  columns: BoardColumn[]
  items: BoardItem[]
}

const COLUMN_TYPE_ICONS: Record<BoardColumnType, string> = {
  text: '≡',
  status: '●',
  person: '◔',
  date: '▤',
  number: '#',
  checkbox: '☑',
}

const COLUMN_TYPE_OPTIONS: { value: BoardColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'status', label: 'Status' },
  { value: 'person', label: 'Person' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
]

// The group items funnel into once marked complete — see applyValueChange.
// Matched case-insensitively so a board's own "Completed"/"completed" group
// is reused instead of creating a duplicate.
const COMPLETED_GROUP_NAME = 'Completed'
function isCompletedGroup(group: { name: string }): boolean {
  return group.name.trim().toLowerCase() === COMPLETED_GROUP_NAME.toLowerCase()
}

export default function BoardBody({ apiBase, boardId, richUpdates = true }: BoardBodyProps) {
  const [data, setData] = useState<BoardData | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[] | undefined>(undefined)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [addingItemForGroup, setAddingItemForGroup] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState<BoardColumnType>('text')
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [err, setErr] = useState('')
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [search, setSearch] = useState('')
  const [dragItem, setDragItem] = useState<{ id: string; fromStatus: string } | null>(null)
  const [dragColumnId, setDragColumnId] = useState<string | null>(null)
  const [dragGroupId, setDragGroupId] = useState<string | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const ensuredCompletedGroup = useRef(false)

  const load = useCallback(() => {
    boardsFetch<BoardData>(`${apiBase}/${boardId}`).then((r) => {
      if (r.ok) { setData(r.data); setErr('') } else setErr(r.error)
    })
  }, [apiBase, boardId])

  useEffect(load, [load])

  // Live auto-refresh so a board reflects what teammates are doing on it
  // right now, not just at page load — matches the 15s polling cadence
  // already used for Loop Connect elsewhere in the platform. Skipped while
  // any inline editor/drag is in progress so a background refetch can't
  // clobber an in-flight rename, add, or drag gesture.
  const skipPollRef = useRef(false)
  useEffect(() => {
    skipPollRef.current = Boolean(
      editingGroupId || editingColumnId || addingColumn || addingGroup || addingItemForGroup ||
      dragColumnId || dragGroupId || dragTaskId || dragItem,
    )
  })
  useEffect(() => {
    const interval = setInterval(() => {
      if (!skipPollRef.current) load()
    }, 15000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    ensuredCompletedGroup.current = false
  }, [boardId])

  // Every board gets a "Completed" group (auto-created once, last position)
  // so the completion-driven auto-move in applyValueChange always has
  // somewhere to send a finished item.
  useEffect(() => {
    if (!data || ensuredCompletedGroup.current) return
    ensuredCompletedGroup.current = true
    if (data.groups.some(isCompletedGroup)) return
    boardsFetch(`${apiBase}/${boardId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: COMPLETED_GROUP_NAME }),
    }).then((r) => { if (r.ok) load() })
  }, [data, apiBase, boardId, load])

  useEffect(() => {
    if (!richUpdates) return // platform admin boards have no tenant session / team directory
    boardsFetch<TeamMember[]>('/api/boards/team-mentions').then((r) => {
      if (r.ok) setTeamMembers(r.data)
    })
  }, [richUpdates])

  async function updateItem(itemId: string, body: Record<string, unknown>) {
    setData((prev) => {
      if (!prev) return prev
      return { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, ...body, values: { ...i.values, ...(body.values as object || {}) } } : i)) }
    })
    const r = await boardsFetch(`${apiBase}/${boardId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) { setErr(r.error); load() }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return
    setData((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev))
    if (openItemId === itemId) setOpenItemId(null)
    const r = await boardsFetch(`${apiBase}/${boardId}/items/${itemId}`, { method: 'DELETE' })
    if (!r.ok) { setErr(r.error); load() }
  }

  async function reorderColumn(fromId: string, toId: string) {
    if (fromId === toId || !data) return
    const fromIdx = data.columns.findIndex((c) => c.id === fromId)
    const toIdx = data.columns.findIndex((c) => c.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...data.columns]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setData((prev) => (prev ? { ...prev, columns: reordered } : prev))
    const results = await Promise.all(
      reordered.map((c, i) =>
        boardsFetch(`${apiBase}/${boardId}/columns/${c.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: i }),
        }),
      ),
    )
    if (results.some((r) => !r.ok)) { setErr('Failed to save column order'); load() }
  }

  async function addItem(groupId: string) {
    const name = newItemName.trim() || 'New item'
    const r = await boardsFetch(`${apiBase}/${boardId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, name }),
    })
    if (r.ok) {
      setNewItemName('')
      setAddingItemForGroup(null)
      load()
    } else {
      setErr(r.error)
    }
  }

  async function addGroup() {
    const name = newGroupName.trim() || 'New Group'
    const r = await boardsFetch(`${apiBase}/${boardId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (r.ok) {
      setNewGroupName('')
      setAddingGroup(false)
      load()
    } else {
      setErr(r.error)
    }
  }

  async function renameGroup(groupId: string) {
    const name = editingGroupName.trim()
    setEditingGroupId(null)
    if (!name || !data) return
    const previousName = data.groups.find((g) => g.id === groupId)?.name
    if (name === previousName) return
    setData((prev) => (prev ? { ...prev, groups: prev.groups.map((g) => (g.id === groupId ? { ...g, name } : g)) } : prev))
    const r = await boardsFetch(`${apiBase}/${boardId}/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!r.ok) { setErr(r.error); load() }
  }

  async function deleteGroup(groupId: string, groupName: string) {
    if (!confirm(`Delete group "${groupName}"? This also deletes every item in it. This cannot be undone.`)) return
    setData((prev) => (prev ? { ...prev, groups: prev.groups.filter((g) => g.id !== groupId), items: prev.items.filter((i) => i.group_id !== groupId) } : prev))
    const r = await boardsFetch(`${apiBase}/${boardId}/groups/${groupId}`, { method: 'DELETE' })
    if (!r.ok) { setErr(r.error); load() }
  }

  async function reorderGroup(fromId: string, toId: string) {
    if (fromId === toId || !data) return
    const fromIdx = data.groups.findIndex((g) => g.id === fromId)
    const toIdx = data.groups.findIndex((g) => g.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...data.groups]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setData((prev) => (prev ? { ...prev, groups: reordered } : prev))
    const results = await Promise.all(
      reordered.map((g, i) =>
        boardsFetch(`${apiBase}/${boardId}/groups/${g.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: i }),
        }),
      ),
    )
    if (results.some((r) => !r.ok)) { setErr('Failed to save group order'); load() }
  }

  async function addColumn() {
    const name = newColumnName.trim() || 'New Column'
    const r = await boardsFetch(`${apiBase}/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: newColumnType }),
    })
    if (r.ok) {
      setNewColumnName('')
      setNewColumnType('text')
      setAddingColumn(false)
      load()
    } else {
      setErr(r.error)
    }
  }

  async function renameColumn(columnId: string) {
    const name = editingColumnName.trim()
    setEditingColumnId(null)
    if (!name || !data) return
    const previousName = data.columns.find((c) => c.id === columnId)?.name
    if (name === previousName) return
    setData((prev) => (prev ? { ...prev, columns: prev.columns.map((c) => (c.id === columnId ? { ...c, name } : c)) } : prev))
    const r = await boardsFetch(`${apiBase}/${boardId}/columns/${columnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!r.ok) { setErr(r.error); load() }
  }

  async function deleteColumn(columnId: string, columnName: string) {
    if (!confirm(`Delete column "${columnName}"? This removes its data from every item on this board. This cannot be undone.`)) return
    setData((prev) => (prev ? { ...prev, columns: prev.columns.filter((c) => c.id !== columnId) } : prev))
    const r = await boardsFetch(`${apiBase}/${boardId}/columns/${columnId}`, { method: 'DELETE' })
    if (!r.ok) { setErr(r.error); load() }
  }

  // Reorders an item within a group, or moves it to a different group —
  // backs both manual table-view drag-and-drop and the checkbox auto-move
  // below. Computed from the outer `data` closure (like every other handler
  // in this file), NOT read back out of a setData updater afterward — the
  // updater callback isn't guaranteed to run before the next line executes,
  // so a value assigned inside one and read right after can still be stale.
  async function moveItem(itemId: string, toGroupId: string, beforeItemId: string | null) {
    if (!data || itemId === beforeItemId) return
    const moving = data.items.find((i) => i.id === itemId)
    if (!moving) return
    const others = data.items.filter((i) => i.id !== itemId)
    const targetGroupItems = others.filter((i) => i.group_id === toGroupId).sort((a, b) => a.position - b.position)
    const beforeIdx = beforeItemId ? targetGroupItems.findIndex((i) => i.id === beforeItemId) : -1
    const insertAt = beforeIdx === -1 ? targetGroupItems.length : beforeIdx
    const withMoved = [...targetGroupItems]
    withMoved.splice(insertAt, 0, { ...moving, group_id: toGroupId })
    const repositioned = withMoved.map((it, i) => ({ ...it, position: i }))
    const changed = repositioned.filter((it) => {
      const orig = data.items.find((o) => o.id === it.id)
      return !orig || orig.position !== it.position || orig.group_id !== it.group_id
    })
    if (changed.length === 0) return
    const repositionedIds = new Set(repositioned.map((i) => i.id))
    const untouched = others.filter((i) => !repositionedIds.has(i.id))
    setData((prev) => (prev ? { ...prev, items: [...untouched, ...repositioned] } : prev))
    const results = await Promise.all(
      changed.map((it) =>
        boardsFetch(`${apiBase}/${boardId}/items/${it.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: it.position, group_id: it.group_id }),
        }),
      ),
    )
    if (results.some((r) => !r.ok)) { setErr('Failed to move item'); load() }
  }

  // A checkbox column reads "complete" when checked; a status column (every
  // board's standard "Stage" column ships Started/Working/Complete) reads
  // "complete" when its value is the Complete option. Both are completion
  // signals for the auto-move below.
  function isCompletionValue(column: BoardColumn, value: unknown): boolean {
    if (column.type === 'checkbox') return value === true
    if (column.type === 'status') return typeof value === 'string' && value.trim().toLowerCase() === 'complete'
    return false
  }

  // Setting ANY checkbox or status column to a "complete" value sends the
  // item to the Completed group (remembering the group it came from in
  // values.__prev_group_id); losing every completion signal sends it back.
  // Computed and persisted as one PATCH so the value flip and the move land
  // atomically. Shared by the table-view cell, the Kanban lane drop, and the
  // item drawer's own column editor so the move fires no matter where the
  // value was changed.
  async function applyValueChange(item: BoardItem, column: BoardColumn, value: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!data) return { ok: true }
    const nextValues: Record<string, unknown> = { ...item.values, [column.id]: value }

    // Only a checkbox/status edit can flip completion state. A text/number/
    // date edit must never re-evaluate it — otherwise editing something as
    // unrelated as the Notes field on an item someone manually dragged into
    // Completed (Stage still "Started") would silently bounce it back out.
    if (column.type !== 'checkbox' && column.type !== 'status') {
      setData((prev) => (prev
        ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, values: nextValues } : i)) }
        : prev))
      const r = await boardsFetch(`${apiBase}/${boardId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: nextValues }),
      })
      if (!r.ok) { setErr(r.error); load(); return { ok: false, error: r.error } }
      return { ok: true }
    }

    const completionCols = data.columns.filter((c) => c.type === 'checkbox' || c.type === 'status')
    const anyComplete = completionCols.some((c) => isCompletionValue(c, nextValues[c.id]))
    const completedGroup = data.groups.find(isCompletedGroup)

    let targetGroupId = item.group_id
    if (completedGroup && item.group_id !== completedGroup.id && anyComplete) {
      nextValues.__prev_group_id = item.group_id
      targetGroupId = completedGroup.id
    } else if (completedGroup && item.group_id === completedGroup.id && !anyComplete) {
      const prevGroupId = typeof item.values.__prev_group_id === 'string' ? item.values.__prev_group_id : null
      targetGroupId = (prevGroupId && data.groups.some((g) => g.id === prevGroupId))
        ? prevGroupId
        : (data.groups.find((g) => g.id !== completedGroup.id)?.id || item.group_id)
      nextValues.__prev_group_id = null
    }

    const moved = targetGroupId !== item.group_id
    const newPosition = moved ? data.items.filter((i) => i.group_id === targetGroupId && i.id !== item.id).length : item.position
    const patchBody = moved
      ? { values: nextValues, group_id: targetGroupId, position: newPosition }
      : { values: nextValues }

    setData((prev) => (prev
      ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, values: nextValues, group_id: targetGroupId, position: newPosition } : i)) }
      : prev))

    const r = await boardsFetch(`${apiBase}/${boardId}/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody),
    })
    if (!r.ok) { setErr(r.error); load(); return { ok: false, error: r.error } }
    return { ok: true }
  }

  if (!data) return <div className="p-8 text-slate-400 text-sm">{err || 'Loading…'}</div>

  const { board, groups, columns, items } = data
  const openItem = openItemId ? items.find((i) => i.id === openItemId) || null : null
  const kanbanColumn = columns.find((c) => c.type === 'status') || null
  const q = search.trim().toLowerCase()
  const visibleItems = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items

  async function onKanbanDrop(itemId: string, toStatus: string | null) {
    if (!kanbanColumn) return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    await applyValueChange(item, kanbanColumn, toStatus)
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-md bg-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {(board.name || 'B').charAt(0).toUpperCase()}
        </span>
        <h1 className="font-heading text-2xl font-bold text-slate-900">{board.name}</h1>
      </div>
      <p className="text-xs text-slate-400 mb-4 ml-9">{items.length} item{items.length === 1 ? '' : 's'} · {groups.length} group{groups.length === 1 ? '' : 's'}</p>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="text-sm border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
          <button
            onClick={() => setView('table')}
            className={`px-3 py-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            ▦ Table
          </button>
          <button
            onClick={() => kanbanColumn && setView('kanban')}
            disabled={!kanbanColumn}
            title={kanbanColumn ? undefined : 'Add a Status column to use Kanban view'}
            className={`px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${view === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            ▤ Kanban
          </button>
        </div>
      </div>

      {err && <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {view === 'kanban' && kanbanColumn ? (
        <div className="overflow-x-auto">
          <div className="flex gap-3" style={{ minWidth: (kanbanColumn.options.length || 1) * 220 }}>
            {[...kanbanColumn.options, { label: '(no status)', color: '#c4c4c4' }].map((option) => {
              const cardsInStatus = visibleItems.filter((i) => (i.values?.[kanbanColumn.id] || null) === (option.label === '(no status)' ? null : option.label))
              return (
                <div
                  key={option.label}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (dragItem) onKanbanDrop(dragItem.id, option.label === '(no status)' ? null : option.label); setDragItem(null) }}
                  className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden min-h-[200px] flex flex-col w-[220px] shrink-0"
                >
                  <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded text-white" style={{ backgroundColor: option.color }}>{option.label}</span>
                    <span className="text-xs text-slate-400">{cardsInStatus.length}</span>
                  </div>
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                    {cardsInStatus.map((item) => {
                      const group = groups.find((g) => g.id === item.group_id)
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => setDragItem({ id: item.id, fromStatus: option.label })}
                          onClick={() => setOpenItemId(item.id)}
                          className="group bg-white border border-slate-200 rounded-lg p-2.5 hover:shadow-md hover:border-teal-300 transition-all cursor-move"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm text-slate-900 truncate flex-1">{item.name || 'Untitled'}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity shrink-0"
                              title="Delete item"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {group && <p className="text-[10px]" style={{ color: group.color }}>{group.name}</p>}
                            {(item.note_count || 0) > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H7l-3 3V4z" /></svg>
                                {item.note_count}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {cardsInStatus.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Drop here</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <div style={{ minWidth: 500 + columns.length * 150 }}>
          {groups.map((group, groupIndex) => {
            const groupItems = visibleItems.filter((i) => i.group_id === group.id).sort((a, b) => a.position - b.position)
            return (
              <div
                key={group.id}
                onDragOver={(e) => { if (dragGroupId) e.preventDefault() }}
                onDrop={(e) => { e.preventDefault(); if (dragGroupId) reorderGroup(dragGroupId, group.id); setDragGroupId(null) }}
                className={`mb-7 group/groupheader ${dragGroupId === group.id ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    draggable
                    onDragStart={() => setDragGroupId(group.id)}
                    onDragEnd={() => setDragGroupId(null)}
                    className="opacity-40 hover:opacity-70 cursor-move select-none"
                    title="Drag to reorder"
                  >
                    ⠿
                  </span>
                  {editingGroupId === group.id ? (
                    <input
                      autoFocus
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                      onBlur={() => renameGroup(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameGroup(group.id)
                        if (e.key === 'Escape') setEditingGroupId(null)
                      }}
                      className="text-[15px] font-bold tracking-tight bg-white border border-teal-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      style={{ color: group.color }}
                    />
                  ) : (
                    <h3
                      onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name) }}
                      title="Click to rename"
                      className="text-[15px] font-bold tracking-tight cursor-text rounded px-1.5 py-0.5 -mx-1.5 hover:bg-slate-100"
                      style={{ color: group.color }}
                    >
                      {group.name}
                    </h3>
                  )}
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{groupItems.length}</span>
                  <button
                    onClick={() => deleteGroup(group.id, group.name)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover/groupheader:opacity-100 transition-opacity"
                    title="Delete group"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="flex rounded-lg overflow-hidden shadow-sm ring-1 ring-slate-200">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: group.color }} />
                  <div className="flex-1 bg-white">
                    <div className="flex bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <div className="px-3 py-2.5 flex-1 min-w-[220px]">Task Name</div>
                      {columns.map((col) => (
                        <div
                          key={col.id}
                          onDragOver={(e) => { if (dragColumnId) e.preventDefault() }}
                          onDrop={(e) => { e.preventDefault(); if (dragColumnId) reorderColumn(dragColumnId, col.id); setDragColumnId(null) }}
                          className={`group/colheader px-2 py-2.5 w-[150px] shrink-0 border-l border-slate-200/70 flex items-center gap-1 select-none ${dragColumnId === col.id ? 'opacity-40' : ''}`}
                        >
                          <span
                            draggable
                            onDragStart={() => setDragColumnId(col.id)}
                            onDragEnd={() => setDragColumnId(null)}
                            className="opacity-40 hover:opacity-70 cursor-move shrink-0"
                            title="Drag to reorder"
                          >
                            ⠿
                          </span>
                          <span className="opacity-60 shrink-0">{COLUMN_TYPE_ICONS[col.type]}</span>
                          {/* Column headers repeat per group (one section per group), but a
                              column is board-wide — rename/delete only render in the first
                              group's copy, or every group's copy would mount its own
                              autoFocus input for the same column and steal focus from each
                              other. Later groups show a plain (non-interactive) label. */}
                          {groupIndex === 0 && editingColumnId === col.id ? (
                            <input
                              autoFocus
                              value={editingColumnName}
                              onChange={(e) => setEditingColumnName(e.target.value)}
                              onBlur={() => renameColumn(col.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') renameColumn(col.id)
                                if (e.key === 'Escape') setEditingColumnId(null)
                              }}
                              className="min-w-0 flex-1 text-[11px] font-semibold normal-case bg-white border border-teal-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                            />
                          ) : groupIndex === 0 ? (
                            <span
                              onClick={() => { setEditingColumnId(col.id); setEditingColumnName(col.name) }}
                              title="Click to rename"
                              className="truncate flex-1 cursor-text"
                            >
                              {col.name}
                            </span>
                          ) : (
                            <span className="truncate flex-1">{col.name}</span>
                          )}
                          {groupIndex === 0 && (
                            <button
                              onClick={() => deleteColumn(col.id, col.name)}
                              className="opacity-0 group-hover/colheader:opacity-100 text-slate-300 hover:text-red-500 transition-opacity shrink-0"
                              title="Delete column"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {/* Column headers repeat per group (one section per group), but
                          columns are board-wide — the add-column control only needs to
                          exist once, on the first group's header, or it'd open the same
                          shared form under every group at once. */}
                      {groupIndex === 0 && (addingColumn ? (
                        <div className="w-[210px] shrink-0 border-l border-slate-200/70 px-2 py-1.5 flex items-center gap-1 normal-case font-normal">
                          <input
                            autoFocus
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                            placeholder="Column name"
                            className="min-w-0 flex-1 text-xs border border-slate-300 rounded px-1.5 py-1"
                          />
                          <select
                            value={newColumnType}
                            onChange={(e) => setNewColumnType(e.target.value as BoardColumnType)}
                            className="text-xs border border-slate-300 rounded px-1 py-1"
                          >
                            {COLUMN_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <button onClick={addColumn} className="text-teal-700 shrink-0" title="Add column">✓</button>
                          <button onClick={() => setAddingColumn(false)} className="text-slate-400 shrink-0" title="Cancel">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingColumn(true)}
                          className="w-[64px] shrink-0 border-l border-slate-200/70 flex items-center justify-center text-slate-300 hover:text-teal-700 hover:bg-slate-50 normal-case font-normal"
                          title="Add column"
                        >
                          <span className="text-base leading-none">+</span>
                        </button>
                      ))}
                      <div className="w-[64px] shrink-0" />
                    </div>

                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        onDragOver={(e) => { if (dragTaskId) e.preventDefault() }}
                        onDrop={(e) => { e.preventDefault(); if (dragTaskId) moveItem(dragTaskId, group.id, item.id); setDragTaskId(null) }}
                        className={`flex border-b border-slate-100 last:border-b-0 hover:bg-teal-50/40 transition-colors group ${dragTaskId === item.id ? 'opacity-40' : ''}`}
                      >
                        <span
                          draggable
                          onDragStart={() => setDragTaskId(item.id)}
                          onDragEnd={() => setDragTaskId(null)}
                          className="pl-2 flex items-center text-slate-300 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-move select-none"
                          title="Drag to reorder or move to another group"
                        >
                          ⠿
                        </span>
                        <button
                          onClick={() => setOpenItemId(item.id)}
                          className="px-2 py-2.5 flex-1 min-w-[220px] text-left text-sm text-slate-800 truncate font-medium group-hover:text-teal-800"
                        >
                          {item.name || 'Untitled'}
                        </button>
                        {columns.map((col) => (
                          <div key={col.id} className="px-1.5 py-1.5 w-[150px] shrink-0 border-l border-slate-100 flex items-center">
                            <BoardCell
                              column={col}
                              value={col.type === 'person' && teamMembers ? item.assigned_to : item.values?.[col.id]}
                              onChange={(v) => {
                                if (col.type === 'person' && teamMembers) return updateItem(item.id, { assigned_to: v })
                                return applyValueChange(item, col, v)
                              }}
                              teamMembers={teamMembers}
                            />
                          </div>
                        ))}
                        <div className="w-[64px] shrink-0 flex items-center justify-end gap-2 pr-2">
                          <button
                            onClick={() => setOpenItemId(item.id)}
                            className={`flex items-center gap-0.5 text-xs ${(item.note_count || 0) > 0 ? 'text-teal-600 font-medium' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                            title="Updates"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H7l-3 3V4z" /></svg>
                            {(item.note_count || 0) > 0 && item.note_count}
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete item"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}

                    <div
                      onDragOver={(e) => { if (dragTaskId) e.preventDefault() }}
                      onDrop={(e) => { e.preventDefault(); if (dragTaskId) moveItem(dragTaskId, group.id, null); setDragTaskId(null) }}
                    >
                    {addingItemForGroup === group.id ? (
                      <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100">
                        <input
                          autoFocus
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addItem(group.id)}
                          placeholder="Item name"
                          className="flex-1 text-sm border border-slate-300 rounded px-2 py-1"
                        />
                        <button onClick={() => addItem(group.id)} className="text-xs font-semibold text-teal-700">Add</button>
                        <button onClick={() => setAddingItemForGroup(null)} className="text-xs text-slate-400">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingItemForGroup(group.id)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-teal-700 hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        <span className="text-sm leading-none">+</span> Add item{groupItems.length === 0 && dragTaskId ? ' (drop here)' : ''}
                      </button>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex items-center gap-3 mb-4">
            {addingGroup ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGroup()}
                  placeholder="Group name"
                  className="text-sm border border-slate-300 rounded px-2 py-1"
                />
                <button onClick={addGroup} className="text-xs font-medium text-teal-700">Add</button>
                <button onClick={() => setAddingGroup(false)} className="text-xs text-slate-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingGroup(true)} className="text-sm font-medium text-slate-500 hover:text-teal-700 flex items-center gap-1.5 border border-dashed border-slate-300 hover:border-teal-400 rounded-lg px-3 py-1.5">
                + Add group
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {openItem && (
        <BoardItemDrawer
          key={openItem.id}
          apiBase={apiBase}
          boardId={boardId}
          item={openItem}
          columns={columns}
          teamMembers={teamMembers}
          richUpdates={richUpdates}
          onValueChange={applyValueChange}
          onClose={() => setOpenItemId(null)}
          onItemChange={(updated) => {
            setData((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === updated.id ? updated : i)) } : prev))
          }}
          onDelete={() => deleteItem(openItem.id)}
        />
      )}
    </div>
  )
}
