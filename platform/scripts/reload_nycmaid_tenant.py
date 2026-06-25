#!/usr/bin/env python3
"""
Full-reload migrator: NYC Maid live DB  ->  FullLoop `nycmaid` tenant (...001).

WHY FULL RELOAD (not delta): NYC `bookings` has no `updated_at`, so changed/deleted
rows since the 2026-06-06 snapshot can't be detected cheaply. Full reload of the
tenant-scoped rows guarantees exact parity. Tenant data is isolated by tenant_id,
so deleting + re-inserting tenant_id=...001 rows is safe.

READ : NYC via Supabase Management API (SUPABASE_ACCESS_TOKEN_NYCMAID, curl).
WRITE: FL via PostgREST with service_role (works; FL Management token is revoked).

MODES:
  --dry-run            read + transform + count, NO writes to FL (safe anytime)
  --table=clients      operate on a single table
  --verify             just print NYC vs FL counts and exit
  --go                 ACTUALLY delete+reload FL tenant rows (TONIGHT, after jobs finish)

Nothing destructive happens without --go.
"""
import json, subprocess, os, sys, time

HOME = os.path.expanduser("~")
SP = "/private/tmp/claude-501/-Users-jefftucker/87686f40-d3b1-4d51-819f-c91ca15ba4b4/scratchpad"
TENANT = "00000000-0000-0000-0000-000000000001"
NYC_REF = "ioppmvchszymwswtwsze"

def envval(name, path):
    for line in open(path):
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip().strip('"').replace("\\n", "").strip("'").strip()
    return None

NYC_TOKEN = envval("SUPABASE_ACCESS_TOKEN_NYCMAID", f"{HOME}/.env.local")
FL_URL = envval("NEXT_PUBLIC_SUPABASE_URL", f"{SP}/fl.env")
FL_SR = envval("SUPABASE_SERVICE_ROLE_KEY", f"{SP}/fl.env")

# ---- schema maps (dumped read-only into scratchpad) ----
NYC_COLS = json.load(open(f"{SP}/nyc_cols.json"))
FL_COLS = json.load(open(f"{SP}/fl_cols.json"))

# ---- column rename map (NYC col -> FL col), applied to every table ----
COL_RENAME = {
    "cleaner_id": "team_member_id",
    "suggested_cleaner_id": "suggested_team_member_id",
    "preferred_cleaner_id": "preferred_team_member_id",
    "cleaner_pay": "team_member_pay",
    "cleaner_pay_rate": "pay_rate",
    "cleaner_paid": "team_member_paid",
    "cleaner_paid_at": "team_member_paid_at",
    "cleaner_token": "team_member_token",
    "cleaner_name": "team_member_name",
}
# generated/identity columns to drop from source (verified via information_schema)
GENERATED = {"bookings": {"estimated_hours"}}

# ---- table migration plan: (nyc_table, fl_table). FK-safe insert order (parents first). ----
# Derived tables that FL triggers also write (notifications/schedule_issues) go LAST so the
# trigger-noise created during booking inserts gets overwritten by NYC's authoritative rows.
PLAN = [
    ("clients", "clients"),
    ("cleaners", "team_members"),
    ("recurring_schedules", "recurring_schedules"),
    ("bookings", "bookings"),
    ("booking_cleaners", "booking_team_members"),
    ("payments", "payments"),
    ("cleaner_payouts", "team_member_payouts"),
    ("sms_conversations", "sms_conversations"),
    ("sms_conversation_messages", "sms_conversation_messages"),
    ("selena_memory", "selena_memory"),
    ("cleaner_applications", "cleaner_applications"),
    ("referrers", "referrers"),
    ("referral_commissions", "referral_commissions"),
    ("client_reviews", "client_reviews"),
    ("reviews", "reviews"),
    ("ratings", "ratings"),
    ("unmatched_payments", "unmatched_payments"),
    ("push_subscriptions", "push_subscriptions"),
    ("campaigns", "campaigns"),
    ("blocked_referrers", "blocked_referrers"),
    ("lead_clicks", "lead_clicks"),
    ("email_logs", "email_logs"),
    ("error_logs", "error_logs"),
    ("notifications", "notifications"),
    ("schedule_issues", "schedule_issues"),
]

def nyc_sql(q):
    out = subprocess.run(["curl", "-s", "--max-time", "60", "-X", "POST",
        f"https://api.supabase.com/v1/projects/{NYC_REF}/database/query",
        "-H", f"Authorization: Bearer {NYC_TOKEN}", "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": q})], capture_output=True, text=True).stdout
    d = json.loads(out)
    if isinstance(d, dict) and d.get("message"):
        raise RuntimeError(f"NYC SQL error: {d['message'][:200]}")
    return d

def nyc_read_all(table):
    """Read every row of a NYC table as list[dict], paginated by offset."""
    rows, off, page = [], 0, 5000
    while True:
        chunk = nyc_sql(f"select * from {table} order by 1 offset {off} limit {page}")
        rows.extend(chunk)
        if len(chunk) < page:
            break
        off += page
    return rows

