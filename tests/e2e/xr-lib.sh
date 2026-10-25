# Shared helpers for the E2E shell runners and the emulated-XR tests (source from
# tests/e2e/*.sh after cd to repo root). Helpers declare loop variables `local`:
# zsh function variables are global, and a helper's `i` would clobber the caller's loop.
# IW_LOG=<file> appends each call's domain and action (e.g. "xr animate-to"), so a test can check which moves a script made.
iw() { [ -n "$IW_LOG" ] && echo "$1 $2" >> "$IW_LOG"; npx @iwsdk/cli "$@"; }
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
# REST_YAW (radians, default 0) turns that offset with a diorama that doesn't face +z,
# like the video shots' diorama on the table beside the seated player.
rest_hand_for() {
  python3 -c "import json,math;t=json.loads('$1');a=${REST_YAW:-0};print(json.dumps({'x':t['x']+0.1*math.cos(a)+0.35*math.sin(a),'y':t['y']-0.3,'z':t['z']-0.1*math.sin(a)+0.35*math.cos(a)}))"
}
# pinch_sweep <from json> <to json>: pinch at one point and sweep the ray to another, still pinching.
pinch_sweep() {
  local t
  # Hold the hand where a seated player would: below and in front of the pegs.
  local hand=$(python3 -c "import json;a=json.loads('$1');b=json.loads('$2');print(json.dumps({'x':(a['x']+b['x'])/2+0.1,'y':(a['y']+b['y'])/2-0.25,'z':(a['z']+b['z'])/2+0.3}))")
  iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$hand}" >/dev/null 2>&1; sleep 0.3
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$1}" >/dev/null 2>&1; sleep 0.5
  iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.4
  for t in 0.25 0.5 0.75 1.0; do
    iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$(lerp_point "$1" "$2" "$t")}" >/dev/null 2>&1; sleep 0.3
  done
}
# pinch_release: open the right hand's pinch where its ray now points.
pinch_release() {
  iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.5
}
# pinch_pull <from json> <to json>: pinch at one point, sweep the ray to another, release (a thread).
pinch_pull() {
  pinch_sweep "$1" "$2"
  pinch_release
}
# pinch_at <target json>: aim the right-hand ray at the target, pinch, release.
# The short sleeps are gesture timing (how long a hand aims and holds), not waits for state.
pinch_at() {
  iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$(rest_hand_for "$1")}" >/dev/null 2>&1
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$1}" >/dev/null 2>&1; sleep 0.5
  iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.3
  iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.8
}

# Smooth hands for the video takes (tests/e2e/take.sh). Aim once while staging (aim_hand),
# then move only with position-only `xr animate-to` glides, which IWER interpolates every
# frame. rest_hand_for is a fixed offset, so a pure translation keeps the ray on its target:
# a glide to rest_hand_for(t) aims at t, and a pull from rest_hand_for(a) to rest_hand_for(b)
# sweeps the ray from a to b. The jump-based pinch_at/pinch_pull above stay for the tests.
GLIDE_S=0.8
PULL_S=1.0
# aim_hand <target json>: staging only. Rest the right hand for the target and point its ray there.
aim_hand() {
  iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$(rest_hand_for "$1")}" >/dev/null 2>&1
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$1}" >/dev/null 2>&1
}
# glide_to <position json> [seconds]: one position-only move. The call returns once the move has ended.
glide_to() {
  iw xr animate-to --input-json "{\"device\":\"hand-right\",\"position\":$1,\"duration\":${2:-$GLIDE_S}}" >/dev/null 2>&1
}
# glide_pinch_at <target json>: glide to rest for the target, pinch, release.
glide_pinch_at() {
  glide_to "$(rest_hand_for "$1")"
  iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.3
  iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.5
}
# glide_pinch_pull <from json> <to json>: glide to rest for one peg, pinch, glide the ray to the other, release.
glide_pinch_pull() {
  glide_to "$(rest_hand_for "$1")"
  iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.3
  glide_to "$(rest_hand_for "$2")" $PULL_S
  iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.5
}
# wait_solved [probes=15]: poll until the level is solved (a drop runs a few seconds; slow motion 1.5x).
wait_solved() {
  local i
  for i in $(seq 1 ${1:-15}); do [ "$(field "$(probe)" "['status']")" = "complete" ] && return 0; done
  return 1
}
