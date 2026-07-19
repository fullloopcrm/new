import { escapeHtml } from '@/lib/escape-html'

/**
 * Render the assistant's markdown-lite (**bold** + newlines) to HTML for
 * dangerouslySetInnerHTML. HTML is escaped FIRST, so reflected content — e.g. a
 * client name or message the AI echoes verbatim — cannot inject tags or event
 * handlers (`<img src=x onerror=...>`) into the owner's dashboard. The bold and
 * <br /> tags are added after escaping and are the only markup in the output.
 */
export function renderAssistantMarkdown(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
}
