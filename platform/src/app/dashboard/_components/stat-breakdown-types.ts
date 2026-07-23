// Shared shape for Loop dashboard drill-down modals — server pages build the
// breakdown data (already-fetched rows, no extra round-trip), client grid
// components render it on click. Reusable across any stat grid, not just
// the home dashboard.

export interface BreakdownRow {
  id: string
  primary: string
  secondary?: string
  amountCents?: number
  date?: string
  status?: string
}

export interface BreakdownGroup {
  title: string
  rows: BreakdownRow[]
  emptyLabel?: string
}

export interface StatCell {
  key: string
  label: string
  value: string
  sub?: string
  emphasize?: boolean
  bg?: string
  valueColor?: string
}
