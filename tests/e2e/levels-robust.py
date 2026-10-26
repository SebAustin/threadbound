"""Ticket 20: bookkeeping for tests/e2e/levels-robust.sh (tested by tests/unit/levelsRobust.test.ts).

  check <runs> <speeds> <level> ...          exits 2 unless <runs> is a whole number of at least 1,
                                             <speeds> lists only 0 (normal) and 1 (slow), and every
                                             level is campaign:<index> or daily:<index>.
  row <which> <slow> <run>                   reads one `browser run` reply of levels-robust.e2e.mjs on
                                             stdin, prints a progress line to stderr and one JSON line
                                             per pose to stdout. A reply it can't read, for any reason,
                                             counts as a failed drop in every pose.
  table <rows file> <runs> <speeds> <level> ...
                                             prints each requested level's pass rate per condition.
                                             A condition without <runs> solved drops, missing rows
                                             included, is below. Exits 1 if any is, or if no drop was
                                             recorded at all.
"""
import json
import re
import sys

SPEEDS = {'0': 'normal', '1': 'slow'}
POSES = ['study', 'table 0', 'table 90']
LEVEL = re.compile(r'(campaign|daily):\d+')


def check(runs: str, speeds: str, levels: list) -> None:
    problems = []
    if not runs.isdigit() or int(runs) < 1:
        problems.append(f'RUNS must be a whole number of at least 1, not {runs!r}')
    if not speeds.split() or any(s not in SPEEDS for s in speeds.split()):
        problems.append(f'SPEEDS lists 0 (normal) and 1 (slow), space-separated, not {speeds!r}')
    if not levels:
        problems.append('no level to run')
    problems += [f'a level is campaign:<index> or daily:<index>, not {level!r}' for level in levels if not LEVEL.fullmatch(level)]
    for problem in problems:
        print(problem, file=sys.stderr)
    sys.exit(2 if problems else 0)


def pose_rows(which: str, speed: str, raw: str) -> tuple:
    """The reply's level id and one row per pose; raises on any reply that isn't a full result."""
    if speed not in SPEEDS.values():
        raise ValueError(f'unknown speed {speed!r}')
    reply = json.loads(raw)
    if not reply.get('ok'):
        raise ValueError('the lease did not finish')
    result = reply['data']['result']
    rows = []
    for pose in POSES:
        drop = result['poses'][pose]
        rows.append({'which': which, 'level': result['level'], 'speed': speed, 'pose': pose,
                     'solved': drop['solved'] is True, 'seconds': drop.get('seconds'), 'marbles': drop.get('marbles')})
    return result, rows


def row(which: str, slow: str, run: str) -> None:
    speed = SPEEDS.get(slow, slow)
    raw = sys.stdin.read()
    try:
        result, rows = pose_rows(which, speed, raw)
    except Exception as error:  # noqa: BLE001 -- any unreadable reply is a failed drop, never a crash
        print(f'ERROR {which} {speed} run {run}: {error!r} {raw[:300]}', file=sys.stderr)
        rows = [{'which': which, 'level': which, 'speed': speed, 'pose': pose, 'solved': False, 'error': True} for pose in POSES]
    else:
        drops = ', '.join(f"{r['pose']} {'PASS' if r['solved'] else 'FAIL'} {r['seconds']}s" for r in rows)
        self_solved = ' (SELF-SOLVED untouched)' if result.get('selfSolved') else ''
        print(f"{result['level']} {speed} run {run}: {drops}{self_solved}", file=sys.stderr)
    for r in rows:
        print(json.dumps(r))


def read_rows(path: str) -> tuple:
    cells, names, failures = {}, {}, []
    with open(path) as rows:
        for line in rows:
            r = json.loads(line)
            cells.setdefault((r['which'], f"{r['speed']} {r['pose']}"), []).append(r['solved'])
            if not r.get('error'):
                names[r['which']] = r['level']
            if not r['solved']:
                failures.append(r)
    return cells, names, failures


def table(path: str, runs: int, speeds: str, wanted: list) -> None:
    cells, names, failures = read_rows(path)
    if not cells:
        print('no drop was recorded')
        sys.exit(1)
    conditions = [f'{SPEEDS[s]} {pose}' for s in speeds.split() for pose in POSES]
    print('level'.ljust(16) + ''.join(c.rjust(17) for c in conditions))
    below = 0
    for which in wanted:
        line = names.get(which, which).ljust(16)
        for c in conditions:
            got = cells.get((which, c), [])
            rate = f'{sum(got)}/{runs}'
            if len(got) != runs or not all(got):
                below += 1
                rate = '*' + rate
            line += rate.rjust(17)
        print(line)
    for f in failures:
        where = 'lease error' if f.get('error') else json.dumps(f.get('marbles'))[:300]
        print(f"FAILED {names.get(f['which'], f['which'])} {f['speed']} {f['pose']}: {where}")
    print(f'{below} level conditions below {runs}/{runs}' if below else f'every level solved {runs}/{runs} in every condition')
    sys.exit(1 if below else 0)


if __name__ == '__main__':
    command, args = sys.argv[1], sys.argv[2:]
    if command == 'check':
        check(args[0], args[1] if len(args) > 1 else '', args[2:])
    elif command == 'row':
        row(*args[:3])
    else:
        table(args[0], int(args[1]), args[2], args[3:])
