#!/usr/bin/env bash
# security-scan.sh
# Fast grep-based security scan on changed files.
# Run before every commit as a regression guard — not a full audit.
# Exit code 0 = clean, 1 = issues found.

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ISSUES=0

# Determine which files to scan:
# - If there are staged/unstaged changes, scan those.
# - If called with --all, scan the entire codebase.
# - Otherwise, scan files changed vs origin/main.
if [[ "${1:-}" == "--all" ]]; then
  FILES=$(find server/src client/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | tr '\n' ' ')
  echo "Scanning entire codebase..."
else
  FILES=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
  if [ -z "$FILES" ]; then
    FILES=$(git diff --name-only origin/main 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
  fi
  if [ -z "$FILES" ]; then
    echo -e "${GREEN}No changed .ts/.tsx files to scan.${NC}"
    exit 0
  fi
  echo "Scanning changed files: $FILES"
fi

echo ""

flag() {
  local severity="$1"
  local file="$2"
  local line="$3"
  local message="$4"
  if [[ "$severity" == "HIGH" ]]; then
    echo -e "  ${RED}[HIGH]${NC} $file:$line — $message"
  else
    echo -e "  ${YELLOW}[WARN]${NC} $file:$line — $message"
  fi
  ISSUES=$((ISSUES + 1))
}

# ── Check 1: New Express routes missing authenticateJWT/authenticateToken middleware ──
echo "Checking: unprotected Express routes..."
for file in $FILES; do
  [[ "$file" == server/src/routes/* ]] || continue
  [[ -f "$file" ]] || continue
  # Look for router.get/post/put/delete that don't have authenticate in same line or nearby
  while IFS= read -r line_content; do
    lineno=$(grep -n "$line_content" "$file" 2>/dev/null | head -1 | cut -d: -f1)
    echo "  Note: Review route in $file:${lineno:-?} — verify auth middleware is applied"
  done < <(grep -E "router\.(get|post|put|delete|patch)\s*\(" "$file" 2>/dev/null | grep -v "authenticate" | grep -v "//.*router" || true)
done

# ── Check 2: Raw req.body passed directly to ORM save/update ──
echo "Checking: raw req.body passed to ORM..."
for file in $FILES; do
  [[ -f "$file" ]] || continue
  while IFS=: read -r lineno line_content; do
    flag "HIGH" "$file" "$lineno" "req.body passed directly to ORM — allowlist fields explicitly"
  done < <(grep -n "\.save(req\.body\|\.update(.*req\.body\|Object\.assign(.*req\.body" "$file" 2>/dev/null || true)
done

# ── Check 3: String interpolation into HTML (XSS in email templates) ──
echo "Checking: unescaped interpolation in HTML strings..."
for file in $FILES; do
  [[ -f "$file" ]] || continue
  while IFS=: read -r lineno line_content; do
    flag "HIGH" "$file" "$lineno" "User data interpolated into HTML — use escapeHtml() helper"
  done < <(grep -n '\${.*\(event\|user\|req\)\.' "$file" 2>/dev/null \
    | grep -i "<[a-z]\|style=\|html\b" \
    | grep -v "escapeHtml\|escape(\|formatDateTime\|subject:\|text:\|icalEvent\|key={\`" || true)
done

# ── Check 4: Hardcoded secrets / API key patterns ──
echo "Checking: hardcoded secrets..."
SECRET_PATTERNS=(
  'sk-[a-zA-Z0-9_-]{20,}'
  'GOCSPX-[a-zA-Z0-9_-]+'
  'password\s*=\s*["'"'"'][^$"'"'"']{6,}'
  'secret\s*=\s*["'"'"'][^$"'"'"']{6,}'
  'api[_-]?key\s*=\s*["'"'"'][^$"'"'"']{10,}'
)
for file in $FILES; do
  [[ -f "$file" ]] || continue
  for pattern in "${SECRET_PATTERNS[@]}"; do
    while IFS=: read -r lineno line_content; do
      flag "HIGH" "$file" "$lineno" "Potential hardcoded secret (pattern: $pattern)"
    done < <(grep -in "$pattern" "$file" 2>/dev/null | grep -v "process\.env\|\.env\|example\|placeholder\|your-" || true)
  done
done

# ── Check 5: console.log of sensitive fields ──
echo "Checking: sensitive data in console.log..."
for file in $FILES; do
  [[ -f "$file" ]] || continue
  while IFS=: read -r lineno line_content; do
    flag "WARN" "$file" "$lineno" "console.log may expose password/token/secret"
  done < <(grep -n "console\.log" "$file" 2>/dev/null \
    | grep -iE "password|token|secret|credential" \
    | grep -v "security-scan-ignore" \
    | grep -v "console\.log('[^']*\(token\|secret\|credential\|password\)[^']*')" \
    | grep -v 'console\.log("[^"]*\(token\|secret\|credential\|password\)[^"]*")' || true)
done

# ── Check 6: localStorage used for auth tokens ──
echo "Checking: JWT stored in localStorage..."
for file in $FILES; do
  [[ -f "$file" ]] || continue
  while IFS=: read -r lineno line_content; do
    flag "HIGH" "$file" "$lineno" "Storing auth token in localStorage — use httpOnly cookie instead"
  done < <(grep -n "localStorage\.setItem.*token\|localStorage\.setItem.*jwt" "$file" 2>/dev/null | grep -iv "//.*disabled\|csrf" || true)
done

# ── Check 7: Missing userId scoping in DB queries ──
echo "Checking: DB queries missing userId scoping..."
for file in $FILES; do
  [[ "$file" == server/src/repositories/* ]] || continue
  [[ -f "$file" ]] || continue
  # Flag find/findOne/findBy calls that don't include userId or aren't admin/cron functions
  while IFS=: read -r lineno line_content; do
    # Skip if the line itself has userId scoping or a suppress comment
    if echo "$line_content" | grep -qE "userId|user_id|security-scan-ignore"; then
      continue
    fi
    # Skip if inside a function that is inherently scoped (findByUserId) or admin-only (findUsersFor, getFailedDigests)
    # by looking at surrounding context — check the enclosing function name in the file
    func_context=$(awk "NR<=($lineno) && /async [a-zA-Z]+\(/{fn=\$0} NR==$lineno{print fn}" "$file" 2>/dev/null || true)
    if echo "$func_context" | grep -qE "findByUserId|findUsersFor|getFailedDigests|getDigestStats"; then
      continue
    fi
    flag "WARN" "$file" "$lineno" "Repository query may be missing userId scoping — verify authorization"
  done < <(grep -n "this\.repository\.\(find\b\|findOne\b\|findBy\b\)" "$file" 2>/dev/null || true)
done

# ── Check 8: New .env variable names not in .gitignore ──
echo "Checking: .env file exposure risk..."
for file in $FILES; do
  if echo "$file" | grep -qE "\.env"; then
    flag "HIGH" "$file" "?" ".env file staged for commit — verify it's in .gitignore"
  fi
done

# ── Summary ──
echo ""
if [ "$ISSUES" -eq 0 ]; then
  echo -e "${GREEN}Security scan passed — no issues found.${NC}"
  exit 0
else
  echo -e "${RED}Security scan found $ISSUES issue(s). Review above before committing.${NC}"
  exit 1
fi
