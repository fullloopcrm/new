// Best-effort hex for a Printify variant color name, for rendering a small
// swatch dot next to the color label. Printify's catalog API doesn't expose
// hex codes at the blueprint/variant level (only their own shop-product
// endpoint does, per-product), so this is a keyword map over the color name
// text rather than real per-variant color data — approximate, not exact.
const KEYWORD_HEX: [RegExp, string][] = [
  [/black/i, '#111111'],
  [/white/i, '#f5f5f0'],
  [/natural|bone|ecru|sand|khaki/i, '#e8dcc4'],
  [/charcoal/i, '#36393b'],
  [/grey|gray/i, '#8a8d8f'],
  [/navy/i, '#1b2a4a'],
  [/royal|cobalt/i, '#2547d0'],
  [/teal/i, '#0f7a75'],
  [/purple|violet|orchid|eggplant|aubergine/i, '#6b3fa0'],
  [/red|cardinal|crimson|cherry/i, '#c0271f'],
  [/maroon/i, '#7a1f2b'],
  [/gold|mustard|yellow/i, '#d9a520'],
  [/olive/i, '#6b6b2a'],
  [/army|military green|forest/i, '#4b5320'],
  [/kelly|green/i, '#3a8a3e'],
  [/mint/i, '#9fe0c8'],
  [/sage/i, '#9caf88'],
  [/brown|chocolate|espresso|coffee|camel/i, '#5b3a29'],
  [/clay|terracotta|rust/i, '#b5573a'],
  [/pink|blush/i, '#e8b4c8'],
  [/lavender|lilac/i, '#c3b1e1'],
  [/powder|baby blue/i, '#bcd4e6'],
  [/peach/i, '#f3b88a'],
  [/stone|taupe/i, '#a89f91'],
]

export function swatchHex(colorName: string): string {
  for (const [pattern, hex] of KEYWORD_HEX) {
    if (pattern.test(colorName)) return hex
  }
  return '#9a9a9a'
}
