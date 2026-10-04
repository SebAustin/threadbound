#!/bin/zsh
# Hand pinch-pull E2E in an emulated Quest 3 session (no eye tracking, so hand
# far rays target): aim the right hand at knob a, pinch, sweep to knob b, release.
# Exit 1 unless exactly the thread a->b is made.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
xr_start
P=$(probe load0)
A=$(field "$P" "['knobs']['a']"); B=$(field "$P" "['knobs']['b']")
# Hold the hand where a seated player would: below and in front of the pegs.
HAND=$(python3 -c "import json;a=json.loads('$A');b=json.loads('$B');print(json.dumps({'x':(a['x']+b['x'])/2+0.1,'y':(a['y']+b['y'])/2-0.25,'z':(a['z']+b['z'])/2+0.3}))")
iw xr set-transform --input-json "{\"device\":\"hand-right\",\"position\":$HAND}" >/dev/null 2>&1; sleep 0.3
iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$A}" >/dev/null 2>&1; sleep 0.5
iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.4
for t in 0.25 0.5 0.75 1.0; do
  iw xr look-at --input-json "{\"device\":\"hand-right\",\"target\":$(lerp_point "$A" "$B" "$t")}" >/dev/null 2>&1; sleep 0.3
done
iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.5
T=$(field "$(probe)" "['threads']")
echo "$T" | grep -q '"from": "a", "to": "b"' && pass "hand pinch-pull makes the thread a->b" || fail "hand pinch-pull makes the thread a->b ($T)"
xr_stop
exit $FAIL
