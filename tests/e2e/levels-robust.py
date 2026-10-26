"""Ticket 20: bookkeeping for tests/e2e/levels-robust.sh.

  row <which> <slow> <run>   reads one `browser run` reply of levels-robust.e2e.mjs on stdin, prints a
                             progress line to stderr and one JSON line per pose to stdout.
  table <rows file> <runs>   prints each level's pass rate per condition; exits 1 unless every
                             level solved <runs> of <runs> in every condition.
"""
import json
import sys

SPEEDS = {'0': 'normal', '1': 'slow'}
POSES = ['study', 'table 0', 'table 90']


def row(which: str, slow: str, run: str) -> None:
    raw = sys.stdin.read()
    try:
        reply = json.loads(raw)
        result = reply['data']['result'] if reply.get('ok') else None
    except (ValueError, KeyError, TypeError):
        result = None
    if not result:
        # A lease that never finished counts as a failed drop in every pose.
        print(f'ERROR {which} {SPEEDS[slow]} run {run}: {raw[:300]}', file=sys.stderr)
        for pose in POSES:
            print(json.dumps({'which': which, 'level': which, 'speed': SPEEDS[slow], 'pose': pose, 'solved': False, 'error': True}))
        return
    parts = []
    for pose in POSES:
        drop = result['poses'][pose]
        parts.append(f"{pose} {'PASS' if drop['solved'] else 'FAIL'} {drop['seconds']}s")
        print(json.dumps({'which': which, 'level': result['level'], 'speed': SPEEDS[slow], 'pose': pose, **drop}))
    print(f"{result['level']} {SPEEDS[slow]} run {run}: " + ', '.join(parts), file=sys.stderr)


def table(path: str, runs: int) -> None:
    cells = {}
    levels = {}
    failures = []
    with open(path) as rows:
        for line in rows:
            r = json.loads(line)
            key = (r['which'], f"{r['speed']} {r['pose']}")
            levels[r['which']] = r['level'] if not r.get('error') else levels.get(r['which'], r['which'])
            cells.setdefault(key, []).append(r['solved'])
            if not r['solved']:
                failures.append(r)
    # Only the speeds that ran (SPEEDS may pick one).
    ran = {key[1] for key in cells}
    conditions = [c for c in (f'{speed} {pose}' for speed in SPEEDS.values() for pose in POSES) if c in ran]
    print('level'.ljust(16) + ''.join(c.rjust(17) for c in conditions))
    below = 0
    for which, level in levels.items():
        line = level.ljust(16)
        for c in conditions:
            got = cells.get((which, c), [])
            rate = f'{sum(got)}/{runs}'
            if sum(got) < runs:
                below += 1
                rate = '*' + rate
            line += rate.rjust(17)
        print(line)
    for f in failures:
        where = 'lease error' if f.get('error') else json.dumps(f.get('marbles'))[:300]
        print(f"FAILED {f['level']} {f['speed']} {f['pose']}: {where}")
    print(f'{below} level conditions below {runs}/{runs}' if below else f'every level solved {runs}/{runs} in every condition')
    sys.exit(1 if below else 0)


if __name__ == '__main__':
    if sys.argv[1] == 'row':
        row(*sys.argv[2:5])
    else:
        table(sys.argv[2], int(sys.argv[3]))
