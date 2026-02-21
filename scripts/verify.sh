#!/usr/bin/env bash
# verify.sh
# Full pre-commit pipeline: type-check → lint → unit tests → E2E → security scan.
# Starts and stops local servers automatically.
# Exit code 0 = all checks pass, 1 = something failed.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

SERVER_PID=""
CLIENT_PID=""

cleanup() {
  echo ""
  echo "Stopping servers..."
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  if [ -n "$CLIENT_PID" ] && kill -0 "$CLIENT_PID" 2>/dev/null; then
    kill "$CLIENT_PID" 2>/dev/null || true
  fi
  # Kill any process still holding ports 3000/4000
  lsof -ti:4000 | xargs kill -9 2>/dev/null || true
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

step() {
  echo ""
  echo -e "${BLUE}${BOLD}▶ $1${NC}"
}

fail() {
  echo -e "${RED}${BOLD}✗ $1${NC}"
  exit 1
}

pass() {
  echo -e "${GREEN}✓ $1${NC}"
}

echo -e "${BOLD}famcal.ai — full verification pipeline${NC}"
echo "======================================="

# ── Step 1: TypeScript ──
step "Type-checking (server + client)..."
npm run type-check || fail "TypeScript errors found. Fix before continuing."
pass "Type-check passed"

# ── Step 2: Lint ──
step "Linting..."
npm run lint || fail "Lint errors found. Fix before continuing."
pass "Lint passed"

# ── Step 3: Unit tests ──
step "Running unit tests..."
npm run test:unit || fail "Unit tests failed."
pass "Unit tests passed"

# ── Step 4: Start servers ──
step "Starting servers..."
cd server && npm run dev > /tmp/famcal-server.log 2>&1 &
SERVER_PID=$!
cd - > /dev/null

cd client && npm start > /tmp/famcal-client.log 2>&1 &
CLIENT_PID=$!
cd - > /dev/null

echo "Waiting for servers to be ready (this takes ~15s)..."
npx wait-on http://localhost:4000/api/health http://localhost:3000 --timeout 60000 \
  || fail "Servers failed to start. Check /tmp/famcal-server.log and /tmp/famcal-client.log"
pass "Servers ready (server:4000, client:3000)"

# ── Step 5: E2E tests ──
step "Running E2E tests (Puppeteer)..."
npm run test:e2e || fail "E2E tests failed."
pass "E2E tests passed"

# ── Step 6: Security scan ──
step "Running security scan..."
npm run security:scan || fail "Security scan flagged issues. Review before committing."
pass "Security scan passed"

# ── Done ──
echo ""
echo -e "${GREEN}${BOLD}======================================="
echo "All checks passed — ready to commit."
echo -e "=======================================${NC}"
