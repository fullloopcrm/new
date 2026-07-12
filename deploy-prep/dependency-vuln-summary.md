# Dependency Vulnerability Summary — `npm audit` triage (exploitable vs dev-only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Triage of `npm audit` for `platform/` — separating advisories that are **reachable in the
deployed production runtime** from those that only affect **dev/build/test tooling**, so the deploy decision is
about the ~handful that matter, not a scary raw count. **Nothing was installed, upgraded, or changed.**

---

## TL;DR

- **Raw: 31 advisories** — 3 critical, 14 high, 11 moderate, 3 low — across **862 packages** (403 prod, 314 dev,
  187 optional) as npm counts them.
- **The 3 "critical" are not production-runtime criticals.** The critical `vitest` advisory is the **test runner**
  (arbitrary file read/exec *only when the Vitest UI server is listening* — dev/CI, never shipped). The two critical
  `@clerk/*` advisories have **zero `@clerk` imports in `src`** — not reachable in this app's runtime.
- **The advisories that actually reach the deployed runtime are a smaller set** (§2): `next`, `next-intl`,
  the **email path** (`mailparser`→`linkify-it`, `imapflow`, `nodemailer`+`form-data`, `resend`→`svix`), and
  `axios`→`form-data` *if* the Plaid SDK is exercised.
- **Almost everything has a non-breaking fix.** `npm audit fix` resolves the bulk. Two need judgment: the
  `next@16.2.10` bump (minor, test it) and the `@telnyx/webrtc@1.0.9` "fix" which is a **major *downgrade*** from the
  installed `2.26.4` — do **not** blindly apply.
- **One real hygiene finding:** `vitest` is declared under **`dependencies`**, not `devDependencies`, in
  `package.json`. That is why the test runner shows up in the production tree at all. Move it (§4).

> **Two honesty caveats about the dev/prod split.**
> 1. `npm audit --omit=dev` is an imperfect proxy: because `vitest` is mis-slotted in `dependencies`, it (and its
>    deps like `vite`, `esbuild`) appear "in the prod tree." They are still test-only in reality.
> 2. **"In the prod dependency tree" ≠ "reachable in the deployed bundle."** Next.js only bundles code actually
>    imported by server routes. A vulnerable package present in `node_modules` but never `import`ed by app code
>    (e.g. `@clerk/*` here) does not ship. Reachability below is judged by `grep`-ing `src` for real imports and by
>    tracing the dependency parent, not by the audit's tree label alone.

---

## 1. Raw counts

| Severity | Full tree | `--omit=dev` tree |
|---|:---:|:---:|
| Critical | 3 | 1 (`vitest`, mis-slotted) |
| High | 14 | 10 |
| Moderate | 11 | 9 |
| Low | 3 | 3 |
| **Total** | **31** | **23** |

Command: `npm audit` / `npm audit --omit=dev` (2026-07-12, `platform/`).

---

## 2. Production-runtime-reachable (the ones that matter)

Reachability = an actual `import` in `src`, or a traced parent that runs server-side in production.

| Package | Sev | Reaches prod via | Advisory (short) | Fix |
|---|:---:|---|---|---|
| **`next`** | HIGH | direct dep (`16.1.6`) | HTTP request smuggling in rewrites; `next/image` cache disk-exhaustion DoS; postponed-resume buffering DoS | `next@16.2.10` (minor — **test before ship**; also clears transitive `postcss` XSS) |
| **`next-intl`** | MOD | direct dep | open redirect; prototype pollution via `experimental.messages.precompile` catalog keys | `npm audit fix` (non-breaking) |
| **`mailparser`** | HIGH | direct dep (IMAP ingest) | pulls vulnerable `linkify-it` | `npm audit fix` |
| **`linkify-it`** | HIGH | `mailparser` (email parse) | quadratic-complexity ReDoS in `match` scan loop | via `mailparser` fix |
| **`imapflow`** | MOD | direct dep (IMAP) | (advisory on the client) | `npm audit fix` |
| **`nodemailer`** | HIGH | `imapflow`/`mailparser` + `site/the-nyc-marketing-company/api/contact` | CRLF header injection (List-* + `jsonTransport` file/url bypass); improper TLS cert validation in OAuth2 token fetch | `npm audit fix` |
| **`form-data`** | HIGH | `axios` (see below) | CRLF injection via unescaped multipart field/file names | via `axios` fix |
| **`axios`** | HIGH | `plaid` SDK (**only if Plaid is used at runtime**) | prototype-pollution gadgets (credential injection / request hijack); cookie-name ReDoS | `npm audit fix` |
| **`resend`** | MOD | direct dep (email send) | (advisory on the client) | `npm audit fix` |
| **`svix`** | MOD | `resend` (webhook verify) | (advisory on the client) | via `resend` fix |
| **`ip-address`** | MOD | transitive | XSS in `Address6` HTML-emitting methods (only if those methods render untrusted input) | `npm audit fix` |
| **`icu-minify`** | LOW | `next-intl` precompile | DoS via unsanitized `select` key on `Object.prototype` when `precompile:true` | via `next-intl` fix |
| **`@telnyx/webrtc`** + `@peermetrics/webrtc-stats` + `uuid` | MOD | direct dep — **browser/client WebRTC** | `uuid` missing buffer-bounds check (v3/v5/v6) | fix = `@telnyx/webrtc@1.0.9` = **MAJOR DOWNGRADE** from `2.26.4` — **do not auto-apply; evaluate separately** |

