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
 *
 * No external sanitizer library (2026-08-12) -- isomorphic-dompurify
 * (jsdom-based) 500'd every request on ERR_REQUIRE_ESM once jsdom was
 * externalized in next.config.ts; the `sanitize-html` npm package swapped
 * in to fix that ALSO 500'd every request in Vercel's actual runtime
 * despite working fine in an isolated local Node test -- almost certainly
 * the same class of bundling/module-resolution fragility, just in a
 * different dependency, not proven further under active-outage time
 * pressure. This is a small, dependency-free, allowlist-only tag/attribute
 * stripper: no DOM parsing, no npm package, nothing that can fail to
 * bundle. It is NOT a general-purpose HTML sanitizer -- it is safe *for
 * this specific narrow allowlist* because it strips every tag and
 * attribute outside it, and escapes all raw text content, so there is no
 * tag soup for an attacker to hide a script/event-handler payload in.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'blockquote', 'hr',
  'ul', 'ol', 'li',
  'a', 'span',
])

const ALLOWED_ATTR = new Set(['href', 'target', 'rel', 'data-type', 'data-id', 'data-label', 'class'])
const SELF_CLOSING = new Set(['br', 'hr'])

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function sanitizeAttrValue(v: string): string {
  // Attribute values here are only ever class names, data-ids/labels, or
  // href/target/rel — quote-breaking out of the attribute is the only real
  // risk for this allowlist (no event handlers or style are ever allowed
  // through), so escaping the quote character is sufficient.
  return v.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isSafeHref(v: string): boolean {
  const trimmed = v.trim().toLowerCase()
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:')
}

// Matches one open tag, close tag, or self-closing tag at a time — this is a
// tokenizer over a small, known tag vocabulary, not a general HTML parser.
// Attribute values may be quoted OR bare (<img src=x onerror=alert(1)>) --
// both forms must be recognized as "a tag" so a disallowed one (like img,
// not in ALLOWED_TAGS) gets stripped outright rather than falling through
// to the plain-text branch, which would merely escape-and-display it.
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z][a-zA-Z0-9-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?)*)\s*\/?>/g
const ATTR_RE = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g

function sanitizeTagAttrs(tagName: string, attrString: string): string {
  const kept: string[] = []
  let m: RegExpExecArray | null
  ATTR_RE.lastIndex = 0
  while ((m = ATTR_RE.exec(attrString)) !== null) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? m[3] ?? m[4] ?? ''
    if (!ALLOWED_ATTR.has(name)) continue
    if (name === 'href' && !isSafeHref(value)) continue
    kept.push(`${name}="${sanitizeAttrValue(value)}"`)
  }
  return kept.length > 0 ? ' ' + kept.join(' ') : ''
}

// Content of these tags is never meant to be displayed text at all (unlike
// e.g. a stripped <div>foo</div>, where "foo" should still show) -- drop
// tag AND content together.
const OPAQUE_CONTENT_TAGS = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi

export function sanitizeNoteHtml(html: string): string {
  html = html.replace(OPAQUE_CONTENT_TAGS, '')
  let out = ''
  let lastIndex = 0
  TAG_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TAG_RE.exec(html)) !== null) {
    out += escapeText(html.slice(lastIndex, match.index))
    lastIndex = TAG_RE.lastIndex

    const raw = match[0]
    const tagName = match[1].toLowerCase()
    const isClosing = raw.startsWith('</')
    if (!ALLOWED_TAGS.has(tagName)) continue // strip disallowed tag entirely, keep going

    if (isClosing) {
      if (!SELF_CLOSING.has(tagName)) out += `</${tagName}>`
      continue
    }
    const attrs = sanitizeTagAttrs(tagName, match[2] || '')
    out += SELF_CLOSING.has(tagName) ? `<${tagName}${attrs} />` : `<${tagName}${attrs}>`
  }
  out += escapeText(html.slice(lastIndex))
  return out.trim()
}

/** Plain-text length of sanitized HTML, used to tell "empty" from "has content" without re-parsing on every caller. */
export function htmlTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').trim().length
}
