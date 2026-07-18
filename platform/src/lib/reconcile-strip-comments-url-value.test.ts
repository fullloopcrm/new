import { describe, it, expect } from 'vitest'
import { parseNextConfigRedirects, parseNextConfigSiteRewriteSources, parseBespokeSet } from '../../scripts/reconcile-tenant-config.mjs'

// Fresh-ground bug (W3 lane: reconcile gate + CI wiring), continuing item
// (174)-(175)'s surface: the shared stripComments() helper (used by every
// parseX function in reconcile-tenant-config.mjs) line-comment-strips with a
// bare `/\/\/.*$/gm`. That regex cannot tell a `//` comment-start apart from
// a `//` INSIDE a quoted value — and (174)-(175)'s own closing comment
// baked in the same unchecked assumption this test disproves: "every value
// these parsers extract is a bare slug, path, or hostname... none
// legitimately contain `//`". That holds for parseBespokeSet/
// parseProtectedSlugs/etc., but NOT for parseNextConfigRedirects /
// parseNextConfigSiteRewriteSources / parseAllNextConfigSiteRewriteSources:
// next.config.ts `destination` values are ordinary Next.js redirect/rewrite
// targets, and a redirect TO a third-party site (`destination:
// 'https://partner.com/x'`) is a completely standard shape — no different
// in kind from '/site/careers' or '/portal'.
//
// A bare line-comment strip run on
// `{ source: '/old', destination: 'https://partner.com/x' },` truncates the
// LINE at the `//` inside `https://`, deleting everything after it on that
// line. Mutation-verified live (not just reasoned about — the actual
// corruption differs from the naive prediction): the entry does not cleanly
// vanish. entryRe's destination capture (`[^'"`]+`) is not end-of-line
// anchored, so with the closing quote gone it keeps matching PAST the
// newline and swallows the start of the NEXT array entry as part of the
// same destination value — merging two real entries into one garbled one,
// rather than dropping one cleanly. Either way, the affected entry's real
// source/destination pair is lost. A lost source also vanishes from
// findShadowedKilledRoutePages' redirectSources set (Drift AD): a killed
// route legitimately rescued by that redirect would be wrongly reported as
// permanently unreachable, a false positive produced by the gate's OWN
// parser rather than a real config bug.
//
// Fixed by making the line-comment branch quote-aware: match a full quoted
// string OR a `//...` comment in the same pass, and only erase the comment
// branch — so `//` inside an already-open quoted value is consumed as part
// of the string match and never reaches the comment branch at all.
//
// Mutation-verified live: reverted stripComments to the pre-fix bare
// `/\/\/.*$/gm`, ran this file — the redirects assertion failed with the
// destination value showing the merged garbage described above, and the
// rewrite-sources assertion failed the same way. Reapplied the fix, reran —
// all 3 green. Restored from a saved pre-mutation backup, confirmed `git
// diff --stat scripts/reconcile-tenant-config.mjs` showed only the intended
// fix before and after the round-trip.

describe('reconcile-gate stripComments does not corrupt a quoted value containing //', () => {
  it('parseNextConfigRedirects: a redirect to a full external URL destination is still parsed', () => {
    const src = `
      async redirects() {
        return [
          { source: '/old-partner-page', destination: 'https://partner-site.com/new-page', permanent: true },
          { source: '/another', destination: '/site/foo', permanent: true },
        ]
      }
    `
    const redirects = parseNextConfigRedirects(src)
    expect(redirects).toEqual([
      { source: '/old-partner-page', destination: 'https://partner-site.com/new-page' },
      { source: '/another', destination: '/site/foo' },
    ])
  })

  it('parseNextConfigSiteRewriteSources: an afterFiles entry with a full-URL destination on an unrelated line does not corrupt sibling entries', () => {
    // The URL-bearing entry itself is filtered out by parseNextConfigSiteRewriteSources'
    // own bare-one-segment source test (its destination shape is irrelevant to that
    // filter) — this guards that a stripComments bug on ITS line does not also eat
    // the sibling bare-segment entry that should be parsed.
    const src = `
      afterFiles: [
        { source: '/site/partner-redirect', destination: 'https://partner-site.com/x' },
        { source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' },
      ]
      fallback:
    `
    const rewrites = parseNextConfigSiteRewriteSources(src)
    expect(rewrites).toContainEqual({ source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' })
    expect(rewrites.some((r) => r.source === '/site/partner-redirect')).toBe(true)
  })

  it('real // line comments are still stripped when a preceding value on the same line is quoted', () => {
    const src = `
      const BESPOKE_SITE_TENANTS = new Set<string>([
        'nycmaid', // keep
        'nyc-tow', // dropped below in a real edit, not here
      ])
    `
    const set = parseBespokeSet(src)
    expect(set.has('nycmaid')).toBe(true)
    expect(set.has('nyc-tow')).toBe(true)
    expect(set.size).toBe(2)
  })
})

// Fresh-ground bug (item 234, W3 lane), sibling to the // fix above and
// continuing the SAME item (233)'s surface: stripComments()'s block-comment
// branch (`/\/\*[\s\S]*?\*\//g`) used to run as a SEPARATE, quote-BLIND pass
// over the raw block text BEFORE the quote-aware line-comment pass ever saw
// it — item (233)'s own closing note called this branch "untouched." A
// destination value containing a literal `/*` (an ordinary wildcard-shaped
// path segment, no different in kind from the `//`-bearing external-URL
// case above) was treated as a block-comment START regardless of being
// inside a quote, and the non-greedy `[\s\S]*?\*\/` matched forward to the
// NEXT literal `*/` ANYWHERE later in the block — including a genuine block
// comment on a LATER, unrelated array entry — silently deleting every real
// entry in between. Mutation-verified live: reverted stripComments to the
// pre-fix two-pass version (block-comment strip first, quote-aware
// line-comment strip second), ran this file — the redirects assertion
// failed with the first entry's destination truncated at the quoted `/*`
// and the second entry deleted outright. Reapplied the fix (folding both
// comment forms into the SAME quoted-string-first alternation), reran — all
// 2 green. Restored from a saved pre-mutation backup, confirmed `git diff
// --stat scripts/reconcile-tenant-config.mjs` showed only the intended fix
// before and after the round-trip.
describe('reconcile-gate stripComments does not corrupt a quoted value containing /*', () => {
  it('parseNextConfigRedirects: a destination containing a literal /* does not bleed into a later real block comment', () => {
    const src = `
      async redirects() {
        return [
          { source: '/old-wildcard-page', destination: '/site/bar/*baz', permanent: true },
          { source: '/another', destination: '/site/foo', permanent: true }, /* trailing real comment */
          { source: '/third', destination: '/site/third', permanent: true },
        ]
      }
    `
    const redirects = parseNextConfigRedirects(src)
    expect(redirects).toEqual([
      { source: '/old-wildcard-page', destination: '/site/bar/*baz' },
      { source: '/another', destination: '/site/foo' },
      { source: '/third', destination: '/site/third' },
    ])
  })

  it('real /* */ block comments are still stripped when a preceding value on an earlier line is quoted', () => {
    const src = `
      const BESPOKE_SITE_TENANTS = new Set<string>([
        'nycmaid',
        /* 'nyc-tow', // dropped during a merge, not here */
        'nyc-tow-real',
      ])
    `
    const set = parseBespokeSet(src)
    expect(set.has('nycmaid')).toBe(true)
    expect(set.has('nyc-tow')).toBe(false)
    expect(set.has('nyc-tow-real')).toBe(true)
    expect(set.size).toBe(2)
  })
})
