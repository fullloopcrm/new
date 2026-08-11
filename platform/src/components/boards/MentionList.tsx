'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'
import type { SuggestionKeyDownProps } from '@tiptap/suggestion'
import type { MentionItem } from './mentionSuggestion'

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface MentionListProps {
  items: MentionItem[]
  command: (item: MentionItem) => void
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0)
  // Reset the highlighted row whenever a new items array arrives (every
  // keystroke of the query) — adjusted during render per React's guidance
  // for "state that resets when a prop changes", rather than in a
  // useEffect, which would cause an extra cascading render.
  const [prevItems, setPrevItems] = useState(items)
  if (items !== prevItems) {
    setPrevItems(items)
    setSelected(0)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelected((prev) => (prev + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected((prev) => (prev + 1) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        const item = items[selected]
        if (item) command(item)
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs text-slate-400">
        No matches
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto min-w-[160px]">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(item)}
          className={`w-full text-left px-3 py-1.5 text-sm ${
            i === selected ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
})
MentionList.displayName = 'MentionList'

export default MentionList
