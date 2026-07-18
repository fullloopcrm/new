/**
 * Validate a value looks like a well-formed CSS color before letting it into
 * raw HTML (a `<style>` block, or a `style="..."` attribute). Tenant brand
 * colors (`primary_color` / `secondary_color`) are attacker-settable via
 * self-serve onboarding/settings APIs with no format enforcement server-side
 * (the `<input type="color">` is client-side only), and get interpolated
 * directly into HTML we send to tenants' own clients/leads. A value like
 * `#fff }</style><script>…</script>` or `red" onmouseover="…` would break out
 * of the style context — HTML-escaping alone isn't enough here since CSS
 * declarations are `;`-delimited, not HTML-metacharacter-delimited, so even a
 * quote-escaped value could still smuggle extra `position:fixed` etc.
 * declarations into the same attribute. Reject anything that isn't a plain
 * hex / named / functional color and fall back to a safe default instead.
 */
const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$|^[a-zA-Z]+$|^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([0-9a-zA-Z%.,/\s+-]+\)$/

export function safeColor(value: string | null | undefined, fallback: string): string {
  const v = (value ?? '').trim()
  return SAFE_COLOR.test(v) ? v : fallback
}
