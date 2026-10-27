#!/bin/zsh
# Hand-ray pinches in an emulated Quest 3 session operate the chute, the ledge
# buttons, the settings face (slow motion, high contrast, Nearer) and thread
# snipping (taps, not drags), and the ledge strip teaches level 1 from a fresh
# save. A ray resting on Restart lights it, a pinch presses it in, a released
# Settings comes back up on the same button, and a pinch beside a thread (inside
# its hit area) snips it.
# Exit 1 on any failure.
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

# The hand ray resting on Restart, no pinch, lights it; a pinch presses it in 4-7 mm; the release lights it again.
# touch_of <part>: its state, its travel ('0', '4-7' mm, or the millimetres otherwise) and its root's
# object id (a rebuilt part gets a new one).
touch_of() { field "$(probe)" "['touch']['$1']" | python3 -c "import sys,json;t=json.load(sys.stdin);mm=round(t['travel']*1000,3);print(t['state'], '0' if mm==0 else '4-7' if 4<=mm<=7 else f'{mm}mm', t['objectId'])"; }
select_right() { iw xr set-select-value --input-json "{\"device\":\"hand-right\",\"value\":$1}" >/dev/null 2>&1; }
P=$(probe load0)
aim_hand "$(field "$P" "['buttons']['restart']")"; sleep 0.5
TOUCH=$(touch_of button-restart); [ "${TOUCH% *}" = "hover 0" ] && pass "the hand ray resting on Restart reads hover" || fail "the hand ray resting on Restart reads hover ($TOUCH)"
select_right 1; sleep 0.3
TOUCH=$(touch_of button-restart); [ "${TOUCH% *}" = "press 4-7" ] && pass "pinching Restart reads press with 4-7 mm of travel" || fail "pinching Restart reads press with 4-7 mm of travel ($TOUCH)"
select_right 0; sleep 0.8
TOUCH=$(touch_of button-restart); [ "${TOUCH% *}" = "hover 0" ] && pass "after Restart rebuilds the ledge, the new button reads hover" || fail "after Restart rebuilds the ledge, the new button reads hover ($TOUCH)"

# Settings survives its own press (it only flips the plaque's face), so its release shows the press
# undone on the same entity: hover, then press 4-7 mm, then hover again with the same root object.
P=$(probe load0)
FACE0=$(field "$P" "['face']")
aim_hand "$(field "$P" "['buttons']['settings']")"; sleep 0.5
TOUCH=$(touch_of button-settings); SETTINGS_ID=${TOUCH##* }
[ "${TOUCH% *}" = "hover 0" ] && pass "the hand ray resting on Settings reads hover" || fail "the hand ray resting on Settings reads hover ($TOUCH)"
select_right 1; sleep 0.3
TOUCH=$(touch_of button-settings); [ "$TOUCH" = "press 4-7 $SETTINGS_ID" ] && pass "pinching Settings reads press with 4-7 mm of travel" || fail "pinching Settings reads press with 4-7 mm of travel ($TOUCH)"
select_right 0; sleep 0.8
TOUCH=$(touch_of button-settings); [ "$TOUCH" = "hover 0 $SETTINGS_ID" ] && pass "releasing Settings reads hover again on the same button, travel 0" || fail "releasing Settings reads hover again on the same button, travel 0 ($TOUCH, was $SETTINGS_ID)"
FACE1=$(field "$(probe)" "['face']")
[ "$FACE1" != "$FACE0" ] && pass "the release acted: the plaque flipped its face ($FACE0 -> $FACE1)" || fail "the release acted: the plaque flipped its face ($FACE0 -> $FACE1)"
select_right 1; sleep 0.3; select_right 0; sleep 0.8
FACE2=$(field "$(probe)" "['face']")
[ "$FACE2" = "$FACE0" ] && pass "a second pinch on Settings puts the first face back ($FACE2)" || fail "a second pinch on Settings puts the first face back ($FACE2, was $FACE0)"

P=$(probe thread)
pinch_at "$(field "$P" "['threadMid']")"
N=$(field "$(probe)" "['threads']" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
[ "$N" = "0" ] && pass "pinching a thread snips it" || fail "pinching a thread snips it (threads=$N)"

# 1.1 cm off the thread's axis: past its 6 mm radius, inside its invisible hit area.
P=$(probe thread)
pinch_at "$(field "$P" "['threadEdge']")"
N=$(field "$(probe)" "['threads']" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
[ "$N" = "0" ] && pass "a pinch at the thread's edge snips a-b" || fail "a pinch at the thread's edge snips a-b (threads=$N)"

# Right after a snip with the same hand: the next pinch must not be swallowed.
P=$(probe load0)
pinch_at "$(field "$P" "['buttons']['settings']")"
F=$(field "$(probe)" "['face']"); [ "$F" = "settings" ] && pass "pinching the settings button right after a snip opens settings" || fail "pinching the settings button right after a snip opens settings ($F)"
sleep 0.5 # let the settings face lay out
pinch_at "$(field "$(probe)" "['slowToggle']")"
M=$(field "$(probe)" "['slowMotion']"); [ "$M" = "true" ] && pass "pinching a plaque toggle works in XR" || fail "pinching a plaque toggle works in XR (slowMotion=$M)"
# Ticket 15: a hand-ray pinch on the high-contrast toggle flips the setting and repaints the diorama.
pinch_at "$(field "$(probe)" "['contrastToggle']")"
P=$(probe); HC=$(field "$P" "['highContrast']"); LOOK=$(field "$P" "['appearance']")
LOOK_ON=$(echo "$LOOK" | python3 -c "import sys,json;a=json.load(sys.stdin);print(bool(a) and a['highContrast'] and a['glyphBackings'])")
[ "$HC" = "true" ] && [ "$LOOK_ON" = "True" ] && pass "pinching the high-contrast toggle turns high contrast on in XR" || fail "pinching the high-contrast toggle turns high contrast on in XR (highContrast=$HC, appearance=$LOOK)"
# Nearer three times: each pinch lands (a press cue) and moves the diorama a step toward the
# player, and the third lands on the toggle and changes nothing. After each pinch, wait until the
# offset and the moved toggle read the same twice, so the next pinch aims where the toggle now is.
settled_probe() {
  local i prev="" cur
  for i in 1 2 3 4 5 6; do
    P=$(probe); PRESSES=$(( PRESSES + $(field "$P" "['buttonCuesDrained']") ))
    cur="$(field "$P" "['offset']") $(field "$P" "['nearToggle']")"
    [ "$cur" = "$prev" ] && return 0
    prev=$cur
  done
  return 1
}
settled_probe # drains the slow-motion pinch's press
NEARS=(); PRESSED=()
for n in 1 2 3; do
  PRESSES=0
  pinch_at "$(field "$P" "['nearToggle']")"
  settled_probe
  NEARS+=$(field "$P" "['offset']['near']"); PRESSED+=$PRESSES
done
NEAR_SEEN="near ${NEARS[*]}, presses ${PRESSED[*]}"
if [ "${NEARS[*]}" = "1 2 2" ] && [ "${PRESSED[1]}" -gt 0 ] && [ "${PRESSED[2]}" -gt 0 ] && [ "${PRESSED[3]}" -gt 0 ]; then
  pass "three Nearer pinches land and stop at +2 ($NEAR_SEEN)"
else
  fail "three Nearer pinches land and stop at +2 ($NEAR_SEEN)"
fi
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
