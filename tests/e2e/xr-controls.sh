#!/bin/zsh
# Hand-ray pinches in an emulated Quest 3 session operate the chute, the ledge
# buttons, the settings face and thread snipping (taps, not drags), and the ledge
# strip teaches level 1 from a fresh save. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
xr_start
R=$(iw browser run tests/e2e/xr-room.e2e.mjs 2>/dev/null | python3 -c "import sys,json;r=json.load(sys.stdin)['data']['result'];print(r['visible'] or r['background'], r['blendMode'])")
case "$R" in False\ alpha-blend) pass "passthrough hides the virtual study ($R)";; *) fail "passthrough hides the virtual study ($R)";; esac
# From a fresh save, the ledge strip teaches level 1 and counts its threads (earlier scripts solved it).
LEDGE=$(field "$(probe fresh)" "['ledge']")
LEDGE_OK=$(echo "$LEDGE" | python3 -c "import sys,json;l=json.load(sys.stdin);t=l['text'];print(l['visible'] and t['hint']=='Pinch a glowing peg, pull, release on the other' and t['threads'].startswith('Threads 0/2'))")
[ "$LEDGE_OK" = "True" ] && pass "from a fresh save the ledge strip shows level 1's onboarding hint and Threads 0/2" || fail "from a fresh save the ledge strip shows level 1's onboarding hint and Threads 0/2 ($LEDGE)"
P=$(probe load0)
AIM=$(field "$P" "['chute']")
M0=$(field "$P" "['marbleCount']")
pinch_at "$AIM"
Q=$(probe); S=$(field "$Q" "['status']"); M=$(field "$Q" "['marbleCount']")
# A drop with no thread can end (status back to 'idle') before this probe reads it, but its marbles
# stay until the next drop or build: marbles where there were none prove the pinch started a drop.
if [ "$M0" = "0" ] && { [ "$S" != "idle" ] || [ "$M" -gt 0 ]; }; then
  pass "pinching the chute starts a drop ($S, $M marbles)"
else
  fail "pinching the chute starts a drop ($S, $M marbles, $M0 before)"
  # Did the diorama move between the probe and the pinch? Aim point vs where the chute is now.
  echo "  aimed at $AIM; now $(iw browser run tests/e2e/chute-where.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))")"
fi

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
F=$(field "$(probe)" "['face']"); [ "$F" = "settings" ] && pass "pinching the settings button right after a snip opens settings" || fail "pinching the settings button right after a snip opens settings ($F)"
sleep 0.5 # let the settings face lay out
pinch_at "$(field "$(probe)" "['slowToggle']")"
M=$(field "$(probe)" "['slowMotion']"); [ "$M" = "true" ] && pass "pinching a plaque toggle works in XR" || fail "pinching a plaque toggle works in XR (slowMotion=$M)"
# Nearer three times: each pinch moves the diorama a step toward the player, and the third stops at +2.
for n in 1 2 3; do pinch_at "$(field "$(probe)" "['nearToggle']")"; done
O=$(field "$(probe)" "['offset']")
[ "$(field "$O" "['near']")" = "2" ] && pass "three Nearer pinches stop at +2 ($O)" || fail "three Nearer pinches stop at +2 ($O)"
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
# Poll until the replay has sounded (each probe drains the cue log, so sum the counts).
N=0
for attempt in 1 2 3 4 5 6 7 8; do
  N=$(( N + $(field "$(probe)" "['melodyNotesDrained']") ))
  [ "$N" -gt 0 ] && break
done
[ "$N" -gt 0 ] && pass "pinching the stars replays the melody ($N notes)" || fail "pinching the stars replays the melody ($N notes)"
xr_stop
exit $FAIL
