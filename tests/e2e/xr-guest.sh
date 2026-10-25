#!/bin/zsh
# Guest play in an emulated Quest 3 session (week 8 ticket 09). With a solved save on the device, the
# page opened with ?fresh=1 enters XR on level 1, the ghost hand demonstrating pinch-pull; level 1 is
# solved by hand pinches only, and the saved progress and settings stay byte-identical. xr_start's
# reload (location.reload()) keeps the query. The plain URL is restored on any exit, because run.sh's
# fresh_page keeps the query too and a guest page left behind would break every later persistence
# check; the last check is that it was, with the seeded save and settings cleaned up. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh

# guest_nav <search> [SEED=1] [CLEAN=1]: tests/e2e/guest-nav.e2e.mjs -> { search, cleaned, savedProgress, savedSettings }.
guest_nav() { SEARCH=$1 iw browser run tests/e2e/guest-nav.e2e.mjs 2>/dev/null | python3 -c "import sys,json;print(json.dumps(json.load(sys.stdin)['data']['result']))"; }
# same_save <seed json> <probe json>: exit 0 when both saved values match the seed byte for byte; prints them.
same_save() {
  A=$1 B=$2 python3 -c "
import os,json
a=json.loads(os.environ['A']); b=json.loads(os.environ['B'])
keys=('savedProgress','savedSettings')
print(json.dumps({k:(b.get(k) or '')[:60] for k in keys}))
exit(0 if a['savedProgress'] and all(a[k]==b.get(k) for k in keys) else 1)"
}

PLAIN=''
back_to_plain() {
  [ -n "$PLAIN" ] && return
  xr_stop
  PLAIN=$(CLEAN=1 guest_nav '')
  [ -n "$PLAIN" ] || PLAIN='{}'
}
trap back_to_plain EXIT
trap 'back_to_plain; exit 1' INT TERM

S=$(SEED=1 guest_nav '?fresh=1')
[ "$(field "$S" "['search']")" = "?fresh=1" ] && pass "with a solved save on the device, the page opens with ?fresh=1" ||
  fail "with a solved save on the device, the page opens with ?fresh=1 ($S)"
xr_start
P=$(probe)
G=$(field "$P" "['ghost']"); I=$(field "$P" "['levelIndex']")
[ "$I" = "0" ] && echo "$G" | grep -q '"step": "pinch-pull", "visible": true' &&
  pass "the guest enters XR on level 1, the ghost hand showing pinch-pull (level $I, $G)" ||
  fail "the guest enters XR on level 1, the ghost hand showing pinch-pull (level $I, $G)"
pinch_pull "$(field "$P" "['knobs']['a']")" "$(field "$P" "['knobs']['b']")"
pinch_at "$(field "$P" "['chute']")"
wait_solved && pass "the guest solves level 1 with hand pinches only" || fail "the guest solves level 1 with hand pinches only ($(field "$(probe)" "['status']"))"
V=$(same_save "$S" "$(probe)") && pass "the saved progress and settings stay byte-identical ($V)" ||
  fail "the saved progress and settings stay byte-identical ($V)"

back_to_plain
SEARCH_NOW=$(field "$PLAIN" "['search']" 2>/dev/null)
CLEANED=$(field "$PLAIN" "['cleaned']" 2>/dev/null)
[ "$SEARCH_NOW" = "" ] && echo "$PLAIN" | grep -q '"search": ""' && [ "$CLEANED" = "true" ] &&
  pass "the page is back on the plain URL with a fresh save, slow motion off and offset 0/0" ||
  fail "the page is back on the plain URL with a fresh save, slow motion off and offset 0/0 ($PLAIN)"
exit $FAIL
