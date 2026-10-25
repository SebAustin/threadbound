#!/bin/zsh
# Hand pinch-pull E2E in an emulated Quest 3 session (no eye tracking, so hand
# far rays target): aim the right hand at knob a, pinch, sweep to knob b (which
# then reads 'target'), release. Exit 1 unless exactly the thread a->b is made and
# nothing reads 'target' after. A pull released on bare panel makes no thread and
# sounds one miss. The last block checks the video takes' glide helpers (xr-lib.sh):
# glide pinch-pull a->b, then a glide chute pinch solves.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
xr_start
P=$(probe load0)
pinch_sweep "$(field "$P" "['knobs']['a']")" "$(field "$P" "['knobs']['b']")"
B=$(field "$(probe)" "['touch']['peg-b']['state']")
[ "$B" = "target" ] && pass "with the pinch swept onto b, peg b reads target" || fail "with the pinch swept onto b, peg b reads target ($B)"
pinch_release
Q=$(probe); T=$(field "$Q" "['threads']")
TARGETS=$(field "$Q" "['touch']" | python3 -c "import sys,json;print([n for n,t in json.load(sys.stdin).items() if t.get('state')=='target'])")
echo "$T" | grep -q '"from": "a", "to": "b"' && pass "hand pinch-pull makes the thread a->b" || fail "hand pinch-pull makes the thread a->b ($T)"
[ "$TARGETS" = "[]" ] && pass "after the release nothing reads target" || fail "after the release nothing reads target ($TARGETS)"

# A pull from a released on bare panel (8 cm below a, far from every peg): no thread, one soft miss.
P=$(probe load0); A=$(field "$P" "['knobs']['a']")
BARE=$(python3 -c "import json;a=json.loads('$A');print(json.dumps({'x':a['x'],'y':a['y']-0.08,'z':a['z']}))")
pinch_pull "$A" "$BARE"
Q=$(probe); N=$(field "$Q" "['threads']" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))"); MISS=$(field "$Q" "['dragMissDrained']")
[ "$N" = "0" ] && [ "$MISS" = "1" ] && pass "a pull released on bare panel makes no thread and sounds one miss" || fail "a pull released on bare panel makes no thread and sounds one miss (threads=$N, misses=$MISS)"

# Near pinch, the ghost hand's gesture: the hand rests a few cm in front of the knob
# and moves (not just the ray rotating) to the other peg.
near() { python3 -c "import json;p=json.loads('$1');print(json.dumps({'x':p['x'],'y':p['y'],'z':p['z']+$2}))"; }
behind() { python3 -c "import json;p=json.loads('$1');print(json.dumps({'x':p['x'],'y':p['y']-0.01,'z':p['z']-0.1}))"; }
P=$(probe load0); A=$(field "$P" "['knobs']['a']"); B=$(field "$P" "['knobs']['b']")
iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$(near "$A" 0.03)}" >/dev/null 2>&1
iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$(behind "$A")}" >/dev/null 2>&1; sleep 0.4
iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.3
for t in 0.33 0.66 1.0; do
  Pt=$(lerp_point "$A" "$B" $t)
  iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$(near "$Pt" 0.03)}" >/dev/null 2>&1
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$(behind "$Pt")}" >/dev/null 2>&1; sleep 0.25
done
iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.4
T=$(field "$(probe)" "['threads']")
echo "$T" | grep -q '"from": "a", "to": "b"' && pass "a near pinch at the knob, moving the hand, makes the thread" || fail "a near pinch at the knob, moving the hand, makes the thread ($T)"

# Tracking lost mid-pinch must not leave a drag stuck: the next pinch-pull still works.
P=$(probe load0); A=$(field "$P" "['knobs']['a']"); B=$(field "$P" "['knobs']['b']")
H=$(python3 -c "import json;a=json.loads('$A');print(json.dumps({'x':a['x']+0.1,'y':a['y']-0.25,'z':a['z']+0.3}))")
iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$H}" >/dev/null 2>&1
iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$A}" >/dev/null 2>&1; sleep 0.4
iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.4
iw xr set-connected --input-json '{"device":"hand-right","connected":false}' >/dev/null 2>&1; sleep 0.5
iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1
iw xr set-connected --input-json '{"device":"hand-right","connected":true}' >/dev/null 2>&1; sleep 0.6
pinch_pull "$A" "$B"
T=$(field "$(probe)" "['threads']")
echo "$T" | grep -q '"from": "a", "to": "b"' && pass "losing the hand mid-pinch leaves no stuck drag" || fail "losing the hand mid-pinch leaves no stuck drag ($T)"
xr_stop

# The video takes' smooth hands (take.sh): in a fresh session, aim once, then only glide.
xr_start
P=$(probe load0); C=$(field "$P" "['chute']"); REST_YAW=$(field "$P" "['yaw']")
aim_hand "$C"
glide_pinch_pull "$(field "$P" "['knobs']['a']")" "$(field "$P" "['knobs']['b']")"
T=$(field "$(probe)" "['threads']")
echo "$T" | grep -q '"from": "a", "to": "b"' && pass "a glided pinch-pull makes the thread a->b" || fail "a glided pinch-pull makes the thread a->b ($T)"
glide_pinch_at "$C"
wait_solved && pass "a glided pinch on the chute solves level 1" || fail "a glided pinch on the chute solves level 1 ($(field "$(probe)" "['status']"))"
xr_stop
exit $FAIL
