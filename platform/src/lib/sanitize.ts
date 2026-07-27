// Opt-in sanitizer for free-text user input. Callers choose where to apply it —
// it is not wired in globally. Strips HTML tags/markup so injected script tags
// can't reach storage or any downstream renderer as live markup.
export function sanitizeInput(input: string): string {
  const CONTROL_CHARS = new RegExp('[\\x00-\\x1F\\x7F]', 'g')
  return input
    .replace(/<[^>]*>/g, '')
    .replace(CONTROL_CHARS, '')
    .trim()
}
