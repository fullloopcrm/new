'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { boardsFetch } from './boardsFetch'

type Board = { id: string; name: string; position: number }

interface BoardsSidebarProps {
  apiBase: string
  boardHrefBase: string
}

export default function BoardsSidebar({ apiBase, boardHrefBase }: BoardsSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [boards, setBoards] = useState<Board[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    boardsFetch<{ boards: Board[] }>(apiBase).then((r) => {
      if (r.ok) { setBoards(r.data.boards || []); setErr('') } else { setBoards([]); setErr(r.error) }
    })
  }, [apiBase])

  useEffect(load, [load])

  async function createBoard() {
    const name = newName.trim() || 'New Board'
    setErr('')
    const result = await boardsFetch<{ board: Board }>(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!result.ok) {
      setErr(result.error)
      return
    }
    setNewName('')
    setCreating(false)
    load()
    router.push(`${boardHrefBase}/${result.data.board.id}`)
  }

  return (
    <div className="w-56 shrink-0 border-r border-slate-200 bg-white h-full flex flex-col">
      <div className="p-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase px-1">Task Board</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {boards === null && <p className="px-3 py-2 text-xs text-slate-400">Loading…</p>}
        {err && <p className="px-3 py-2 text-xs text-red-600">{err}</p>}
        {boards?.length === 0 && !err && !creating && <p className="px-3 py-2 text-xs text-slate-400">No boards yet.</p>}
        {boards?.map((b) => {
          const href = `${boardHrefBase}/${b.id}`
          const active = pathname === href
          return (
            <Link
              key={b.id}
              href={href}
              className={`block px-3 py-1.5 text-sm truncate rounded mx-1 ${
                active ? 'bg-teal-50 text-teal-800 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {b.name}
            </Link>
          )
        })}
      </div>

      <div className="p-2 border-t border-slate-100">
        {creating ? (
          <div className="space-y-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createBoard()}
              placeholder="Board name"
              className="w-full text-sm border border-slate-300 rounded px-2 py-1"
            />
            <div className="flex gap-2">
              <button onClick={createBoard} className="text-xs font-medium text-teal-700">Create</button>
              <button onClick={() => { setCreating(false); setNewName('') }} className="text-xs text-slate-400">Cancel</button>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full text-left px-2 py-1.5 text-sm text-slate-500 hover:text-teal-700 hover:bg-slate-50 rounded"
          >
            + New board
          </button>
        )}
      </div>
    </div>
  )
}
