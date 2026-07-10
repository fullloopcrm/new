#!/usr/bin/env python3
"""
ROOT A billing regression sim — validates the DEPLOYED checkout endpoint prices
every pricing model correctly (hourly recompute, flat/quote preserved, min-charge floor).

WHAT IT DOES
  1. Creates a DISPOSABLE test tenant in the LIVE prod DB (name "SIM TEST — DELETE ME").
  2. Seeds hourly/flat/quote services + a min-charge service, and a booking per model.
  3. Mints a team-portal token and POSTs to the deployed /api/team-portal/checkout.
  4. Asserts the resulting booking.price per model.
  5. Deletes the test tenant (cascades away all seeded rows) in a finally block.

⚠️  THIS WRITES TO PRODUCTION (an isolated throwaway tenant). Not for CI. Run manually:
      cd platform && python3 scripts/sim-billing-pricing.py
    Requires .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and
    .env.fl.live (TEAM_PORTAL_SECRET). Exits 0 on all-pass, 1 on any failure.

WHY IT EXISTS
  Static checks (tsc/build) can't catch DB CHECK constraints or the cents/dollars
  split-brain. This sim already caught: the pricing_model enum (hourly/flat/quote,
  NOT per_unit), the per_unit NOT NULL constraint, and a 100x invoice cents bug.
"""
import os, json, time, base64, hmac, hashlib, urllib.request, urllib.error, uuid, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # -> platform/
DEPLOY = os.environ.get("SIM_DEPLOY_URL", "https://fullloopcrm.com")

def load_env(fname, keys):
    out, p = {}, os.path.join(ROOT, fname)
    if os.path.exists(p):
        for line in open(p):
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                if k in keys: out[k] = v.strip().strip('"').strip("'")
    return out

env = {}
env.update(load_env(".env.local", {"NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"}))
env.update(load_env(".env.fl.live", {"TEAM_PORTAL_SECRET"}))
try:
    SB, KEY, SECRET = env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"], env["TEAM_PORTAL_SECRET"]
except KeyError as e:
    sys.exit(f"missing env {e}; need .env.local + .env.fl.live in {ROOT}")

def rest(method, path, body=None, params=""):
    req = urllib.request.Request(f"{SB}/rest/v1/{path}{params}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey", KEY); req.add_header("Authorization", f"Bearer {KEY}")
    req.add_header("Content-Type", "application/json"); req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            t = r.read().decode(); return json.loads(t) if t else []
    except urllib.error.HTTPError as e:
        print(f"  REST {method} {path} -> {e.code}: {e.read().decode()[:200]}"); raise

def mint_token(member_id, tenant_id, pay_rate):
    payload = json.dumps({"id": member_id, "tid": tenant_id, "pr": pay_rate or 0, "r": "worker",
                          "exp": int(time.time()*1000) + 3600*1000})
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.b64encode(payload.encode()).decode() + "." + sig

def checkout(token, booking_id):
    req = urllib.request.Request(f"{DEPLOY}/api/team-portal/checkout",
        data=json.dumps({"booking_id": booking_id}).encode(), method="POST")
    req.add_header("Authorization", f"Bearer {token}"); req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status
    except urllib.error.HTTPError as e: return e.code

TID = str(uuid.uuid4())
results = []
try:
    rest("POST", "tenants", {"id": TID, "name": "SIM TEST — DELETE ME", "slug": f"sim-delete-{TID[:8]}",
                             "status": "active", "industry": "cleaning"})
    mid = str(uuid.uuid4())
    rest("POST", "team_members", {"id": mid, "tenant_id": TID, "name": "Sim Worker", "pin": "999123",
                                  "status": "active", "active": True, "pay_rate": 25, "role": "worker"})
    cid = str(uuid.uuid4())
    rest("POST", "clients", {"id": cid, "tenant_id": TID, "name": "Sim Client", "address": "1 Test St"})

    svcs = {
        "hourly": dict(pricing_model="hourly", price_cents=None,  per_unit="hour", min_charge_cents=None, default_hourly_rate=60),
        "flat":   dict(pricing_model="flat",   price_cents=20000, per_unit="job",  min_charge_cents=None, default_hourly_rate=0),
        "quote":  dict(pricing_model="quote",  price_cents=15000, per_unit="job",  min_charge_cents=None, default_hourly_rate=0),
        "floor":  dict(pricing_model="flat",   price_cents=1000,  per_unit="job",  min_charge_cents=5000,  default_hourly_rate=0),
    }
    svc_ids = {}
    for k, s in svcs.items():
        sid = str(uuid.uuid4())
        rest("POST", "service_types", {"id": sid, "tenant_id": TID, "name": f"Sim {k}", "default_duration_hours": 2,
             "active": True, "mode": "booking", "item_type": "service", "sort_order": 1, "taxable": True, **s})
        svc_ids[k] = sid

    def ago(h): return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(time.time() - h*3600)) + "Z"
    cases = [("hourly","hourly",9999,60,"RECOMPUTE"), ("flat","flat",20000,0,"KEEP"),
             ("quote","quote",15000,0,"KEEP"), ("floor","floor",1000,0,"FLOOR")]
    bookings = []
    for i, (label, svc, price, rate, exp) in enumerate(cases):
        off, bid = 3 + i*5, str(uuid.uuid4())
        rest("POST", "bookings", {"id": bid, "tenant_id": TID, "client_id": cid, "team_member_id": mid,
             "service_type": svc, "service_type_id": svc_ids[svc], "hourly_rate": rate, "price": price,
             "team_size": 1, "status": "confirmed", "start_time": ago(off), "end_time": ago(off-2),
             "check_in_time": ago(off-0.5), "payment_status": "pending"})
        bookings.append((bid, label, price, exp))

    token = mint_token(mid, TID, 25)
    for bid, label, quoted, exp in bookings:
        st = checkout(token, bid)
        row = rest("GET", "bookings", params=f"?id=eq.{bid}&select=price")
        newprice = row[0]["price"] if row else None
        ok = (newprice == quoted if exp == "KEEP" else newprice == 5000 if exp == "FLOOR"
              else newprice is not None and newprice != quoted and newprice > 0)
        v = "PASS" if ok else "FAIL"
        results.append((label, exp, quoted, newprice, st, v))
        print(f"[{v}] {label:7} {exp:9} quoted={quoted} -> {newprice} (http {st})")
finally:
    # Deleting the tenant cascades away seeded rows (bookings/services/clients/members).
    try: rest("DELETE", "tenants", params=f"?id=eq.{TID}")
    except Exception as e: print(f"cleanup warning: {e}")
    print("cleaned up test tenant")

allpass = len(results) == 4 and all(r[5] == "PASS" for r in results)
print("RESULT:", "ALL PASS" if allpass else "FAILURES")
sys.exit(0 if allpass else 1)
