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

echo "Smoke test PASSED → $BASE"
