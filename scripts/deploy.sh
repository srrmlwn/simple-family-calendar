#!/usr/bin/env bash
# deploy.sh — Non-interactive deployment helper for famcal.ai
#
# Usage:
#   bash scripts/deploy.sh [--app <heroku-app>] [--skip-checks] [--no-smoke]
#
# Flags:
#   --app <name>     Override Heroku app name (default: auto-detect from git remote)
#   --skip-checks    Skip type-check + lint (use when already passing from verify.sh)
#   --no-smoke       Skip post-deploy smoke tests

set -euo pipefail

# ─── Defaults ──────────────────────────────────────────────────────────────

HEROKU_APP=""
SKIP_CHECKS=false
NO_SMOKE=false
DEPLOY_TIMEOUT=180  # seconds to wait for Heroku dyno to come up

# ─── Arg parsing ───────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app)      HEROKU_APP="$2"; shift 2 ;;
    --skip-checks) SKIP_CHECKS=true; shift ;;
    --no-smoke) NO_SMOKE=true; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ─── Resolve app name ──────────────────────────────────────────────────────

if [[ -z "$HEROKU_APP" ]]; then
  # Try to extract from the heroku git remote URL
  HEROKU_REMOTE_URL=$(git remote get-url heroku 2>/dev/null || echo "")
  if [[ -n "$HEROKU_REMOTE_URL" ]]; then
    # URL format: https://git.heroku.com/<app>.git
    HEROKU_APP=$(basename "$HEROKU_REMOTE_URL" .git)
  fi
fi

if [[ -z "$HEROKU_APP" ]]; then
  # Hardcoded fallback (app name visible in CORS config)
  HEROKU_APP="simple-family-calendar-8282627220c3"
fi

echo "▶  Heroku app: $HEROKU_APP"

# ─── Step 1: Pre-flight checks ─────────────────────────────────────────────

if [[ "$SKIP_CHECKS" == "false" ]]; then
  echo ""
  echo "━━ Step 1/6 — Pre-flight: type-check + lint ━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  npm run type-check
  npm run lint
  echo "✓  Type-check and lint passed"
else
  echo "━━ Step 1/6 — Pre-flight: skipped (--skip-checks) ━━━━━━━━━━━━━━━━━━━━━━"
fi

# ─── Step 2: Push to Heroku ────────────────────────────────────────────────

echo ""
echo "━━ Step 2/6 — git push heroku main ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git push heroku main

# ─── Step 3: Wait for dyno to come up ─────────────────────────────────────

echo ""
echo "━━ Step 3/6 — Waiting for dyno (timeout: ${DEPLOY_TIMEOUT}s) ━━━━━━━━━━━━━━━━━━━━"
ELAPSED=0
INTERVAL=5
while [[ $ELAPSED -lt $DEPLOY_TIMEOUT ]]; do
  STATE=$(heroku ps --app "$HEROKU_APP" 2>/dev/null | grep "web\." | awk '{print $2}' | head -1)
  if [[ "$STATE" == "up" ]]; then
    echo "✓  Dyno is up (${ELAPSED}s)"
    break
  fi
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [[ $ELAPSED -ge $DEPLOY_TIMEOUT ]]; then
  echo "✗  Dyno did not reach 'up' state within ${DEPLOY_TIMEOUT}s" >&2
  exit 1
fi

# ─── Step 4: Health check ─────────────────────────────────────────────────

echo ""
echo "━━ Step 4/6 — Health check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://famcal.ai/api/health")
if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✓  /api/health returned 200"
else
  echo "✗  /api/health returned $HTTP_STATUS" >&2
  exit 1
fi

# ─── Step 5: Smoke tests ──────────────────────────────────────────────────

if [[ "$NO_SMOKE" == "false" ]]; then
  echo ""
  echo "━━ Step 5/6 — Smoke tests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  SMOKE_BASE_URL="https://famcal.ai" HEROKU_APP="$HEROKU_APP" npm run test:smoke
  echo "✓  Smoke tests passed"
else
  echo "━━ Step 5/6 — Smoke tests: skipped (--no-smoke) ━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# ─── Step 6: Summary ──────────────────────────────────────────────────────

echo ""
echo "━━ Step 6/6 — Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DEPLOYED_SHA=$(git rev-parse HEAD)
echo "✓  Deploy complete"
echo "   App:    $HEROKU_APP"
echo "   Commit: $DEPLOYED_SHA"
echo "   URL:    https://famcal.ai"
