#!/bin/zsh
# Placement that holds up (week 8 ticket 07), in an emulated Quest 3 passthrough session in
# IWER's living room, seated at its dining table:
# - entering AR keeps the diorama hidden, its ledge strip and the ghost hand included, until it
#   is placed on the table (one place on the command bus, planes seen);
# - a recenter (the reference space's 'reset') hides it and places it again, the player's
#   thread intact, and the next pinch-pull works;
# - a recenter that arrives while the page is hidden places nothing until the page shows;
# - a floating diorama asks for Space Setup on the ledge and draws no contact shadow.
# IWER can't show a recenter's misalignment: this proves the chain from 'reset' to the search
# to 'place', not the alignment on a device. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
NO_TABLE_HINT='No table found - run Space Setup'
# How long a recenter made while the page is hidden must place nothing.
HIDDEN_WAIT_S=5

# watch <start|read>: tests/e2e/placement-watch.e2e.mjs, which samples what the player could see.
watch() { WATCH=$1 iw browser run tests/e2e/placement-watch.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))"; }
# hidden_until_placed <watch log json> <place count once placed>: prints the evidence; exit 0 when,
# from the first hidden sample until that place, nothing showed (diorama hidden at reveal 0, no
# ledge strip, no ghost hand), and the diorama then showed with its strip, fully faded in.
hidden_until_placed() {
  echo "$1" | N=$2 python3 -c "
import sys,json,os
log=json.load(sys.stdin)['log'] or []; n=int(os.environ['N'])
start=next((i for i,e in enumerate(log) if e['hidden']),None)
if start is None: print(json.dumps({'neverHidden':log[-3:]})); sys.exit(1)
before=[e for e in log[start:] if e['placements']<n]
shown=[e for e in before if not e['hidden'] or e['reveal']!=0 or e['ledge'] or e['ghost']]
last=log[-1]
placed=next((e for e in log[start:] if e['placements']>=n),None)
ok=bool(before) and not shown and last['placements']==n and not last['hidden'] and last['reveal']==1 and last['ledge'] is True
print(json.dumps({'hiddenMs':placed['ms']-log[start]['ms'] if placed else None,'shownEarly':shown[:2],'last':last}))
sys.exit(0 if ok else 1)"
}
has_thread() { echo "$1" | grep -q "\"from\": \"$2\", \"to\": \"$3\""; }

xr_start
# Sit at the emulated room's dining table (0.79 m high), facing it, and enter passthrough again
# so the search runs from a seated pose (as xr-full-level.sh does).
iw xr set-transform --input-json '{"device":"headset","position":{"x":-0.85,"y":1.15,"z":0.2}}' >/dev/null 2>&1
iw xr look-at --input-json '{"device":"headset","target":{"x":-1.5,"y":0.79,"z":0.2}}' >/dev/null 2>&1
iw xr exit --input-json '{}' >/dev/null 2>&1
probe load0 >/dev/null
watch start >/dev/null
iw xr enter --input-json '{}' >/dev/null 2>&1
settle session || fail "the seated session settles with the diorama faded in"
L=$(watch read); P=$(probe)
V=$(hidden_until_placed "$L" 1) && pass "entering AR keeps the diorama, its ledge strip and the ghost hand hidden until it is placed ($V)" ||
  fail "entering AR keeps the diorama, its ledge strip and the ghost hand hidden until it is placed ($V)"
WHERE=$(field "$P" "['placement']['placedOn']"); N=$(field "$P" "['placement']['placements']"); PLANES=$(field "$P" "['placement']['planesSeen']")
[ "$WHERE" = "table" ] && [ "$N" = "1" ] && [ "${PLANES:-0}" -gt 0 ] && pass "it lands on the living room's table: 1 place, $PLANES planes seen" ||
  fail "it lands on the living room's table: 1 place, planes seen ($WHERE, $N places, $PLANES planes)"

# A thread, then a recenter with the head turned 120 degrees away from the table.
pinch_pull "$(field "$P" "['knobs']['a']")" "$(field "$P" "['knobs']['b']")"
has_thread "$(field "$(probe)" "['threads']")" a b || fail "a thread a->b before the recenter"
iw xr look-at --input-json '{"device":"headset","target":{"x":-0.35,"y":0.79,"z":1.07}}' >/dev/null 2>&1
watch start >/dev/null
probe recenter >/dev/null
settle session || fail "the recentered session settles with the diorama faded in"
L=$(watch read); P=$(probe)
V=$(hidden_until_placed "$L" 2) && pass "a recenter hides the diorama and places it again: a second place on the bus ($V)" ||
  fail "a recenter hides the diorama and places it again: a second place on the bus ($V)"
T=$(field "$P" "['threads']")
has_thread "$T" a b && pass "the thread survives the recenter ($(field "$P" "['placement']['placedOn']"))" || fail "the thread survives the recenter ($T)"
pinch_pull "$(field "$P" "['knobs']['b']")" "$(field "$P" "['knobs']['c']")"
T=$(field "$(probe)" "['threads']")
has_thread "$T" b c && pass "the next pinch-pull works after the recenter" || fail "the next pinch-pull works after the recenter ($T)"

# A recenter while the page is hidden: the search waits for the player to see it again.
probe hide >/dev/null
probe recenter >/dev/null
sleep $HIDDEN_WAIT_S
H=$(probe); HN=$(field "$H" "['placement']['placements']")
probe show >/dev/null
settle session || fail "the session settles once the page shows"
S=$(probe); SN=$(field "$S" "['placement']['placements']")
[ "$(field "$H" "['placement']['hidden']")" = "true" ] && [ "$HN" = "2" ] && [ "$SN" = "3" ] &&
  pass "a recenter while the page is hidden places nothing for ${HIDDEN_WAIT_S} s, then once it shows ($HN then $SN places)" ||
  fail "a recenter while the page is hidden places nothing for ${HIDDEN_WAIT_S} s, then once it shows ($HN then $SN places, hidden $(field "$H" "['placement']['hidden']"))"

# Floating: level 2 has no onboarding or level hint, so the ledge says what is missing.
probe load1 >/dev/null
F=$(probe float); HINT=$(field "$F" "['ledge']['text']['hint']"); SHADOW=$(field "$F" "['shadow']")
[ "$HINT" = "$NO_TABLE_HINT" ] && [ "$SHADOW" = "false" ] && [ "$(field "$F" "['hint']")" = "$NO_TABLE_HINT" ] &&
  pass "a floating diorama shows '$NO_TABLE_HINT' on the ledge and no contact shadow" ||
  fail "a floating diorama shows '$NO_TABLE_HINT' on the ledge and no contact shadow (hint '$HINT', shadow $SHADOW)"
xr_stop
exit $FAIL
