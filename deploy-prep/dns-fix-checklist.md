# DNS FIX CHECKLIST — repoint two dead domains to Vercel

**For Jeff.** Reference: `JEFF-MORNING-QUEUE.md` **Q1 + Q2** — the two domains
currently serving nothing because their DNS is broken at the SiteGround layer.

> **Docs only.** This file takes **no DNS action**. It is written by an autonomous
> worker (file-only lane) with **read-only** `dig`/`whois`/`curl` probes only.
> Every registrar/DNS change below is done **by Jeff in the GoDaddy + Vercel
> dashboards** — a script cannot make these changes and must not.

---

## TL;DR

Both domains are registered at **GoDaddy** but their nameservers still point at
**SiteGround** (`NS1/NS2.SITEGROUND.NET`), and SiteGround is no longer serving
those zones. Result: the whole domain fails to resolve (SERVFAIL), so there is no
A record for anything to `curl`. **Same root cause, same fix for both.** The fix
is done at the **registrar (GoDaddy)** + **Vercel**, not at SiteGround.

| Domain | Registrar | Delegated NS | Live status (2026-07-11) |
|---|---|---|---|
| `fladumpsterrentals.com` | GoDaddy | `NS1/NS2.SITEGROUND.NET` | Nameservers **unreachable** — query times out; SERVFAIL via 8.8.8.8. No A record. |
| `tolltrucksnearme.com` | GoDaddy | `NS1/NS2.SITEGROUND.NET` | **SERVFAIL** via 8.8.8.8 — SiteGround zone **cancelled**. No A record. |

> **Domain-name note (verify before touching anything).** Q2 called this
> "toll-trucks-near-me". The **hyphenated** forms do **not** exist —
> `toll-trucks-near-me.com` and `toll-trucks-near-me.net` both return **NXDOMAIN**
> (no such domain). The domain that actually exists and is broken is the
> **un-hyphenated** `tolltrucksnearme.com`. If Jeff also owns a hyphenated one at a
> different registrar, this checklist does not cover it — tell me and I'll add it.

---

## 1. CURRENT STATE — exactly what the probes showed

All probes below are read-only and were run from this worktree on 2026-07-11.

### 1a. `fladumpsterrentals.com`

```
whois fladumpsterrentals.com
  Registrar: GoDaddy.com, LLC
  Registrar WHOIS Server: whois.godaddy.com
  Name Server: NS1.SITEGROUND.NET
  Name Server: NS2.SITEGROUND.NET

dig NS fladumpsterrentals.com          -> ;; connection timed out; no servers could be reached
dig @8.8.8.8 fladumpsterrentals.com    -> status: SERVFAIL, ANSWER: 0
dig @8.8.8.8 A fladumpsterrentals.com  -> <no answer>
curl https://fladumpsterrentals.com    -> curl (28) Resolving timed out  (HTTP 000)
```

**Reading:** GoDaddy still delegates the domain to the two SiteGround nameservers,
but those nameservers **do not answer at all** (timeout), so recursive resolvers
return SERVFAIL. Nothing about the site is reachable because DNS never gets far
enough to hand out an IP.

### 1b. `tolltrucksnearme.com`

```
whois tolltrucksnearme.com
  Registrar: GoDaddy.com, LLC
  Name Server: NS1.SITEGROUND.NET
  Name Server: NS2.SITEGROUND.NET

dig @8.8.8.8 tolltrucksnearme.com      -> status: SERVFAIL, ANSWER: 0
dig @8.8.8.8 A tolltrucksnearme.com    -> <no answer>

# hyphenated variants for contrast:
dig @8.8.8.8 toll-trucks-near-me.com   -> status: NXDOMAIN  (domain does not exist)
dig @8.8.8.8 toll-trucks-near-me.net   -> status: NXDOMAIN  (domain does not exist)
```

**Reading:** Same delegation to SiteGround. Here the failure mode is the
**cancelled zone** — the nameservers are (or were) reachable but no longer hold a
zone for this domain, so they answer SERVFAIL/REFUSED. Same net effect: no A
record, site dead.

> Both domains fail at the **nameserver delegation** step. That is why nothing you
> do at the SiteGround control panel will help — SiteGround is out of the picture.
> The authority lives at **GoDaddy** (which nameservers the domain points to).

---

## 2. THE FIX — repoint each domain to Vercel

You have **two** ways to do this. Pick **one per domain** (they can differ per
domain, but keeping them consistent is simpler). **Method A is recommended** for
these two because the zones are dead — letting Vercel own the whole zone is the
cleanest reset.

### ⚠️ Source of truth for the exact values

The specific IP / hostnames below are **Vercel's documented public defaults.** They
are stable but Vercel is the authority: when you **Add Domain** in the Vercel
project, Vercel shows the **exact** records/nameservers **for that domain** on the
Domains page. **Use whatever the Vercel dashboard shows** — if it differs from the
values here, the dashboard wins. (I could not pull them live: the Vercel MCP
connector isn't authorized in this session, so I'm giving the documented defaults
and flagging them for you to confirm on-screen. — honest-9.)

Documented Vercel defaults (confirm in dashboard):
- **Nameservers:** `ns1.vercel-dns.com`, `ns2.vercel-dns.com`
- **Apex A record:** `76.76.21.21`
- **`www` CNAME:** `cname.vercel-dns.com`

---

### METHOD A — hand the whole zone to Vercel (change nameservers at GoDaddy) ✅ recommended

