import { ReactRenderer } from '@tiptap/react'
import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import MentionList, { type MentionListRef } from './MentionList'

type MentionListRendererProps = { items: MentionItem[]; command: (item: MentionItem) => void }

// Shaped as { id, label } (not { id, name }) to match @tiptap/extension-mention's
// MentionNodeAttrs exactly — its default suggestion `command` reads `props.id`
// and `props.label` straight off the selected item to build the node, so
// matching that shape here avoids needing a custom command override.
export type MentionItem = { id: string; label: string }

// Team roster rarely changes mid-session; a short cache avoids refetching on
// every keystroke of an @mention query.
let cachedTeamMembers: MentionItem[] | null = null
let cachedAt = 0
const CACHE_MS = 30_000

async function fetchTeamMembers(): Promise<MentionItem[]> {
  const now = Date.now()
  if (cachedTeamMembers && now - cachedAt < CACHE_MS) return cachedTeamMembers
  const res = await fetch('/api/boards/team-mentions')
  if (!res.ok) return []
  const data: Array<{ id: string; name: string }> = await res.json().catch(() => [])
  cachedTeamMembers = Array.isArray(data) ? data.map((m) => ({ id: m.id, label: m.name })) : []
  cachedAt = now
  return cachedTeamMembers
}

export const mentionSuggestion: Pick<SuggestionOptions<MentionItem>, 'items' | 'render'> = {
  items: async ({ query }) => {
    const members = await fetchTeamMembers()
    const q = query.toLowerCase()
    return members.filter((m) => m.label.toLowerCase().includes(q)).slice(0, 8)
  },

  render: () => {
    let component: ReactRenderer<MentionListRef, MentionListRendererProps>
    let unmount: (() => void) | undefined

    return {
      onStart: (props: SuggestionProps<MentionItem>) => {
        component = new ReactRenderer(MentionList, {
          props: { items: props.items, command: props.command },
          editor: props.editor,
        })
        unmount = props.mount(component.element as HTMLElement)
      },
      onUpdate(props: SuggestionProps<MentionItem>) {
        component.updateProps({ items: props.items, command: props.command })
      },
      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === 'Escape') {
          unmount?.()
          return true
        }
        return component.ref?.onKeyDown(props) ?? false
      },
      onExit() {
        unmount?.()
        component.destroy()
      },
    }
  },
}
