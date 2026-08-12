export type BoardColumnType = 'text' | 'status' | 'person' | 'date' | 'number' | 'checkbox'

export type BoardGroup = {
  id: string
  board_id: string
  name: string
  color: string
  position: number
}

export type BoardColumn = {
  id: string
  board_id: string
  name: string
  type: BoardColumnType
  options: { label: string; color: string }[]
  position: number
}

export type BoardItem = {
  id: string
  board_id: string
  group_id: string
  name: string
  values: Record<string, unknown>
  position: number
  assigned_to: string | null
  note_count?: number
}

export type TeamMember = { id: string; name: string }

export type BoardAttachment = {
  name: string
  url: string
  size: number
  content_type: string
}

export type BoardItemNote = {
  id: string
  item_id: string
  kind: 'note' | 'activity'
  author_type: 'owner' | 'team' | 'admin'
  author_name: string
  body: string
  attachments: BoardAttachment[]
  created_at: string
}