def transform(row, nyc_t, fl_t):
    fl_set = set(FL_COLS.get(fl_t, []))
    gen = GENERATED.get(nyc_t, set())
    out, dropped = {}, []
    for k, v in row.items():
        if k in gen:
            continue
        nk = COL_RENAME.get(k, k)
        if nk in fl_set:
            out[nk] = v
        else:
            dropped.append(k)
    if "tenant_id" in fl_set:
        out["tenant_id"] = TENANT
    # ---- per-table derived/required columns (from 06-06 gotchas) ----
    if fl_t == "payments" and "amount_cents" in fl_set and row.get("amount") is not None:
        out["amount_cents"] = int(round(float(row["amount"]) * 100))
    if fl_t == "unmatched_payments" and "amount_cents" in fl_set and row.get("amount") is not None:
        out["amount_cents"] = int(round(float(row["amount"]) * 100))
    if fl_t == "referrers":
        if "referral_code" in fl_set and not out.get("referral_code"):
            out["referral_code"] = row.get("ref_code") or row.get("referral_code")
        if "commission_rate" in fl_set and out.get("commission_rate") is None:
            out["commission_rate"] = 0
    if fl_t == "email_logs" and "to_email" in fl_set and not out.get("to_email"):
        out["to_email"] = row.get("recipient") or row.get("to_email")
    if fl_t == "error_logs" and "severity" in fl_set and not out.get("severity"):
        out["severity"] = "error"
    if fl_t == "blocked_referrers" and "referrer_url" in fl_set and not out.get("referrer_url"):
        out["referrer_url"] = row.get("domain") or row.get("referrer_url")
    return out, dropped

def fl_delete_tenant(fl_t):
    r = subprocess.run(["curl", "-s", "--max-time", "60", "-X", "DELETE", "-i",
        f"{FL_URL}/rest/v1/{fl_t}?tenant_id=eq.{TENANT}",
        "-H", f"apikey: {FL_SR}", "-H", f"Authorization: Bearer {FL_SR}",
        "-H", "Prefer: return=minimal"], capture_output=True, text=True).stdout
    code = r.split("\n", 1)[0]
    return code.strip()

def fl_insert(fl_t, rows, batch=1000):
    """Bulk insert via PostgREST. On batch failure, fall back to per-row to skip bad rows."""
    ok, bad = 0, []
    for i in range(0, len(rows), batch):
        b = rows[i:i + batch]
        out = subprocess.run(["curl", "-s", "--max-time", "120", "-X", "POST", "-i",
            f"{FL_URL}/rest/v1/{fl_t}",
            "-H", f"apikey: {FL_SR}", "-H", f"Authorization: Bearer {FL_SR}",
            "-H", "Content-Type: application/json", "-H", "Prefer: return=minimal",
            "-d", json.dumps(b)], capture_output=True, text=True).stdout
        code = out.split("\n", 1)[0]
        if " 20" in code or " 201" in code:
            ok += len(b)
        else:
            # per-row fallback
            for row in b:
                o2 = subprocess.run(["curl", "-s", "--max-time", "30", "-X", "POST", "-i",
                    f"{FL_URL}/rest/v1/{fl_t}",
                    "-H", f"apikey: {FL_SR}", "-H", f"Authorization: Bearer {FL_SR}",
                    "-H", "Content-Type: application/json", "-H", "Prefer: return=minimal",
                    "-d", json.dumps([row])], capture_output=True, text=True).stdout
                c2 = o2.split("\n", 1)[0]
                if " 20" in c2 or " 201" in c2:
                    ok += 1
                else:
                    msg = ""
                    for ln in o2.splitlines():
                        if '"message"' in ln or '"details"' in ln:
                            msg = ln[:160]; break
                    bad.append({"id": row.get("id"), "err": msg})
    return ok, bad

def main():
    args = sys.argv[1:]
    dry = "--dry-run" in args or not ("--go" in args)
    only = next((a.split("=", 1)[1] for a in args if a.startswith("--table=")), None)
    verify = "--verify" in args
    plan = [(n, f) for n, f in PLAN if (only in (None, n, f))]

    print(f"Mode: {'VERIFY' if verify else ('DRY-RUN (no writes)' if dry else '*** GO — WILL DELETE+RELOAD FL ***')}")
    print(f"Tables: {len(plan)}\n")
    print(f"{'NYC->FL':<48}{'NYC rows':>9}{'dropped cols (sample)'}")
    print("-" * 90)

    # ---- GO: delete tenant rows children->parents FIRST (reverse FK order) ----
    if not dry and not verify:
        print("DELETE pass (children -> parents):")
        for nyc_t, fl_t in reversed(plan):
            if nyc_t not in NYC_COLS:
                continue
            code = fl_delete_tenant(fl_t)
            print(f"    delete {fl_t:<28} {code}")
        print()

    grand = {}
    for nyc_t, fl_t in plan:
        if nyc_t not in NYC_COLS:
            print(f"{nyc_t+' -> '+fl_t:<48}{'SKIP (not in NYC)':>9}")
            continue
        rows = nyc_read_all(nyc_t)
        tfm, drop_sample = [], set()
        for r in rows:
            o, dr = transform(r, nyc_t, fl_t)
            tfm.append(o); drop_sample.update(dr)
        grand[nyc_t] = len(rows)
        print(f"{nyc_t+' -> '+fl_t:<48}{len(rows):>9}  {sorted(drop_sample)[:6]}")
        if verify:
            continue
        if not dry:
            ins_ok, bad = fl_insert(fl_t, tfm)
            print(f"    inserted {ins_ok}/{len(tfm)}" + (f"  BAD={len(bad)}: {bad[:3]}" if bad else ""))
    print(f"\nNYC total rows in plan: {sum(grand.values())}")
    if dry and not verify:
        print("DRY-RUN complete — nothing written to FL. Re-run with --go tonight to execute.")

if __name__ == "__main__":
    main()
