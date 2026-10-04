# Shared helpers for the E2E shell runners. Helpers declare loop variables `local`:
# zsh function variables are global, and a helper's `i` would clobber the caller's loop.
# Shared helpers for the emulated-XR shell tests (source from tests/e2e/*.sh after cd to repo root).
iw() { npx @iwsdk/cli "$@"; }
FAIL=0
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; FAIL=1; }
# wait_ready [seconds=20]: the dev server's browser bridge accepts commands (after a reload or restart).
wait_ready() {
  local i
  for i in $(seq 1 $(( ${1:-20} * 2 ))); do iw dev status 2>/dev/null | grep -q '"browserCommandReady": true' && return 0; sleep 0.5; done
  return 1
}
# settle [session]: poll in-page until the game (and the XR session) is up and the diorama holds still.
settle() {
  WANT=$1 iw browser run tests/e2e/xr-settled.e2e.mjs 2>/dev/null |
    python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if d.get('ok') and d['data']['result']['ok'] else 1)" 2>/dev/null
}
# fresh_page: reload the managed browser and wait until the game is up (retrying while the bridge reconnects).
fresh_page() {
  local i
  iw browser reload --input-json '{}' >/dev/null 2>&1
  for i in 1 2 3 4 5; do wait_ready && settle page && return 0; sleep 1; done
  return 1
}
# Fresh page, immersive session, hands. AR re-places the diorama before we measure.
xr_start() {
  fresh_page
  iw xr enter --input-json '{}' >/dev/null 2>&1
  iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
  settle session
}
xr_stop() { iw xr exit --input-json '{}' >/dev/null 2>&1; }
# probe [setup] -> JSON of pinchable world positions and state
probe() { SETUP=$1 iw browser run tests/e2e/xr-probe.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))"; }
field() { echo "$1" | python3 -c "import sys,json;v=json.load(sys.stdin)$2;print(v if isinstance(v,str) else json.dumps(v))"; }
# lerp_point <a json> <b json> <t>: the point a fraction t of the way from a to b.
lerp_point() { python3 -c "import json;a=json.loads('$1');b=json.loads('$2');print(json.dumps({k:a[k]+(b[k]-a[k])*$3 for k in a}))"; }
# Where a seated player's right hand rests relative to a target: below and in front.
rest_hand_for() { python3 -c "import json;t=json.loads('$1');print(json.dumps({'x':t['x']+0.1,'y':t['y']-0.3,'z':t['z']+0.35}))"; }
# pinch_at <target json>: aim the right-hand ray at the target, pinch, release.
# The short sleeps are gesture timing (how long a hand aims and holds), not waits for state.
pinch_at() {
  iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$(rest_hand_for "$1")}" >/dev/null 2>&1
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$1}" >/dev/null 2>&1; sleep 0.5
  iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.3
  iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.8
}
