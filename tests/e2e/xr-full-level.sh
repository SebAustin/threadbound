#!/bin/zsh
# Stage 1 bar in an emulated Quest 3 passthrough session: the diorama lands on a
# detected table plane (scene understanding), level 1 is played start to finish
# with hand pinches only, its solve climbs and closes on the cadence, the cups and
# the thread sit in the seated player's view, and the frame stays within the
# draw-call budget in XR. A mid-celebration screenshot lands in .tmp/xr-full-level/.
# Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
xr_start
# Sit the player at the emulated room's dining table (0.79 m high), facing it, and
# enter passthrough again so placement runs from a seated pose.
iw xr set-transform --input-json '{"device":"headset","position":{"x":-0.85,"y":1.15,"z":0.2}}' >/dev/null 2>&1
iw xr look-at --input-json '{"device":"headset","target":{"x":-1.5,"y":0.79,"z":0.2}}' >/dev/null 2>&1
iw xr exit --input-json '{}' >/dev/null 2>&1
iw xr enter --input-json '{}' >/dev/null 2>&1
settle session
P=$(probe load0)
# The first pinch anywhere, even at nothing, unlocks audio (a WebXR select is a user gesture).
iw xr set-transform --input-json '{"device":"hand-right","position":{"x":-0.5,"y":1.0,"z":0.6}}' >/dev/null 2>&1
iw xr look-at --input-json '{"device":"hand-right","target":{"x":-0.5,"y":2.5,"z":2}}' >/dev/null 2>&1; sleep 0.3
iw xr set-select-value --input-json '{"device":"hand-right","value":1}' >/dev/null 2>&1; sleep 0.3
iw xr set-select-value --input-json '{"device":"hand-right","value":0}' >/dev/null 2>&1; sleep 0.3
AUDIO=$(field "$(probe)" "['audio']")
[ "$AUDIO" != "locked" ] && pass "the first XR pinch, even at nothing, unlocks sound ($AUDIO)" || fail "the first XR pinch, even at nothing, unlocks sound ($AUDIO)"
WHERE=$(field "$P" "['placement']['placedOn']"); PLANES=$(field "$P" "['placement']['planesSeen']")
[ "$WHERE" = "table" ] && pass "passthrough places the diorama on a detected table ($PLANES planes seen)" || fail "passthrough places the diorama on a detected table ($WHERE, $PLANES planes)"
# Everything touchable on the placed diorama is within the accepted-table reach of the actual head:
# ACCEPT_REACH in src/lib/placement.ts (ray-pinch reach from a chair, week 8 ticket 19).
ACCEPT_REACH=$(sed -n 's/^export const ACCEPT_REACH = \([0-9.]*\);$/\1/p' src/lib/placement.ts)
HEAD=$(iw xr get-transform --input-json '{"device":"headset"}' 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']['position']))")
REACH=$(echo "$P" | HEAD="$HEAD" python3 -c "
import sys,json,os,math
p=json.load(sys.stdin); h=json.loads(os.environ['HEAD'])
pts=list(p['knobs'].values())+[b for b in p['buttons'].values() if b]+[p['chute'],p['stars']]
print(round(max(math.dist((q['x'],q['y'],q['z']),(h['x'],h['y'],h['z'])) for q in pts),3))")
python3 -c "import sys;sys.exit(0 if ${ACCEPT_REACH:-0} > 0 and $REACH <= ${ACCEPT_REACH:-0} else 1)" &&
  pass "on the table, everything touchable is within ACCEPT_REACH of the head (${REACH} m, limit ${ACCEPT_REACH} m)" ||
  fail "on the table, everything touchable is within ACCEPT_REACH of the head (${REACH} m, limit ${ACCEPT_REACH:-unread} m)"
# Where the celebration plays is in view: the cups and the solution thread within 30 degrees of the gaze.
POSE=$(iw xr get-transform --input-json '{"device":"headset"}' 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))")
GAZE=$(echo "$P" | POSE="$POSE" python3 -c "
import sys,json,os,math
p=json.load(sys.stdin); pose=json.loads(os.environ['POSE']); h=pose['position']; q=pose['orientation']
# The head looks down its local -z: rotate (0,0,-1) by the orientation quaternion.
x,y,z,w=q['x'],q['y'],q['z'],q['w']
f=(-(2*(x*z+w*y)), -(2*(y*z-w*x)), -(1-2*(x*x+y*y)))
def angle(t):
  d=(t['x']-h['x'],t['y']-h['y'],t['z']-h['z']); n=math.hypot(*d)
  return math.degrees(math.acos(max(-1,min(1,sum(a*b for a,b in zip(d,f))/n))))
print(round(max(angle(t) for t in p['cups']+[p['threadMid']]),1))")
python3 -c "import sys;sys.exit(0 if $GAZE <= 30 else 1)" && pass "seated, the cups and the solution thread are within 30 degrees of the gaze (${GAZE} deg)" || fail "seated, the cups and the solution thread are within 30 degrees of the gaze (${GAZE} deg)"
pinch_pull "$(field "$P" "['knobs']['a']")" "$(field "$P" "['knobs']['b']")"
pinch_at "$(field "$P" "['chute']")"
# Wait in-page for the solve (a few seconds of physics), then capture it mid-celebration. That
# drains no cues; if it misses the solve, poll on (each probe drains the cue log, so the cadence
# is summed over the polls, plus one probe after the solve).
mkdir -p .tmp/xr-full-level
SHOT=$(SHOT=.tmp/xr-full-level/celebration.jpg iw browser run tests/e2e/celebration-shot.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))" 2>/dev/null)
S=$(field "$SHOT" "['status']" 2>/dev/null); CAD=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  [ "$S" = "complete" ] && break
  Q=$(probe); S=$(field "$Q" "['status']"); CAD=$(( CAD + $(field "$Q" "['cadenceDrained']") ))
done
echo "celebration screenshot: $SHOT"
[ "$S" = "complete" ] && pass "level 1 played start to finish with hand pinches only" || fail "level 1 played start to finish with hand pinches only ($S)"
A=$(probe); CAD=$(( CAD + $(field "$A" "['cadenceDrained']") ))
NOTES=$(field "$A" "['melodyNotes']"); DISTINCT=$(echo "$NOTES" | python3 -c "import sys,json;print(len(set(json.load(sys.stdin))))")
[ "$CAD" -eq 3 ] && pass "the hand-played solve closes on the cadence (3 cadence cues)" || fail "the hand-played solve closes on the cadence ($CAD cadence cues)"
[ "$DISTINCT" -ge 3 ] && pass "the hand-played solve climbs: $DISTINCT distinct notes ($NOTES)" || fail "the hand-played solve climbs: $DISTINCT distinct notes ($NOTES)"
Z=$(probe busiest); F=$(field "$Z" "['frame']"); B=$(field "$Z" "['frame']['breaches']")
[ "$B" = "[]" ] && pass "the busiest level's XR frame fits the budget per view ($F)" || fail "the busiest level's XR frame fits the budget per view ($F)"
xr_stop
exit $FAIL
