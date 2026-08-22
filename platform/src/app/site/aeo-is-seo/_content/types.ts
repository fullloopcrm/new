export type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'note'; side: 'left' | 'right'; label: string; text: string }

export interface GlossaryTerm {
  term: string
  definition: string
}

export interface ResourceLink {
  name: string
  url: string
  description: string
}

export interface ResourceCategory {
  category: string
  intro: string
  items: ResourceLink[]
}
