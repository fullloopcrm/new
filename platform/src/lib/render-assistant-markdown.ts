import { escapeHtml } from './escape-html'

// The AI assistant reply is rendered via dangerouslySetInnerHTML in the operator
// dashboard. Assistant output can echo customer-supplied text, so escape it FIRST
// (killing <script>/<img onerror>), THEN apply the tiny **bold** + newline
// transforms. Order matters: escaping runs before we inject the intended <strong>
// and <br /> tags, so only these two tags are ever real HTML.
export function renderAssistantMarkdown(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
}
