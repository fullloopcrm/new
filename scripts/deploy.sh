#!/usr/bin/env bash
#
# Canonical FullLoop production deploy. Deploys AND re-points carrying-domain
# aliases in one step, so a bare `vercel --prod` can never orphan them again.
#
#   ./scripts/deploy.sh          (from anywhere; cd's to repo root itself)
#   npm run deploy               (from platform/)
#
# Why this exists: `vercel --prod` alone only re-aliases the apex fullloopcrm.com
# to the new deployment, leaving *.fullloopcrm.com + every <slug>.fullloopcrm.com
# pointing at the previous (gone) deployment -> DEPLOYMENT_NOT_FOUND on every
# tenant carrying domain. See scripts/post-deploy-alias.sh.

set -uo pipefail
cd "$(dirname "$0")/.."   # repo root (vercel project root; NOT platform/)

echo "==> Deploying to production…"
OUT=$(vercel --prod --yes 2>&1 | tee /dev/tty)

# The production deployment URL is the last *.vercel.app in vercel's output.
DEPLOY=$(printf '%s\n' "$OUT" | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1 | sed 's#https://##')

if [ -z "$DEPLOY" ]; then
  echo "ERROR: deploy finished but could not parse the deployment URL." >&2
  echo "       Fix aliases manually: scripts/post-deploy-alias.sh <deployment>" >&2
  exit 1
fi

echo ""
echo "==> Re-aliasing carrying domains to $DEPLOY"
exec "$(dirname "$0")/post-deploy-alias.sh" "$DEPLOY"
