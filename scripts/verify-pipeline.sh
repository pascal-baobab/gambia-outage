#!/usr/bin/env bash
# verify-pipeline.sh — LOCAL-ONLY Phase 1 write-path verification (prompt §9 steps 4-8).
# Exercises the anonymous report pipeline end-to-end against a LOCAL PocketBase and asserts:
#   report→event · partial<8 · 8 distinct rl_key → confirmed/out · rate-limit dedupe ·
#   client_uuid dedupe · back→close → on · national/snapshot consistency.
#
# It RESETS the dynamic tables (reports/events/zone_daily_stats/read_models) first, so NEVER
# point it at production. Guarded to localhost. Run the read-only prod gate with smoke-test.sh.
#
# Usage:  PB_URL=http://127.0.0.1:8090 ./scripts/verify-pipeline.sh   (PB must already be serving)
set -uo pipefail
B="${PB_URL:-http://127.0.0.1:8090}"
case "$B" in *127.0.0.1*|*localhost*) : ;; *) echo "✗ refusing: $B is not localhost (this script wipes data)"; exit 1;; esac
HERE="$(cd "$(dirname "$0")/.." && pwd)"
DB="$HERE/pb/pb_data/data.db"
ZONE="${ZONE:-banjul}"
fail() { echo "  ✗ $1"; exit 1; }
pass() { echo "  ✓ $1"; }
jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

[ -f "$DB" ] || fail "no local db at $DB (run pb/setup.sh + serve + seed first)"
echo "verify-pipeline → $B  (zone=$ZONE)"

sqlite3 "$DB" "DELETE FROM reports; DELETE FROM events; DELETE FROM zone_daily_stats; DELETE FROM read_models;" \
  || fail "reset failed"
curl -fsS "$B/api/health" >/dev/null || fail "PB not serving on $B"

# A distinct reporter is now a distinct IP (Sybil hardening: rl_key embeds the attacker-controlled
# UA, so distinct counts are capped at distinctIPs × IP_DEVICE_MULT). PB trusts CF-Connecting-IP
# (trusted_proxy migration), so we simulate N distinct reporters by sending N distinct client IPs
# derived from the UA label. ipfor maps a ua label → a unique 10.x.x.x address.
ipfor() { local h; h=$(echo -n "$1" | cksum | cut -d' ' -f1); echo "10.$(( (h/65536)%256 )).$(( (h/256)%256 )).$(( (h%254)+1 ))"; }
post_out() { # ua zone [client_uuid]
  local b="{\"type\":\"out\",\"zone\":\"$2\",\"source\":\"manual\""; [ -n "${3:-}" ] && b="$b,\"client_uuid\":\"$3\""; b="$b}"
  curl -s -A "$1" -H "CF-Connecting-IP: $(ipfor "$1")" -H 'Content-Type: application/json' -X POST "$B/api/collections/reports/records" -d "$b" -o /dev/null -w '%{http_code}'
}
post_back() { curl -s -A "$1" -H "CF-Connecting-IP: $(ipfor "$1")" -H 'Content-Type: application/json' -X POST "$B/api/collections/reports/records" \
  -d "{\"type\":\"back\",\"zone\":\"$2\",\"source\":\"manual\"}" -o /dev/null -w '%{http_code}'; }
macro() { curl -fsS "$B/api/go/macro/$ZONE"; }

[ "$(macro | jget "d['status']")" = "on" ] || fail "baseline not 'on'"
pass "baseline status on"

[ "$(post_out ua-1 "$ZONE")" = "200" ] || fail "first OUT not 200"
S=$(macro); [ "$(echo "$S" | jget "d['status']")" = "partial" ] || fail "not partial after 1 OUT"
[ "$(echo "$S" | jget "d['confirms']")" = "1" ] || fail "confirms!=1"
pass "first OUT → partial, confirms 1"

for i in 2 3 4 5 6 7 8; do [ "$(post_out "ua-$i" "$ZONE")" = "200" ] || fail "OUT $i not 200"; done
S=$(macro)
[ "$(echo "$S" | jget "d['confirms']")" = "8" ] || fail "confirms!=8 ($(echo "$S" | jget "d['confirms']"))"
[ "$(echo "$S" | jget "str(d['confirmed'])")" = "True" ] || fail "not confirmed"
[ "$(echo "$S" | jget "d['status']")" = "out" ] || fail "status!=out"
pass "8 distinct → confirmed, status out"

[ "$(post_out ua-2 "$ZONE")" = "400" ] || fail "repeat OUT not rate-limited"
[ "$(macro | jget "d['confirms']")" = "8" ] || fail "confirms changed on blocked dup"
pass "rate-limit blocks repeat rl_key (confirms steady)"

[ "$(post_out ua-cu "$ZONE" cu-xyz)" = "200" ] || fail "uuid first not 200"
[ "$(post_out ua-cu2 "$ZONE" cu-xyz)" = "400" ] || fail "uuid replay not 400"
pass "client_uuid dedupe (replay rejected)"

[ "$(curl -fsS "$B/api/go/national" | jget "d['regionsOut']")" -ge 1 ] || fail "national regionsOut<1"
pass "national regionsOut ≥ 1"

for i in 1 2 3 4 5 6; do post_back "ub-$i" "$ZONE" >/dev/null; done
[ "$(macro | jget "d['status']")" = "on" ] || fail "event did not close after BACKs"
[ "$(curl -fsS "$B/api/go/national" | jget "d['regionsOut']")" = "0" ] || fail "national regionsOut!=0 after close"
pass "back→close → status on, regionsOut 0"

[ "$(curl -fsS "$B/api/go/snapshot" | jget "len(d['macros'])")" = "7" ] || fail "snapshot macros!=7"
pass "snapshot intact (7 macros)"

# ── ROLLUP regression (2026-06-01 bug: GPS snaps to a QUARTER → macro pin stayed 'on') ──
# A confirmed outage on a child quarter MUST surface on the parent macro pin + national.
QZONE="${QZONE:-banjul-0}"  # Half Die (child of banjul)
qmacro() { curl -fsS "$B/api/go/snapshot" | python3 -c "import sys,json;d=json.load(sys.stdin);print([m for m in d['macros'] if m['id']=='banjul'][0]['status'])"; }
for i in 1 2 3 4 5 6 7 8; do post_out "rq-$i" "$QZONE" >/dev/null; done
[ "$(qmacro)" = "out" ] || fail "quarter outage did NOT roll up to macro pin (status=$(qmacro), want out)"
[ "$(curl -fsS "$B/api/go/national" | jget "d['regionsOut']")" -ge 1 ] || fail "quarter outage not in national regionsOut"
pass "quarter→macro rollup: child outage lights the region pin"

echo "verify-pipeline PASSED ✓"
