#!/bin/zsh
# Week 8 ticket 18: a stored solution solves on the emulator's dining table, turned about
# 90 degrees, in shot.sh's seated passthrough pose. Each level opens in the browser view,
# then the seated pose is entered (headset at (-0.85, 1.15, 0.2) looking at the table, a
# second `xr enter` so placement runs from there), and `probe solve` hangs the solution and
# drops. Defaults: Relay (w1-04) and daily pools 1, 3 and 6, the four that ended idle before
# ticket 18. Usage: zsh tests/e2e/xr-seated-solve.sh [w1-04 daily:1 ...]. Exit 1 on any failure.
cd "$(dirname "$0")/../.."
source tests/e2e/xr-lib.sh
targets=("$@"); (( ${#targets} )) || targets=(w1-04 daily:1 daily:3 daily:6)

# seat: shot.sh's seated pose, entered from the browser view.
seat() {
  iw xr enter --input-json '{}' >/dev/null 2>&1
  iw xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
  iw xr set-transform --input-json '{"device":"headset","position":{"x":-0.85,"y":1.15,"z":0.2}}' >/dev/null 2>&1
  iw xr look-at --input-json '{"device":"headset","target":{"x":-1.5,"y":0.79,"z":0.2}}' >/dev/null 2>&1
  xr_stop
  iw xr enter --input-json '{}' >/dev/null 2>&1
  settle session
}

for target in $targets; do
  fresh_page
  case $target in
    daily:*) OPENED=$(DAILY=${target#daily:} iw browser run tests/e2e/xr-seated-open.e2e.mjs 2>&1) ;;
    *) OPENED=$(LEVEL=$target iw browser run tests/e2e/xr-seated-open.e2e.mjs 2>&1) ;;
  esac
  echo "$OPENED" | grep -q '"levelId"' || { fail "$target did not open: ${OPENED:0:300}"; continue; }
  seat
  P=$(probe solve)
  SUMMARY=$(echo "$P" | python3 -c "import sys,json;p=json.load(sys.stdin);print(json.dumps({k:p[k] for k in ('levelId','status','yaw')}|{'placedOn':p['placement']['placedOn'],'notes':len(p['melodyNotes'])}))")
  if echo "$P" | python3 -c "import sys,json;p=json.load(sys.stdin);sys.exit(0 if p['status']=='complete' and p['placement']['placedOn']=='table' and abs(p['yaw']-1.5708)<0.01 else 1)"; then
    pass "$target solves seated at the table: $SUMMARY"
  else
    fail "$target does not solve seated at the table: $SUMMARY"
  fi
  xr_stop
done
exit $FAIL
