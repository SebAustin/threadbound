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
xr_stop
exit $FAIL
