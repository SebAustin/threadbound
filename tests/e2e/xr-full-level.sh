#!/bin/zsh
# Stage 1 bar in an emulated Quest 3 passthrough session: the diorama lands on a
# detected table plane (scene understanding), level 1 is played start to finish
# with hand pinches only, and the frame stays within the draw-call budget in XR.
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
# Everything touchable on the placed diorama is within a seated 2 ft of the actual head.
HEAD=$(iw xr get-transform --input-json '{"device":"headset"}' 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']['position']))")
REACH=$(echo "$P" | HEAD="$HEAD" python3 -c "
import sys,json,os,math
p=json.load(sys.stdin); h=json.loads(os.environ['HEAD'])
pts=list(p['knobs'].values())+[b for b in p['buttons'].values() if b]+[p['chute'],p['stars']]
print(round(max(math.dist((q['x'],q['y'],q['z']),(h['x'],h['y'],h['z'])) for q in pts),3))")
python3 -c "import sys;sys.exit(0 if $REACH <= 0.61 else 1)" && pass "on the table, everything touchable is within 2 ft of the head (${REACH} m)" || fail "on the table, everything touchable is within 2 ft of the head (${REACH} m)"
pinch_pull "$(field "$P" "['knobs']['a']")" "$(field "$P" "['knobs']['b']")"
pinch_at "$(field "$P" "['chute']")"
# Poll until the drop is decided (a solve takes a few seconds of physics).
S=""
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  Q=$(probe); S=$(field "$Q" "['status']")
  [ "$S" = "complete" ] && break
done
[ "$S" = "complete" ] && pass "level 1 played start to finish with hand pinches only" || fail "level 1 played start to finish with hand pinches only ($S)"
Z=$(probe busiest); F=$(field "$Z" "['frame']"); B=$(field "$Z" "['frame']['breaches']")
[ "$B" = "[]" ] && pass "the busiest level's XR frame fits the budget per view ($F)" || fail "the busiest level's XR frame fits the budget per view ($F)"
xr_stop
exit $FAIL
