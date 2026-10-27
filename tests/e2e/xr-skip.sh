#!/bin/zsh
# The skip in an emulated Quest 3 session, by hand pinches only (week 8 ticket 13). From a fresh save,
# three chute pinches on level 1 with nothing hung all miss; each drop is waited out (probe settle).
# The settings face's Skip is offered only after the third. Pinching the settings button, then Skip,
# moves on to level 2 with level 1 saved as skipped. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
xr_start
P=$(probe fresh)
[ "$(field "$P" "['levelId']")" = "w1-01" ] && [ "$(field "$P" "['skipped']")" = "[]" ] &&
  pass "from a fresh save the session opens on level 1 with nothing skipped" ||
  fail "from a fresh save the session opens on level 1 with nothing skipped ($(field "$P" "['levelId']"), $(field "$P" "['skipped']"))"
OFFERS=()
for n in 1 2 3; do
  pinch_at "$(field "$P" "['chute']")"
  P=$(probe settle)
  OFFERS+="$(field "$P" "['status']"):$(field "$P" "['skipOffered']")"
done
SEEN="${OFFERS[*]}"
[ "$SEEN" = "idle:false idle:false idle:true" ] && pass "Skip is offered only after the third missed drop ($SEEN)" ||
  fail "Skip is offered only after the third missed drop ($SEEN)"
pinch_at "$(field "$P" "['buttons']['settings']")"
sleep 0.5 # let the settings face lay out
P=$(probe)
[ "$(field "$P" "['face']")" = "settings" ] && pass "pinching the settings button opens the settings face" || fail "pinching the settings button opens the settings face ($(field "$P" "['face']"))"
pinch_at "$(field "$P" "['skipToggle']")"
P=$(probe)
L=$(field "$P" "['levelId']"); K=$(field "$P" "['skipped']")
[ "$L" = "w1-02" ] && [ "$K" = '["w1-01"]' ] && pass "pinching Skip moves on to w1-02 with w1-01 skipped" || fail "pinching Skip moves on to w1-02 with w1-01 skipped ($L, $K)"
probe fresh >/dev/null
xr_stop
exit $FAIL
