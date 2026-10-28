#!/bin/zsh
# Week 8 ticket 16 in an emulated Quest 3 passthrough session: plucks and cup chimes are heard from
# where they happen. Seated at the table with sound unlocked by a pinch, a solve's bounces go through
# a panner at the thread's midpoint, the live cadence strum comes from the mean of the cup centres,
# and the synth's audio listener follows the head, also after the headset moves 0.4 m sideways;
# every panned note gives its panner back. After leaving XR, the cues asked for while IWSDK holds
# sound suspended start no note, and one canvas click brings sound back. Automation can't hear, so
# this proves the routing and the positions, not the direction a player hears. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
# Cue sources are rounded to 1 mm; the listener follows the head within a frame's ramp.
SOURCE_TOL=0.002
LISTENER_TOL=0.02
SIDESTEP=0.4
# apart <a json> <b json> -> metres between two world points (inf if either is missing).
apart() {
  python3 -c "import json,math;a=json.loads('$1');b=json.loads('$2');print(round(math.dist((a['x'],a['y'],a['z']),(b['x'],b['y'],b['z'])),4) if a and b else 'inf')" 2>/dev/null || echo inf
}
# spread <probe json> <cue name> <target json> -> "count spatial worst": that cue's records, how many
# went through a panner, and the farthest source from the target (inf for a missing source).
spread() {
  echo "$1" | python3 -c "
import sys,json,math
p=json.load(sys.stdin); t=json.loads('$3'); rs=[r for r in p['positionalDrained'] if r['name']=='$2']
d=lambda s: math.dist((s['x'],s['y'],s['z']),(t['x'],t['y'],t['z'])) if s else math.inf
print(len(rs), sum(1 for r in rs if r.get('spatial') is True), round(max([d(r.get('source')) for r in rs] or [math.inf]),4))"
}
# listener_gap <probe json> -> metres between the synth's listener and the head (inf while locked).
listener_gap() {
  echo "$1" | python3 -c "
import sys,json,math
l=json.load(sys.stdin)['listener']
print(round(math.dist(*[(p['x'],p['y'],p['z']) for p in (l['listener'],l['head'])]),4) if l and l['listener'] else 'inf')"
}

xr_start
seat_at_table
probe load0 >/dev/null
pinch_unlock
AUDIO=$(field "$(probe)" "['audio']")
[ "$AUDIO" = "running" ] && pass "seated in passthrough, a pinch unlocks sound ($AUDIO)" || fail "seated in passthrough, a pinch unlocks sound ($AUDIO)"

S=$(probe solve)
MID=$(field "$S" "['threadMid']")
read N SPATIAL WORST <<< "$(spread "$S" bounce "$MID")"
[ "$N" -ge 1 ] && [ "$SPATIAL" -eq "$N" ] && python3 -c "import sys;sys.exit(0 if $WORST <= $SOURCE_TOL else 1)" &&
  pass "every bounce goes through a panner at the thread's midpoint ($N bounces, worst ${WORST} m)" ||
  fail "every bounce goes through a panner at the thread's midpoint ($N bounces, $SPATIAL panned, worst ${WORST} m)"
CUPS_MEAN=$(field "$S" "['cups']" | python3 -c "import sys,json;c=json.load(sys.stdin);print(json.dumps({k:sum(p[k] for p in c)/len(c) for k in 'xyz'}))")
read N SPATIAL WORST <<< "$(spread "$S" cadence "$CUPS_MEAN")"
[ "$N" -eq 3 ] && python3 -c "import sys;sys.exit(0 if $WORST <= $SOURCE_TOL else 1)" &&
  pass "the live cadence strum comes from the mean of the cup centres (3 notes, $SPATIAL panned, worst ${WORST} m)" ||
  fail "the live cadence strum comes from the mean of the cup centres ($N notes, $SPATIAL panned, worst ${WORST} m)"

GAP=$(listener_gap "$S")
python3 -c "import sys;sys.exit(0 if '$GAP' != 'inf' and $GAP <= $LISTENER_TOL else 1)" 2>/dev/null &&
  pass "the synth's listener is at the head (${GAP} m)" || fail "the synth's listener is at the head (${GAP} m)"
# Move the emulated headset sideways (its own pose, in IWER's reference space), then look again.
HEAD0=$(field "$S" "['listener']['head']" 2>/dev/null)
POS=$(iw xr get-transform --input-json '{"device":"headset"}' 2>/dev/null | python3 -c "import sys,json;p=json.load(sys.stdin)['data']['result']['position'];p['x']+=$SIDESTEP;print(json.dumps(p))")
iw xr set-transform --input-json "{\"device\":\"headset\",\"position\":$POS}" >/dev/null 2>&1
M=$(probe)
GAP=$(listener_gap "$M")
STEP=$(apart "$HEAD0" "$(field "$M" "['listener']['head']" 2>/dev/null)")
python3 -c "import sys;sys.exit(0 if '$STEP' != 'inf' and abs($STEP - $SIDESTEP) <= 0.01 and '$GAP' != 'inf' and $GAP <= $LISTENER_TOL else 1)" 2>/dev/null &&
  pass "after the headset moves ${SIDESTEP} m sideways (head moved ${STEP} m), the listener follows it (${GAP} m)" ||
  fail "after the headset moves ${SIDESTEP} m sideways (head moved ${STEP} m), the listener follows it (${GAP} m)"

# Every panned note gives its panner back when it ends (1.4 s), or later cues would play mono. The
# solve setup waits out its replay, so the strum ended long ago; poll a few probes in case it hasn't.
LIVE=$(field "$M" "['voices']['liveSpatial']" 2>/dev/null)
for attempt in 1 2 3 4 5; do
  [ "$LIVE" = "0" ] && break
  LIVE=$(field "$(probe)" "['voices']['liveSpatial']" 2>/dev/null)
done
[ "$LIVE" = "0" ] && pass "once the solve's notes have rung out, no spatial note is left ringing (liveSpatial $LIVE)" ||
  fail "once the solve's notes have rung out, no spatial note is left ringing (liveSpatial $LIVE)"

# Out of XR, IWSDK suspends the shared context while the study keeps humming: idle past an ambience
# interval, then click. A cue asked for meanwhile must start no note (it would wait for the click).
xr_stop
C=$(iw browser run tests/e2e/audio-click.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))" 2>/dev/null)
ASKED=$(field "$C" "['asked']" 2>/dev/null); STARTED=$(field "$C" "['startedSuspended']" 2>/dev/null)
HUMS=$(echo "$ASKED" | python3 -c "import sys,json;print(json.load(sys.stdin).count('ambience'))" 2>/dev/null || echo 0)
[ "${HUMS:-0}" -ge 1 ] && [ "$STARTED" = "0" ] &&
  pass "idle out of XR, the cues asked for ($ASKED) start no note on the suspended context ($STARTED started)" ||
  fail "idle out of XR, the cues asked for ($ASKED) start no note on the suspended context ($STARTED started)"
BEFORE=$(field "$C" "['before']" 2>/dev/null); AFTER=$(field "$C" "['after']" 2>/dev/null)
[ "$AFTER" = "running" ] && pass "after leaving XR (sound $BEFORE), one canvas click brings it back ($AFTER)" ||
  fail "after leaving XR (sound $BEFORE), one canvas click brings it back ($AFTER)"
exit $FAIL
