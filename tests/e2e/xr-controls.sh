#!/bin/zsh
# Hand-ray pinches in an emulated Quest 3 session operate the chute, the ledge
# buttons and thread snipping (taps, not drags). Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
xr_start
P=$(probe load0)
pinch_at "$(field "$P" "['chute']")"
S=$(field "$(probe)" "['status']"); [ "$S" != "idle" ] && pass "pinching the chute starts a drop ($S)" || fail "pinching the chute starts a drop ($S)"

P=$(probe thread)
pinch_at "$(field "$P" "['buttons']['restart']")"
N=$(field "$(probe)" "['threads']" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
[ "$N" = "0" ] && pass "pinching Restart clears the threads" || fail "pinching Restart clears the threads (threads=$N)"

P=$(probe thread)
pinch_at "$(field "$P" "['threadMid']")"
N=$(field "$(probe)" "['threads']" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
[ "$N" = "0" ] && pass "pinching a thread snips it" || fail "pinching a thread snips it (threads=$N)"

# Right after a snip with the same hand: the next pinch must not be swallowed.
P=$(probe load0)
pinch_at "$(field "$P" "['buttons']['settings']")"
F=$(field "$(probe)" "['face']"); [ "$F" = "settings" ] && pass "pinching the gear right after a snip opens settings" || fail "pinching the gear right after a snip opens settings ($F)"
sleep 0.5 # let the settings face lay out
pinch_at "$(field "$(probe)" "['slowToggle']")"
M=$(field "$(probe)" "['slowMotion']"); [ "$M" = "true" ] && pass "pinching a plaque toggle works in XR" || fail "pinching a plaque toggle works in XR (slowMotion=$M)"
iw browser run tests/e2e/reset-settings.e2e.mjs >/dev/null 2>&1

P=$(probe load0)
pinch_at "$(field "$P" "['buttons']['daily']")"
P=$(probe); L=$(field "$P" "['levelId']")
case "$L" in daily-*) pass "pinching the sun loads the daily puzzle ($L)";; *) fail "pinching the sun loads the daily puzzle ($L)";; esac
pinch_at "$(field "$P" "['buttons']['daily']")"
L=$(field "$(probe)" "['levelId']")
[ "$L" = "w1-01" ] && pass "pinching the sun again returns to the campaign" || fail "pinching the sun again returns to the campaign ($L)"

P=$(probe solve)
pinch_at "$(field "$P" "['stars']")"
sleep 2 # let the replayed melody play (0.22 s a note)
N=$(field "$(probe)" "['melodyNotes']")
[ "$N" -gt 0 ] && pass "pinching the stars replays the melody ($N notes)" || fail "pinching the stars replays the melody ($N notes)"
xr_stop
exit $FAIL
