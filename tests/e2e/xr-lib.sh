# Shared helpers for the emulated-XR shell tests (source from tests/e2e/*.sh after cd to repo root).
iw() { npx @iwsdk/cli "$@"; }
FAIL=0
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; FAIL=1; }
# Fresh page, immersive session, hands. AR re-places the diorama (<=3 s) before we measure.
xr_start() {
  iw browser reload --input-json '{}' >/dev/null 2>&1; sleep 7
  iw xr enter --input-json '{}' >/dev/null 2>&1; sleep 3
  iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
  sleep 4
}
xr_stop() { iw xr exit --input-json '{}' >/dev/null 2>&1; }
# probe [setup] -> JSON of pinchable world positions and state
probe() { SETUP=$1 iw browser run tests/e2e/xr-probe.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))"; }
field() { echo "$1" | python3 -c "import sys,json;v=json.load(sys.stdin)$2;print(v if isinstance(v,str) else json.dumps(v))"; }
# Where a seated player's right hand rests relative to a target: below and in front.
rest_hand_for() { python3 -c "import json;t=json.loads('$1');print(json.dumps({'x':t['x']+0.1,'y':t['y']-0.3,'z':t['z']+0.35}))"; }
# pinch_at <target json>: aim the right-hand ray at the target, pinch, release.
pinch_at() {
  iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$(rest_hand_for "$1")}" >/dev/null 2>&1
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$1}" >/dev/null 2>&1; sleep 0.5
  iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.3
  iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.8
}
