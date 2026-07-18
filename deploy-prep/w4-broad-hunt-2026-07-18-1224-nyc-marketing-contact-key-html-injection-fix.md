# W4 broad hunt — 12:24 — `the-nyc-marketing-company` contact route: unescaped object-key HTML injection (LEADER 3-deep queue item 2, fresh ground)

## What was wrong

`src/app/site/the-nyc-marketing-company/api/contact/route.ts` is a fully
public, unauthenticated lead-capture endpoint — every form on
`thenycmarketingcompany.com` posts here, and it builds a notification email
(sent via Resend to the site owner's real inbox) from `data`, which is the
raw, attacker-controlled JSON request body (or multipart `data` field —
either way, every field **name** is caller-chosen, not just the values).

`buildEmailHtml()` iterated `Object.entries(data)` and rendered each row:

```ts
`<tr>
  <td ...>${key.replace(/([A-Z])/g, " $1")}</td>
  <td ...>${escapeHtml(String(value || "—"))}</td>
</tr>`
```

The **value** was correctly passed through `escapeHtml()`. The **key** was
not — only a cosmetic regex that inserts a space before capital letters, no
HTML escaping. Since JSON object keys are entirely attacker-chosen, a
request like:

```json
{"type":"exit-intent-audit","email":"a@b.com","<img src=x onerror=alert(1)>":"x"}
```

lands the raw `<img src=x onerror=...>` unescaped inside a `<td>` of the
HTML email delivered to the business owner's inbox — HTML/attribute
injection into a trusted-looking internal lead notification (severity
depends on the recipient mail client's HTML sanitization, but at minimum
arbitrary link/phishing-content injection; some clients execute `onerror`
handlers on rendered `<img>` tags).

This route was reviewed once before
(`deploy-prep/w4-broad-hunt-2026-07-16-0800-nyc-marketing-contact-rate-limit-fix.md`),
but that pass covered rate-limiting and the `replyTo` header only, and
explicitly checked that **values** were escaped — it didn't notice the
key/value asymmetry. Matches the same bug class already fixed elsewhere in
this sweep (`w4-broad-hunt-2026-07-17-1958-campaign-send-client-name-html-injection-fix.md`),
just on a different, previously-unaudited surface.

## Fix

Escape the key the same way the value is escaped:

```ts
${escapeHtml(key.replace(/([A-Z])/g, " $1"))}
```

One-line change in `buildEmailHtml()`. Added
`route.key-escape.test.ts`, which posts a malicious object key and asserts
the raw key never appears in the HTML handed to Resend, and the escaped
form (`&lt;img src=x onerror=alert(1)&gt;`) does.

## Verification

- `npx tsc --noEmit --pretty false` (platform/): 0 errors.
- `npx vitest run src/app/site/the-nyc-marketing-company/api/contact/route.rate-limit.test.ts src/app/site/the-nyc-marketing-company/api/contact/route.key-escape.test.ts` — 3/3 pass (existing rate-limit test unaffected, new escaping test passes).

File-only. No push/deploy/DB.
