#!/usr/bin/env bash
# Pre-demo checks for the Hiryali n8n alert pipeline.
# Usage: ./automation/check-demo.sh
set -u

fail=0
pass() { printf "  ✅ %s\n" "$1"; }
bad()  { printf "  ❌ %s\n" "$1"; fail=1; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" 2>/dev/null || echo 000; }

echo "Hiryali demo checks"
echo

echo "1) n8n"
c=$(code http://localhost:5678/)
[ "$c" = "200" ] && pass "n8n is up at http://localhost:5678" || bad "n8n not reachable (got $c). Run: npx n8n"

echo "2) Mock receiver"
body=$(curl -s --max-time 5 http://localhost:5057/api/alerts 2>/dev/null || true)
if printf '%s' "$body" | python3 -c 'import json,sys; assert isinstance(json.load(sys.stdin), list)' 2>/dev/null; then
  n=$(printf '%s' "$body" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
  if [ "$n" -eq 0 ]; then
    printf "  ⚠️  mock receiver is up but empty. Frontend shows the monitoring state; run Check Weather / Test Alert before recording.\n"
  else
    pass "mock receiver is up at http://localhost:5057 ($n alerts)"
  fi
else
  bad "mock receiver not reachable. Run: node automation/mock-website.mjs"
fi

echo "3) React site"
c=$(code http://localhost:3000/)
[ "$c" = "200" ] && pass "frontend is up at http://localhost:3000" || bad "frontend not reachable (got $c). Run: cd client && npm run dev"

echo "4) Workflow file"
if python3 -m json.tool automation/disaster-alerts.n8n.json >/dev/null 2>&1; then
  pass "workflow JSON is valid"
else
  bad "workflow JSON is invalid"
fi
if grep -q 'localhost:5057/api/alerts/ingest' automation/disaster-alerts.n8n.json; then
  pass "n8n posts to the mock receiver on :5057"
else
  bad "n8n target is not http://localhost:5057/api/alerts/ingest"
fi
if grep -q 'localhost:5057/api/alerts' client/src/lib/api.js; then
  pass "frontend polls the mock receiver on :5057"
else
  bad "frontend alert URL is not :5057 (check client/src/lib/api.js)"
fi

echo "5) External feeds"
g=0
for i in 1 2 3; do
  g=$(curl -s --max-time 15 https://www.gdacs.org/xml/rss.xml | grep -c '<item>' || true)
  [ "${g:-0}" -gt 0 ] && break
  sleep 2
done
[ "${g:-0}" -gt 0 ] && pass "GDACS reachable ($g live items)" || bad "GDACS feed unreachable"

w=""
for i in 1 2 3; do
  w=$(curl -s --max-time 15 'https://api.open-meteo.com/v1/forecast?latitude=31.5204&longitude=74.3587&daily=precipitation_sum,weather_code&timezone=Asia%2FKarachi&forecast_days=1' || true)
  printf '%s' "$w" | grep -q '"daily"' && break
  sleep 2
done
if printf '%s' "$w" | grep -q '"daily"'; then
  pass "Open-Meteo reachable"
else
  bad "Open-Meteo unreachable"
fi

echo "6) Discord"
if grep -q 'REPLACE_WITH_YOUR_WEBHOOK' automation/disaster-alerts.n8n.json; then
  bad "Discord URL is still a placeholder"
else
  pass "Discord webhook is configured (not sending a message)"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "All checks passed. Ready to record."
else
  echo "Fix the ❌ items before recording."
  exit 1
fi
