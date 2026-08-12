'use client'

import { useEffect, useState, useCallback } from 'react'
import BoardCell from './BoardCell'
import BoardItemDrawer from './BoardItemDrawer'
import { boardsFetch } from './boardsFetch'
import type { BoardColumn, BoardColumnType, BoardGroup, BoardItem } from './types'

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

export default function BoardBody({ apiBase, boardId, richUpdates = true }: BoardBodyProps) {
  const [data, setData] = useState<BoardData | null>(null)
  const [openItemId, setOpenItemId] = useState<string | null>(null)
  const [addingItemForGroup, setAddingItemForGroup] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [err, setErr] = useState('')
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [search, setSearch] = useState('')
  const [dragItem, setDragItem] = useState<{ id: string; fromStatus: string } | null>(null)
  const [dragColumnId, setDragColumnId] = useState<string | null>(null)

  const load = useCallback(() => {
    boardsFetch<BoardData>(`${apiBase}/${boardId}`).then((r) => {
      if (r.ok) { setData(r.data); setErr('') } else setErr(r.error)
    })
  }, [apiBase, boardId])

  useEffect(load, [load])

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

  if (!data) return <div className="p-8 text-slate-400 text-sm">{err || 'Loading…'}</div>

  const { board, groups, columns, items } = data
  const openItem = openItemId ? items.find((i) => i.id === openItemId) || null : null
  const kanbanColumn = columns.find((c) => c.type === 'status') || null
  const q = search.trim().toLowerCase()
  const visibleItems = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items

  async function onKanbanDrop(itemId: string, toStatus: string | null) {
    if (!kanbanColumn) return
    await updateItem(itemId, { values: { [kanbanColumn.id]: toStatus } })
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
        <div style={{ minWidth: 480 + columns.length * 150 }}>
          {groups.map((group) => {
            const groupItems = visibleItems.filter((i) => i.group_id === group.id).sort((a, b) => a.position - b.position)
            return (
              <div key={group.id} className="mb-7">
                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="text-[15px] font-bold tracking-tight" style={{ color: group.color }}>{group.name}</h3>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{groupItems.length}</span>
                </div>

                <div className="flex rounded-lg overflow-hidden shadow-sm ring-1 ring-slate-200">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: group.color }} />
                  <div className="flex-1 bg-white">
                    <div className="flex bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                      <div className="px-3 py-2.5 flex-1 min-w-[220px]">Task Name</div>
                      {columns.map((col) => (
                        <div
                          key={col.id}
                          draggable
                          onDragStart={() => setDragColumnId(col.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); if (dragColumnId) reorderColumn(dragColumnId, col.id); setDragColumnId(null) }}
                          onDragEnd={() => setDragColumnId(null)}
                          className={`px-3 py-2.5 w-[150px] shrink-0 border-l border-slate-200/70 flex items-center gap-1 cursor-move select-none ${dragColumnId === col.id ? 'opacity-40' : ''}`}
                          title="Drag to reorder"
                        >
                          <span className="opacity-40">⠿</span>
                          <span className="opacity-60">{COLUMN_TYPE_ICONS[col.type]}</span> {col.name}
                        </div>
                      ))}
                      <div className="w-[64px] shrink-0" />
                    </div>

                    {groupItems.map((item) => (
                      <div key={item.id} className="flex border-b border-slate-100 last:border-b-0 hover:bg-teal-50/40 transition-colors group">
                        <button
                          onClick={() => setOpenItemId(item.id)}
                          className="px-3 py-2.5 flex-1 min-w-[220px] text-left text-sm text-slate-800 truncate font-medium group-hover:text-teal-800"
                        >
                          {item.name || 'Untitled'}
                        </button>
                        {columns.map((col) => (
                          <div key={col.id} className="px-1.5 py-1.5 w-[150px] shrink-0 border-l border-slate-100 flex items-center">
                            <BoardCell
                              column={col}
                              value={item.values?.[col.id]}
                              onChange={(v) => updateItem(item.id, { values: { [col.id]: v } })}
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
                        <span className="text-sm leading-none">+</span> Add item
                      </button>
                    )}
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
          richUpdates={richUpdates}
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
