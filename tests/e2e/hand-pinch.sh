#!/bin/zsh
# Hand pinch-pull E2E in an emulated Quest 3 session (no eye tracking, so hand
# far rays target): aim the right hand at knob a, pinch, sweep to knob b, release.
# Exit 1 unless exactly the thread a->b is made.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
xr_start
P=$(probe load0)
pinch_pull "$(field "$P" "['knobs']['a']")" "$(field "$P" "['knobs']['b']")"
T=$(field "$(probe)" "['threads']")
echo "$T" | grep -q '"from": "a", "to": "b"' && pass "hand pinch-pull makes the thread a->b" || fail "hand pinch-pull makes the thread a->b ($T)"

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
exit $FAIL