1. In **Vercel** → the project that should serve this domain → **Settings →
   Domains → Add** → enter the domain (e.g. `fladumpsterrentals.com`). Add both the
   apex and `www` if you want both to work.
2. Vercel will tell you it's **using Vercel's nameservers** and show the two
   `nsX.vercel-dns.com` values. Copy the exact ones it shows.
3. In **GoDaddy** → **My Products → Domains → [domain] → Nameservers → Change** →
   choose **"I'll use my own nameservers" / Custom** → **remove**
   `NS1.SITEGROUND.NET` and `NS2.SITEGROUND.NET` → **add** the two
   `nsX.vercel-dns.com` nameservers from step 2 → **Save**.
4. Wait for propagation (see §3). Vercel then serves the zone and auto-provisions
   the TLS cert once it sees the nameservers pointing at it.

Do this for **both** `fladumpsterrentals.com` and `tolltrucksnearme.com`.

---

### METHOD B — keep DNS at GoDaddy, just add records (only if you want GoDaddy to keep hosting DNS)

Use this only if you have a reason to keep the zone at GoDaddy (e.g. other records
like email/MX you want to manage there). It's more steps and you own cert renewal
prompts.

1. In **GoDaddy** → **Nameservers** → switch off the SiteGround nameservers by
   selecting **GoDaddy's default/parked nameservers** (this makes GoDaddy the DNS
   host again). Save, and wait for that to take effect first.
2. In **GoDaddy → DNS management** for the domain:
   - **A** record: host `@` → value `76.76.21.21` (or the apex IP the Vercel
     dashboard shows), TTL 600.
   - **CNAME** record: host `www` → value `cname.vercel-dns.com`, TTL 600.
   - Remove any stale A/CNAME left over from SiteGround.
3. In **Vercel** → project → **Settings → Domains → Add** the domain. Vercel
   verifies via the A/CNAME above and issues the cert.

---

## 3. POST-FIX VERIFY — prove it before calling it done

DNS changes propagate on the old TTL; nameserver changes can take **30 min – 48 h**
(usually well under an hour for a fresh delegation). Do **not** trust the browser
cache — verify with `dig` against a public resolver, then `curl`.

Run these for **each** domain after the change. Replace `DOMAIN` accordingly.

### 3a. Delegation moved off SiteGround (Method A)

```bash
dig @8.8.8.8 NS DOMAIN +short
# EXPECT: ns1.vercel-dns.com  /  ns2.vercel-dns.com
# (NOT ns1/ns2.siteground.net, and NOT empty/SERVFAIL)
```

### 3b. Zone resolves and points at Vercel

```bash
dig @8.8.8.8 DOMAIN +short
# EXPECT: an A record (e.g. 76.76.21.21) — NOT SERVFAIL, NOT empty

dig @8.8.8.8 www.DOMAIN +short
# EXPECT: cname.vercel-dns.com -> an A record (Method A/B), NOT empty
```

Sanity on status line (should read `NOERROR`, not `SERVFAIL`/`NXDOMAIN`):

```bash
dig @8.8.8.8 DOMAIN | grep -i "status:"
# EXPECT: status: NOERROR
```

### 3c. Site actually serves 200 over HTTPS

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://DOMAIN
# EXPECT: 200  (301/308 to www or to https is also fine — follow it:)

curl -sSL -o /dev/null -w "%{http_code}\n" https://DOMAIN
# EXPECT: 200 after redirects

curl -sSI https://DOMAIN | grep -i "server:"
# EXPECT: server: Vercel   (confirms it's actually Vercel answering)
```

### 3d. TLS cert is valid (not the SiteGround/expired one)

```bash
echo | openssl s_client -servername DOMAIN -connect DOMAIN:443 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
# EXPECT: issuer Let's Encrypt (Vercel-provisioned), subject matches DOMAIN,
#         notAfter in the future.
```

**Done = all of 3a–3d pass for both domains.** Until `curl` returns 200 with
`server: Vercel`, the domain is NOT fixed — a green `dig` alone only proves DNS,
not that the site serves.

---

## 4. GOTCHAS / notes

- **Two domains, do them one at a time** and verify each fully before starting the
  next — so if one misbehaves you know which registrar change caused it.
- **Method A wipes the old zone entirely.** If either domain had **MX/email** or
  other records living on SiteGround, those die when you move nameservers to
  Vercel. These two zones appear dead already (SERVFAIL), so there's likely nothing
  to preserve — but if email was ever configured on them, recreate MX in Vercel DNS
  (or use Method B). Confirm with Jeff before moving if email matters.
- **Vercel project mapping:** make sure each domain is added to the **correct**
  Vercel project (the one whose build should serve that brand). Adding it to the
  wrong project will serve the wrong site once DNS resolves.
- **Propagation impatience:** if `dig @8.8.8.8` still shows SiteGround after an
  hour, re-check the GoDaddy nameserver screen actually saved (GoDaddy sometimes
  silently keeps custom NS if the form validation hiccups).
- **Registrar lock:** if GoDaddy won't let you change nameservers, check the domain
  isn't in a `clientUpdateProhibited` / registrar-lock state on the domain settings
  page.

---

## 5. What I did NOT do (scope)

- **No DNS changes.** Every probe above was read-only (`dig`, `whois`, `curl`).
- **Did not log into GoDaddy or Vercel** — those dashboards are Jeff's to touch.
- **Did not confirm the Vercel record values live** — Vercel MCP isn't authorized
  in this session; §2 flags the documented defaults for on-screen confirmation.
- **Did not assume which Vercel project** each domain belongs to — Jeff picks that.
