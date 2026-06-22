#!/usr/bin/env bash
# smoke-test.sh — final acceptance gate (prompt-claude-code.md §9). Asserts & fails loudly.
# Default target = production. Local override:  PB_URL=http://127.0.0.1:8090 ./scripts/smoke-test.sh
set -euo pipefail
BASE="${BASE:-${PB_URL:-https://gambiaoutage.com}}"
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; exit 1; }
echo "Gambia Outage · smoke test → $BASE"

# 0. app shell (apex) returns 200
CODE=$(curl -fsS -o /dev/null -w '%{http_code}' "$BASE/" || true)
[ "$CODE" = "200" ] || fail "GET $BASE/ → $CODE (want 200)"
pass "app shell 200"

# 1. health
curl -fsS "$BASE/api/health" >/dev/null || fail "GET /api/health"
pass "health ok"

# 2. snapshot has national + 7 macros
SNAP=$(curl -fsS "$BASE/api/go/snapshot") || fail "GET /api/go/snapshot"
echo "$SNAP" | grep -q '"national"' || fail "snapshot missing national"
N=$(printf '%s' "$SNAP" | python3 -c "import sys,json;print(len(json.load(sys.stdin).get('macros',[])))")
[ "$N" = "7" ] || fail "snapshot.macros=$N (want 7)"
pass "snapshot: national + 7 macros"

# 3. macro detail returns quarters
MAC=$(curl -fsS "$BASE/api/go/macro/banjul") || fail "GET /api/go/macro/banjul"
Q=$(printf '%s' "$MAC" | python3 -c "import sys,json;print(len(json.load(sys.stdin).get('quarters',[])))")
[ "$Q" -ge 1 ] || fail "macro/banjul quarters=$Q (want ≥1)"
pass "macro/banjul: $Q quarters"

# 4. national numbers
curl -fsS "$BASE/api/go/national" | grep -q '"regionsTotal"' || fail "GET /api/go/national"
pass "national ok"

# 5. notifications stub returns items array (NOTIF-08)
curl -fsS "$BASE/api/go/notifications" | grep -q '"items"' && pass "notifications stub" || fail "notifications"

# ── Phase 1+ (need the reports create hook: rl_key, merge, confirm, dedupe, close) ──
echo "  … report→event · 8-key confirm · client_uuid dedupe · back→close · stats : Phase 1 (skipped)"

# ── XP: report mints a grant, claim credits the ledger, profile/stats reflect it ──
ZONE="kanifing-11"
XP_NONCE="smoke-xp-$(date +%s)-abcdef0123456789"
XP_ACC=$(printf 'b%.0s' $(seq 1 64))
curl -s -X POST "$BASE/api/collections/reports/records" -H 'Content-Type: application/json' \
  -d "{\"type\":\"out\",\"zone\":\"$ZONE\",\"source\":\"manual\",\"client_uuid\":\"smoke-xp-$(date +%s)\",\"claim_nonce\":\"$XP_NONCE\"}" >/dev/null
XP1=$(curl -s -X POST "$BASE/api/go/xp/claim" -H 'Content-Type: application/json' \
  -d "{\"account_id\":\"$XP_ACC\",\"claim_nonce\":\"$XP_NONCE\"}")
echo "$XP1" | grep -q '"xp"' && pass "xp claim credited" || fail "xp claim"
XPV1=$(echo "$XP1" | grep -o '"xp":[0-9]*' | head -1)
XPV2=$(curl -s -X POST "$BASE/api/go/xp/claim" -H 'Content-Type: application/json' \
  -d "{\"account_id\":\"$XP_ACC\",\"claim_nonce\":\"$XP_NONCE\"}" | grep -o '"xp":[0-9]*' | head -1)
[ "$XPV1" = "$XPV2" ] && pass "xp claim idempotent" || fail "xp double-credit"
curl -s "$BASE/api/go/stats" | grep -q '"contributors"' && pass "stats endpoint" || fail "stats"

# ── Phase 6: leaderboard submit (valid + over-cap) + read + mod-delete coverage ──
LB_ACC=$(printf 'c%.0s' $(seq 1 64))
# valid submit (plausible score, known zone, ACCT_RE-shaped account) → 200 with a row shape
LB1=$(curl -s -X POST "$BASE/api/go/leaderboard/submit" -H 'Content-Type: application/json' \
  -d "{\"account_id\":\"$LB_ACC\",\"nickname\":\"SmokeBot\",\"avatar_id\":\"flag\",\"zone\":\"$ZONE\",\"score\":1200}")
