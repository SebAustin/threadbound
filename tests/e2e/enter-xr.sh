#!/bin/zsh
# Enter XR never misses (week 8 ticket 08): a long, drifting mouse press on the welcome card's
# Enter XR starts an emulated session, does so again after the session ends, and the DOM
# #enter-xr button starts one from the keyboard alone. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
# step <press|key|state>: run one enter-xr.e2e.mjs step; prints its result, exit 0 when it reports ok.
step() {
  STEP=$1 iw browser run tests/e2e/enter-xr.e2e.mjs 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except ValueError:
    print('no result'); sys.exit(1)
r = d.get('data', {}).get('result') if d.get('ok') else d.get('error')
print(json.dumps(r, separators=(',', ':')))
sys.exit(0 if d.get('ok') and r.get('ok') else 1)"
}

fresh_page || { fail "the page loads"; exit 1; }
R=$(step press) && settle session && pass "an 800 ms press drifting 3 px on the card's Enter XR starts a session ($R)" ||
  fail "an 800 ms press drifting 3 px on the card's Enter XR starts a session ($R)"
xr_stop
R=$(step state) && pass "after the session ends, the card and #enter-xr offer Enter XR again ($R)" ||
  fail "after the session ends, the card and #enter-xr offer Enter XR again ($R)"
R=$(step press) && settle session && pass "a second long press enters again ($R)" || fail "a second long press enters again ($R)"
xr_stop

fresh_page || { fail "the page loads again"; exit 1; }
R=$(step key) && settle session && pass "Enter on the focused #enter-xr starts a session, no canvas involved ($R)" ||
  fail "Enter on the focused #enter-xr starts a session, no canvas involved ($R)"
xr_stop
exit $FAIL
