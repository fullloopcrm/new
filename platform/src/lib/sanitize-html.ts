/**
 * Shared HTML sanitizer for Task Board item "Updates" note bodies. The
 * composer (UpdateComposer) is a TipTap editor, but the API boundary can't
 * trust that — a caller could POST arbitrary HTML directly to
 * /api/boards/[id]/items/[itemId]/notes bypassing the editor entirely, so
 * the server sanitizes on write. The same allowlist is used again on
 * render (UpdateItem) as defense in depth against a stored note written
 * before a tighter allowlist shipped.
 *
 * Allowlist matches exactly what the composer's TipTap extensions can
 * produce — nothing else should ever legitimately appear in a note body.
 */
import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'blockquote', 'hr',
  'ul', 'ol', 'li',
  'a', 'span',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'data-type', 'data-id', 'data-label', 'class']

export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  }).trim()
}

/** Plain-text length of sanitized HTML, used to tell "empty" from "has content" without re-parsing on every caller. */
export function htmlTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').trim().length
}
