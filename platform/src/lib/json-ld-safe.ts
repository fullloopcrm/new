/**
 * Serialize a JSON-LD object for a `<script type="application/ld+json">` tag
 * rendered via `dangerouslySetInnerHTML`.
 *
 * `JSON.stringify` does NOT escape `<`, so any string field containing the
 * literal substring `</script>` (a headline, review body, forum post, blog
 * comment — anything sourced from user input) closes the script element
 * early. The HTML parser does this regardless of the script's `type`
 * attribute, so `application/ld+json` is not itself a mitigation. Whatever
 * markup follows in the JSON then renders/executes as live HTML — stored XSS
 * for every visitor of the page, not just the submitter.
 *
 * Escaping every angle bracket to its `<` JSON unicode-escape keeps the
 * parsed value identical (JSON decodes the escape back to the original
 * character) while making it inert to the HTML tokenizer, since the literal
 * byte in the script body is no longer an angle bracket.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
