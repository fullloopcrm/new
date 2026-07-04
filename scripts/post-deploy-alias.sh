#!/usr/bin/env bash
#
# Re-point the *.fullloopcrm.com wildcard + every existing <slug>.fullloopcrm.com
# carrying-domain alias at the current production deployment.
#
# WHY: a manual `vercel --prod` re-aliases only the apex fullloopcrm.com to the
# new deployment. The wildcard and per-tenant carrying-domain aliases are left
# pointing at the previous (now-gone) deployment, so every <slug>.fullloopcrm.com
# returns DEPLOYMENT_NOT_FOUND. This script fixes that in one shot.
#
# RUN IT IMMEDIATELY AFTER every `vercel --prod`:
#   vercel --prod --yes && scripts/post-deploy-alias.sh
# Or pass a specific deployment URL:
#   scripts/post-deploy-alias.sh fullloopcrm-xxxx-fullloopcrms-projects.vercel.app
#
# DELIBERATELY EXCLUDES apex `fullloopcrm.com` and `www.fullloopcrm.com` — those
# have special canonical/redirect handling (www -> Google Cloud) and must not be
# blindly re-pointed here.

set -uo pipefail

DEPLOY="${1:-}"

if [ -z "$DEPLOY" ]; then
  # Newest READY production deployment URL.
  DEPLOY=$(vercel ls --prod 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1 | sed 's#https://##')
fi

if [ -z "$DEPLOY" ]; then
  echo "ERROR: could not determine a production deployment. Pass one as arg 1." >&2
  exit 1
fi

echo "Target deployment: $DEPLOY"

# 1) Wildcard (covers tenants without an explicit alias). The cert step can emit
#    a transient 'Response Error' but the alias still applies — don't fail on it.
echo "→ *.fullloopcrm.com"
vercel alias set "$DEPLOY" "*.fullloopcrm.com" 2>&1 | grep -iE "Success|Error" | head -1 || true

# 2) Every existing <slug>.fullloopcrm.com carrying-domain alias, excluding apex
#    and www.
HOSTS=$(vercel alias ls 2>/dev/null \
  | grep -oE '[a-z0-9-]+\.fullloopcrm\.com' \
  | grep -vE '^www\.fullloopcrm\.com$' \
  | sort -u)

for host in $HOSTS; do
  echo "→ $host"
  vercel alias set "$DEPLOY" "$host" 2>&1 | grep -iE "Success|Error" | head -1 || true
done

echo "Done. Verify a few:  for s in nycmaid nyc-tow; do curl -s -o /dev/null -w \"%{http_code}\\n\" https://\$s.fullloopcrm.com; done"
