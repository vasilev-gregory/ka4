#!/usr/bin/env bash
# Full check before every push: lint, unit, build, browser tests against the production build.
set -e
cd "$(dirname "$0")/.."
npx eslint src
node scripts/unit.mjs
npm run build >/dev/null
npx vite preview --port 4173 --strictPort >/tmp/kach-preview.log 2>&1 & PREV=$!
trap 'kill $PREV 2>/dev/null' EXIT
# wait until the preview server answers (up to 30 s) instead of a fixed sleep
for _ in $(seq 60); do
  curl -sf -o /dev/null http://localhost:4173/ka4/ && break
  kill -0 $PREV 2>/dev/null || { echo "preview server died:"; cat /tmp/kach-preview.log; exit 1; }
  sleep 0.5
done
curl -sf -o /dev/null http://localhost:4173/ka4/ || { echo "preview server not responding"; exit 1; }
fail=0
for t in smoke two_instances swipe weekly bodyweight idb_migration idb_newest_wins stretch_player replay_pending broadcast_sync save_retry; do
  # a scenario fails if it exits non-zero or prints a failed check (BLANK / False / an error)
  if out=$(python3 "scripts/$t.py" 2>&1) && ! echo "$out" | grep -qE "BLANK|False|Error|errors: \[.+\]"; then
    echo "ok   $t"
  else
    echo "FAIL $t"; echo "$out"; fail=1
  fi
done
exit $fail