echo "$LB1" | grep -q '"score"' && pass "leaderboard submit (valid)" || fail "leaderboard submit (valid): $LB1"
# read the current-week board for the zone → the just-submitted pseudonym row is present
curl -s "$BASE/api/go/leaderboard?zone=$ZONE" | grep -q '"rows"' && pass "leaderboard read (rows)" || fail "leaderboard read"
curl -s "$BASE/api/go/leaderboard?zone=$ZONE" | grep -q 'SmokeBot' && pass "leaderboard read (row present)" || fail "leaderboard row missing"
# over-cap submit (implausible score) → 400 plausibility reject
LBCODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/go/leaderboard/submit" -H 'Content-Type: application/json' \
  -d "{\"account_id\":\"$LB_ACC\",\"nickname\":\"SmokeBot\",\"avatar_id\":\"flag\",\"zone\":\"$ZONE\",\"score\":999999999}")
[ "$LBCODE" = "400" ] && pass "leaderboard over-cap rejected (400)" || fail "leaderboard over-cap → $LBCODE (want 400)"
# moderation coverage (LEAD-02): a live moderator account is not scriptable in smoke (is_moderator is
# owner-flipped in /_/), so assert the static map registers the type. Full live mod-delete is a
# Manual-Only verification in 06-VALIDATION.md.
grep -q "leaderboard: 'leaderboard_scores'" pb/pb_hooks/lib/go.js && pass "leaderboard mod-delete registered (MOD_DELETE_COLLECTIONS)" || fail "leaderboard not in MOD_DELETE_COLLECTIONS"

# ── Phase 7: incidents (INC-04, INC-05, INC-06) ──────────────────────────────
# INC-05: mod-delete coverage — static map assertion (live moderator not scriptable in smoke)
grep -q "incident: 'incident_reports'" pb/pb_hooks/lib/go.js && pass "incident mod-delete registered (MOD_DELETE_COLLECTIONS)" || fail "incident not in MOD_DELETE_COLLECTIONS"

# INC-04: TTL cron exists — static assertion
grep -q "go_incident_ttl" pb/pb_hooks/go_crons.pb.js && pass "incident TTL cron registered (go_incident_ttl)" || fail "incident TTL cron missing from go_crons.pb.js"

# INC-06 (geo-gate): geo-gate present in incident hook — static assertion
grep -q "geoAllowed" pb/pb_hooks/go_incidents.pb.js && pass "incident hook contains geo-gate (geoAllowed)" || fail "incident hook missing geoAllowed check"

# INC-06 (real create): POST multipart — proves HTTP 200 AND a returned record id.
# A bare "status != 413" check is NOT sufficient (a geo-rejection 400 is also not 413).
# The canonical INC-06 proof is 200 + "id" in the JSON body.
# Generate a minimal 1×1 JPEG inline (base64 → temp file) so the test is self-contained.
SMOKE_JPEG=$(mktemp /tmp/smoke-incident-XXXXXX.jpg)
printf '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U\nHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwL\nDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy\nMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/E\nABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAA\nAAAAAAAAAAAAAAAAEP/aAAwDAQACEQMRAD8AJQAB/9k=' | base64 --decode > "$SMOKE_JPEG" 2>/dev/null || true

INC_BODY=$(curl -s -o /tmp/smoke-inc-resp.txt -w '%{http_code}' \
  -F "category=flooding" \
  -F "text=smoke-test" \
  -F "lat=13.45" \
  -F "lng=-16.57" \
  -F "photo=@${SMOKE_JPEG}" \
  "$BASE/api/collections/incident_reports/records" || true)
INC_RESP=$(cat /tmp/smoke-inc-resp.txt 2>/dev/null || echo "")
rm -f "$SMOKE_JPEG" /tmp/smoke-inc-resp.txt

# Primary assertion: HTTP 200 AND body contains a record id (real create succeeded)
if [ "$INC_BODY" = "200" ] && echo "$INC_RESP" | grep -q '"id"'; then
  pass "incident create: 200 + record id returned (INC-06)"
else
  # Secondary check: not-413 is paired with the 200+id failure for diagnostics only
  if [ "$INC_BODY" != "413" ] && [ "$INC_BODY" != "" ]; then
    fail "incident create: expected 200+id but got HTTP $INC_BODY (body-cap exempt but create did not succeed; backend may be absent)"
  else
    fail "incident create: HTTP $INC_BODY (want 200 + record id) — INC-06 backend absent or geo-blocked"
  fi
fi

echo "Smoke test PASSED → $BASE"
