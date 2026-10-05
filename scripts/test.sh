#!/usr/bin/env bash
# Full check before every push: lint, unit, build, browser tests against the production build.
set -e
cd "$(dirname "$0")/.."
npx eslint src
node scripts/unit.mjs
npm run build >/dev/null
npx vite preview --port 4173 >/tmp/kach-preview.log 2>&1 & PREV=$!
trap 'kill $PREV 2>/dev/null' EXIT
sleep 4
fail=0
for t in smoke two_instances swipe weekly bodyweight idb_migration idb_newest_wins; do
  out=$(python3 "scripts/$t.py" 2>&1) || fail=1
  if echo "$out" | grep -qE "BLANK|False|Error|errors: \[.+\]"; then echo "FAIL $t"; echo "$out"; fail=1; else echo "ok   $t"; fi
done
exit $fail
