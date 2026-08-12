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
import sanitizeHtmlLib from 'sanitize-html'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'blockquote', 'hr',
  'ul', 'ol', 'li',
  'a', 'span',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'data-type', 'data-id', 'data-label', 'class']

// Was isomorphic-dompurify (jsdom-based) -- swapped 2026-08-12. jsdom's own
// transitive dependency (html-encoding-sniffer -> @exodus/bytes, a pure-ESM
// package) can't be require()'d once jsdom is externalized via
// serverExternalPackages (see next.config.ts) on this Node runtime, which
// 500'd every single request that ever touched note HTML -- the Task
// Board's page load AND its notes API both crashed on every hit. This
// package is pure JS, CJS-native, no DOM emulation, no jsdom in the tree at
// all for this file's purpose -- same allowlist-based sanitization, none of
// the module-resolution fragility.
export function sanitizeNoteHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { '*': ALLOWED_ATTR },
    allowedSchemes: ['http', 'https', 'mailto'],
  }).trim()
}

/** Plain-text length of sanitized HTML, used to tell "empty" from "has content" without re-parsing on every caller. */
export function htmlTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').trim().length
}
