// Renders a JSON-LD structured-data block. Data is app-controlled (never user
// input); we still escape "<" so a stray value can't break out of the script.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
