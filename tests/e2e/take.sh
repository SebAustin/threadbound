#!/bin/zsh
# Video kit: perform one shot's gesture once `zsh tests/e2e/shot.sh <shot>` has printed
# "start recording". shot.sh aimed the right hand; a take only glides it (position-only
# `xr animate-to`, see glide_* in xr-lib.sh) and pinches. It ends once the drop has
# solved, so stop recording when it prints "take done". Exit 1 if the drop doesn't solve.
# Scripted: three-cups, daily, settings, cold-open (the rest come with the final takes).
# Usage: zsh tests/e2e/take.sh <shot>
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
SHOT=${1:?usage: zsh tests/e2e/take.sh <shot>}
P=$(probe)
CHUTE=$(field "$P" "['chute']")
REST_YAW=$(field "$P" "['yaw']")
# drop: pinch the chute and wait for the solve.
drop() { glide_pinch_at "$CHUTE"; wait_solved || { echo "take $SHOT: the drop did not solve"; exit 1; }; }
case "$SHOT" in
  three-cups | daily) drop ;;
  settings)
    glide_pinch_at "$(field "$P" "['slowToggle']")"
    drop
    glide_pinch_at "$(field "$P" "['raiseToggle']")"
    ;;
  cold-open)
    glide_pinch_pull "$(field "$P" "['knobs']['c']")" "$(field "$P" "['knobs']['d']")"
    drop
    ;;
  *) echo "no scripted take for '$SHOT' (scripted: three-cups, daily, settings, cold-open)"; exit 1 ;;
esac
echo "take $SHOT done: stop recording"