**Priority within this set:** `next` (request smuggling — HTTP boundary) > the email path (`nodemailer`/`mailparser`/
`linkify-it` — reachable by inbound/outbound mail content) > `next-intl` (open redirect) > the rest. `axios` only
matters if the Plaid integration is live; confirm before prioritizing.

---

## 3. Dev / build / test tooling only (not in the deployed runtime)

Present in `node_modules` for local dev, tests, or the build — **not** in the serverless bundle. Exploiting these
requires access to a developer's machine, the dev server, or CI, not a production request.

| Package | Sev | Why it's not prod-reachable |
|---|:---:|---|
| **`vitest`** | CRITICAL | Test runner. "Arbitrary file read/exec" fires **only when the Vitest UI server is listening** — a local/CI action, never deployed. (Also mis-slotted in `dependencies` — §4.) |
| **`vite`** | HIGH | Dev server (path traversal, `server.fs.deny` bypass, dev-server WS file read) — dev-time only. Pulled by `vitest`. |
| **`esbuild`** | LOW | Dev server arbitrary file read (Windows) — dev-time only. |
| **`@babel/core`** | LOW | Build-time source-map file read. |
| **`undici`** | HIGH | The vulnerable *package* instance is pulled by **`jsdom`** (the Vitest DOM environment) — test-only. (Node's built-in fetch/undici is patched via the Node runtime, a separate track.) |
| **`picomatch`** | HIGH | Pulled by `vite`, `@parcel/watcher`, `micromatch`, `tinyglobby` — build/glob tooling. |
| **`postcss`** | MOD | Build-time CSS stringify XSS; cleared by the `next` bump anyway. |
| **`@clerk/nextjs` / `@clerk/backend` / `@clerk/shared` / `@clerk/clerk-react`** | CRITICAL/HIGH | **0 `@clerk` imports in `src`** — not on this app's runtime path. npm's `--omit=dev` also classifies them dev-side. (If a Clerk auth path is ever activated in code, re-triage — the "middleware route-protection bypass" would then be prod-critical.) |
| **`flatted`** | HIGH | Test-reporter serialization (via `vitest`). |
| **`js-cookie`** | HIGH | Transitive dev tooling. |
| **`js-yaml`** | MOD | Build/tooling config parse. |
| **`brace-expansion`** | MOD | Glob/tooling. |

---

## 4. Recommended actions (docs only — leader/Jeff decide; nothing applied)

1. **Run `npm audit fix`** (non-`--force`). Clears the majority — the email path (`mailparser`/`linkify-it`/
   `nodemailer`), `next-intl`, `axios`/`form-data`, `resend`/`svix`, `ip-address` — with no breaking changes.
   Re-run `npm audit` after and diff the remaining set.
2. **Evaluate `next@16.2.10`** on its own. It is the fix for the request-smuggling HIGH and the transitive `postcss`
   XSS. Minor version, but Next bumps can move build/runtime behavior — smoke the app + the CSP nonce plumbing note
   (see `csp-rollout-report-only-plan.md` R5) before shipping.
3. **Do NOT auto-apply the `@telnyx/webrtc` fix.** npm suggests `1.0.9`, a **major downgrade** from the installed
   `2.26.4` — that would revert the WebRTC client, not patch it forward. The vuln is a client-side `uuid` bounds
   check (MODERATE, browser). Assess whether the newer 2.x line has a forward fix, or accept the moderate risk.
4. **Move `vitest` to `devDependencies`** in `package.json`. It is currently under `dependencies`, which is why the
   test runner (and its `vite`/`esbuild` deps) pollute the production tree and the audit. This is a one-line
   `package.json` edit + `npm install` — a clean, non-behavioral hygiene fix (out of scope to apply here; flagged).
5. **Re-triage `@clerk/*` only if Clerk is wired into code.** Today it is not imported in `src`; if that changes,
   the critical middleware-bypass advisory becomes production-relevant and jumps to the top of this list.

---

## Appendix — method & commands

```
npm audit                    # full tree: 31 (3 crit / 14 high / 11 mod / 3 low)
npm audit --omit=dev         # prod tree: 23 (1 crit / 10 high / 9 mod / 3 low)
# reachability checks (src imports + dependency parents):
grep -rl '@clerk' src                       # -> 0  (not runtime-reachable)
grep -rl "from 'axios'" src                 # -> 0  (axios only via plaid SDK)
node -e "…package-lock parents…"            # axios<-plaid, nodemailer<-imapflow/mailparser,
                                            # form-data<-axios, undici<-jsdom, picomatch<-vite, svix<-resend
node -e "require('./package.json').dependencies.vitest"  # present -> mis-slotted finding (§4)
```

**Honesty note:** severities are npm's. "Reachable in prod" is my judgment from `grep`-ing `src` for imports and
tracing dependency parents in `package-lock.json`; it is **not** a runtime exploit proof — a package can be imported
yet the specific vulnerable code path never hit (e.g. `ip-address` HTML methods, `axios` only if Plaid runs). When in
doubt I classified toward *reachable* (§2) rather than dismiss. Counts are a snapshot for 2026-07-12; re-run before
the deploy since the advisory DB and lockfile drift. Nothing here was installed, upgraded, or otherwise applied.
</content>
