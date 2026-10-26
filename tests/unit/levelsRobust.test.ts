import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';

// tests/e2e/levels-robust.sh is the pre-deploy gate for reliable levels (week 8 ticket 20). Its
// bookkeeping lives in tests/e2e/levels-robust.py; these tests run that script as the shell does,
// so a bad SPEEDS value, a reply it can't read, or a lease that left no row can't turn the gate green.
const SCRIPT = 'tests/e2e/levels-robust.py';
const POSES = ['study', 'table 0', 'table 90'];
const dir = mkdtempSync(join(tmpdir(), 'levels-robust-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function py(args: string[], input = '') {
  const out = spawnSync('python3', [SCRIPT, ...args], { input, encoding: 'utf8' });
  return { status: out.status, stdout: out.stdout, stderr: out.stderr };
}

/** A `browser run` reply of levels-robust.e2e.mjs with every pose `solved` (or not). */
function reply(solved: boolean, level = 'w4-03'): string {
  const drop = { solved, seconds: 3.1, ...(solved ? {} : { marbles: [{ x: 0.288, y: 0.013, z: 0, color: 'teal' }] }) };
  const poses = Object.fromEntries(POSES.map((pose) => [pose, drop]));
  return JSON.stringify({ ok: true, data: { result: { which: 'campaign:20', level, slow: true, selfSolved: false, poses } } });
}

const rowsOf = (stdout: string) =>
  stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { which: string; speed: string; pose: string; solved: boolean; error?: boolean });

/** Writes the rows `row` would print for one run of `which` at `slow`, all solved or not. */
function rowsFile(name: string, runs: Array<{ which: string; slow: string; solved: boolean }>): string {
  const lines = runs.map(({ which, slow, solved }) => py(['row', which, slow, '1'], reply(solved)).stdout).join('');
  const path = join(dir, name);
  writeFileSync(path, lines);
  return path;
}

describe('levels-robust.py row', () => {
  test('prints one row per pose, failed where the drop failed', () => {
    const out = py(['row', 'campaign:20', '1', '1'], reply(false));
    expect(out.status).toBe(0);
    expect(rowsOf(out.stdout).map((r) => [r.speed, r.pose, r.solved])).toEqual(POSES.map((p) => ['slow', p, false]));
  });

  test('a speed other than 0 or 1 still prints a failed row per pose', () => {
    for (const slow of ['0,1', '2']) {
      const out = py(['row', 'campaign:20', slow, '1'], reply(true));
      expect(out.status).toBe(0);
      const rows = rowsOf(out.stdout);
      expect(rows).toHaveLength(POSES.length);
      expect(rows.every((r) => r.solved === false && r.error === true)).toBe(true);
    }
  });

  test('a reply it cannot read, or one missing a pose, counts as a failed drop in every pose', () => {
    const missingPose = JSON.parse(reply(true));
    delete missingPose.data.result.poses['table 90'];
    for (const raw of ['Error: lease was lost', JSON.stringify({ ok: false }), JSON.stringify(missingPose)]) {
      const rows = rowsOf(py(['row', 'campaign:20', '0', '1'], raw).stdout);
      expect(rows).toHaveLength(POSES.length);
      expect(rows.every((r) => r.solved === false)).toBe(true);
    }
  });
});

describe('levels-robust.py table', () => {
  const both = (which: string, solved = true) => [
    { which, slow: '0', solved },
    { which, slow: '1', solved },
  ];

  test('passes when every requested level solved every run in every condition', () => {
    const path = rowsFile('green', [...both('campaign:0'), ...both('daily:1')]);
    const out = py(['table', path, '1', '0 1', 'campaign:0', 'daily:1']);
    expect(out.stdout).toContain('every level solved 1/1 in every condition');
    expect(out.status).toBe(0);
  });

  test('fails on an empty rows file', () => {
    const path = join(dir, 'empty');
    writeFileSync(path, '');
    const out = py(['table', path, '3', '0 1', 'campaign:20']);
    expect(out.status).toBe(1);
  });

  test('counts a requested level with no rows as below in every condition', () => {
    const path = rowsFile('missing-level', both('campaign:0'));
    const out = py(['table', path, '1', '0 1', 'campaign:0', 'campaign:1']);
    expect(out.stdout).toMatch(/campaign:1\s+\*0\/1/);
    expect(out.stdout).toContain('6 level conditions below 1/1');
    expect(out.status).toBe(1);
  });

  test('counts a requested speed with no rows as below', () => {
    const path = rowsFile('missing-speed', [{ which: 'campaign:0', slow: '0', solved: true }]);
    const out = py(['table', path, '1', '0 1', 'campaign:0']);
    expect(out.stdout).toContain('3 level conditions below 1/1');
    expect(out.status).toBe(1);
  });

  test('counts a condition with fewer than RUNS rows as below, even if each one solved', () => {
    const path = rowsFile('short', both('campaign:0'));
    const out = py(['table', path, '2', '0 1', 'campaign:0']);
    expect(out.status).toBe(1);
  });

  test('fails when a drop failed', () => {
    const path = rowsFile('red', [...both('campaign:0'), { which: 'campaign:1', slow: '0', solved: false }]);
    const out = py(['table', path, '1', '0', 'campaign:0', 'campaign:1']);
    expect(out.stdout).toContain('FAILED w4-03 normal study');
    expect(out.status).toBe(1);
  });
});

describe('levels-robust.py check', () => {
  test('accepts whole RUNS, speeds 0 and 1, and campaign or daily levels', () => {
    expect(py(['check', '3', '0 1', 'campaign:20', 'daily:6']).status).toBe(0);
    expect(py(['check', '10', '1', 'campaign:0']).status).toBe(0);
  });

  test('rejects anything else with exit 2', () => {
    for (const args of [
      ['check', '3', '0,1', 'campaign:20'],
      ['check', '3', '2', 'campaign:20'],
      ['check', '3', '', 'campaign:20'],
      ['check', '0', '0 1', 'campaign:20'],
      ['check', 'three', '0 1', 'campaign:20'],
      ['check', '3', '0 1', 'campaign:x'],
      ['check', '3', '0 1', 'level:3'],
      ['check', '3', '0 1'],
    ]) {
      expect(py(args).status, args.join(' ')).toBe(2);
    }
  });
});
