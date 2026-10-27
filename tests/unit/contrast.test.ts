import { describe, expect, test } from 'vitest';
import { contrastRatio, deltaE2000, simulateCvd, type CvdKind, type Lab } from '../../src/lib/contrast';
import { dioramaPalette, plaqueColors, type PaintName } from '../../src/lib/colors';

const CVD: readonly CvdKind[] = ['protan', 'deutan', 'tritan'];

/** CIEDE2000 under normal vision and under each simulated deficiency (Machado 2009, severity 1). */
function separations(a: string, b: string): { normal: number } & Record<CvdKind, number> {
  return {
    normal: deltaE2000(a, b),
    protan: deltaE2000(simulateCvd(a, 'protan'), simulateCvd(b, 'protan')),
    deutan: deltaE2000(simulateCvd(a, 'deutan'), simulateCvd(b, 'deutan')),
    tritan: deltaE2000(simulateCvd(a, 'tritan'), simulateCvd(b, 'tritan')),
  };
}

/**
 * Sharma, Wu and Dalal (2005), "The CIEDE2000 color-difference formula: implementation notes,
 * supplementary test data, and mathematical observations", Table 1: L1 a1 b1, L2 a2 b2, dE00.
 */
const SHARMA: readonly (readonly [number, number, number, number, number, number, number])[] = [
  [50.0, 2.6772, -79.7751, 50.0, 0.0, -82.7485, 2.0425],
  [50.0, 3.1571, -77.2803, 50.0, 0.0, -82.7485, 2.8615],
  [50.0, 2.8361, -74.02, 50.0, 0.0, -82.7485, 3.4412],
  [50.0, -1.3802, -84.2814, 50.0, 0.0, -82.7485, 1.0],
  [50.0, -1.1848, -84.8006, 50.0, 0.0, -82.7485, 1.0],
  [50.0, -0.9009, -85.5211, 50.0, 0.0, -82.7485, 1.0],
  [50.0, 0.0, 0.0, 50.0, -1.0, 2.0, 2.3669],
  [50.0, -1.0, 2.0, 50.0, 0.0, 0.0, 2.3669],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0009, 7.1792],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.001, 7.1792],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0011, 7.2195],
  [50.0, 2.49, -0.001, 50.0, -2.49, 0.0012, 7.2195],
  [50.0, -0.001, 2.49, 50.0, 0.0009, -2.49, 4.8045],
  [50.0, -0.001, 2.49, 50.0, 0.001, -2.49, 4.8045],
  [50.0, -0.001, 2.49, 50.0, 0.0011, -2.49, 4.7461],
  [50.0, 2.5, 0.0, 50.0, 0.0, -2.5, 4.3065],
  [50.0, 2.5, 0.0, 73.0, 25.0, -18.0, 27.1492],
  [50.0, 2.5, 0.0, 61.0, -5.0, 29.0, 22.8977],
  [50.0, 2.5, 0.0, 56.0, -27.0, -3.0, 31.903],
  [50.0, 2.5, 0.0, 58.0, 24.0, 15.0, 19.4535],
  [50.0, 2.5, 0.0, 50.0, 3.1736, 0.5854, 1.0],
  [50.0, 2.5, 0.0, 50.0, 3.2972, 0.0, 1.0],
  [50.0, 2.5, 0.0, 50.0, 1.8634, 0.5757, 1.0],
  [50.0, 2.5, 0.0, 50.0, 3.2592, 0.335, 1.0],
  [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
  [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263],
  [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731],
  [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
  [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
  [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
  [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
  [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
  [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
  [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
];

describe('contrastRatio (WCAG 2.x)', () => {
  test('black on white is 21:1, either way round', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 10);
  });

  test('any colour on itself is 1:1', () => {
    for (const hex of ['#000000', '#ffffff', '#3d2f2a', '#f2c14e', '#ff96a8']) expect(contrastRatio(hex, hex)).toBe(1);
  });
});

describe('deltaE2000', () => {
  test("matches Sharma et al.'s 34 published test pairs within 1e-4", () => {
    for (const [L1, a1, b1, L2, a2, b2, want] of SHARMA) {
      const one: Lab = { L: L1, a: a1, b: b1 };
      const two: Lab = { L: L2, a: a2, b: b2 };
      expect(Math.abs(deltaE2000(one, two) - want), `${L1} ${a1} ${b1} / ${L2} ${a2} ${b2}`).toBeLessThan(1e-4);
      expect(Math.abs(deltaE2000(two, one) - want)).toBeLessThan(1e-4);
    }
  });

  test('a colour against itself is 0', () => {
    expect(deltaE2000('#ff6f1a', '#ff6f1a')).toBe(0);
  });
});

describe('the audit, reproduced (week 8 gap analysis, gaps 15 and 66)', () => {
  test('a lit star on the old solved header is 1.93:1, the title 2.93:1', () => {
    expect(contrastRatio('#f2c14e', '#b8862f')).toBeCloseTo(1.93, 2);
    expect(contrastRatio('#fbf3e4', '#b8862f')).toBeCloseTo(2.93, 2);
  });

  test('a star ring on the playing header is 6.49:1', () => {
    expect(contrastRatio('#d9b45a', '#3d2f2a')).toBeCloseTo(6.49, 2);
  });

  test('amber vs the old thread is 13.9 (7.3 deutan, 1.8 tritan)', () => {
    const old = separations('#ff6f1a', '#ff6b5a');
    expect(old.normal).toBeCloseTo(13.9, 1);
    expect(old.deutan).toBeCloseTo(7.3, 1);
    expect(old.tritan).toBeCloseTo(1.8, 1);
  });

  test('an amber glyph on a brass chute is 1.15:1', () => {
    expect(contrastRatio('#ff6f1a', '#c9a14a')).toBeCloseTo(1.15, 2);
  });
});

describe('simulateCvd (Machado 2009, severity 1, linear sRGB)', () => {
  test('greys stay grey and black and white stay put', () => {
    for (const kind of CVD) {
      for (const hex of ['#000000', '#ffffff']) {
        const { r, g, b } = simulateCvd(hex, kind);
        expect(Math.abs(r - g) + Math.abs(g - b)).toBeLessThan(2e-3);
      }
    }
  });

  test('protan and deutan pull red and green together; tritan keeps them apart', () => {
    const redGreen = (kind: CvdKind) => deltaE2000(simulateCvd('#d03030', kind), simulateCvd('#30a030', kind));
    expect(redGreen('protan')).toBeLessThan(deltaE2000('#d03030', '#30a030') / 2);
    expect(redGreen('deutan')).toBeLessThan(deltaE2000('#d03030', '#30a030') / 2);
    expect(redGreen('tritan')).toBeGreaterThan(redGreen('deutan'));
  });
});

const PLAY = dioramaPalette(false);
const BOLD = dioramaPalette(true);
const PLAQUE = plaqueColors(false);
const PLAQUE_BOLD = plaqueColors(true);
const color = (palette: typeof PLAY, name: PaintName) => palette[name].color;
const ratio = (fg: string, bg: string) => contrastRatio(fg, bg);

/** Every text colour on the plaque and the ledge strip, with the backgrounds it is drawn on. */
function plaqueTextPairs(p: typeof PLAQUE): [string, string, string][] {
  return [
    ['title, playing', p.title, p.headerPlaying],
    ['title, solved', p.title, p.headerSolved],
    ['world label, playing', p.world, p.headerPlaying],
    ['world label, solved', p.world, p.headerSolved],
    ['face title', p.faceTitle, p.plaque],
    ['readout', p.readout, p.plaque],
    ['toggle', p.toggleText, p.toggle],
    ['toggle, hovered', p.toggleText, p.toggleHover],
    ['toggle, pressed', p.toggleText, p.toggleActive],
    ['ledge hint', p.ledgeHint, p.ledge],
    ['ledge count', p.ledgeDetail, p.ledge],
  ];
}

describe('default colours (src/lib/colors.ts)', () => {
  test('the solved header is darker, so lit stars reach 3:1 on both headers', () => {
    for (const header of [PLAQUE.headerPlaying, PLAQUE.headerSolved]) expect(ratio(PLAQUE.starOn, header)).toBeGreaterThanOrEqual(3);
  });

  test('the title is at least 4.5:1 on both headers, and so is the rest of the plaque text', () => {
    for (const [name, fg, bg] of plaqueTextPairs(PLAQUE)) expect(ratio(fg, bg), name).toBeGreaterThanOrEqual(4.5);
  });

  test('amber vs the player thread: at least 20 in normal vision, 10 under each simulation', () => {
    const s = separations(color(PLAY, 'marbleAmber'), color(PLAY, 'thread'));
    expect(s.normal).toBeGreaterThanOrEqual(20);
    for (const kind of CVD) expect(s[kind], kind).toBeGreaterThanOrEqual(10);
  });

  test('amber vs azure stays at least 40 under each simulation', () => {
    const s = separations(color(PLAY, 'marbleAmber'), color(PLAY, 'marbleAzure'));
    for (const kind of CVD) expect(s[kind], kind).toBeGreaterThanOrEqual(40);
  });

  test('teal vs the player thread is at least 10 under each simulation', () => {
    const s = separations(color(PLAY, 'marble'), color(PLAY, 'thread'));
    for (const kind of CVD) expect(s[kind], kind).toBeGreaterThanOrEqual(10);
  });

  test('the drag preview stays visibly different from the thread (at least 10)', () => {
    expect(deltaE2000(color(PLAY, 'thread'), color(PLAY, 'threadPreview'))).toBeGreaterThanOrEqual(10);
  });

  test('the thread is at least 3:1 on the walnut back panel', () => {
    expect(color(PLAY, 'backPanel')).toBe(color(PLAY, 'walnut'));
    expect(ratio(color(PLAY, 'thread'), color(PLAY, 'backPanel'))).toBeGreaterThanOrEqual(3);
  });

  test('glyph backings are hidden, so the default mode draws nothing extra', () => {
    expect(PLAY.glyphBacking.visible).toBe(false);
    const shown = (Object.keys(PLAY) as PaintName[]).filter((n) => n !== 'glyphBacking');
    for (const name of shown) expect(PLAY[name].visible, name).toBe(true);
  });
});

describe('high-contrast colours (src/lib/colors.ts)', () => {
  test('all plaque text is at least 7:1', () => {
    for (const [name, fg, bg] of plaqueTextPairs(PLAQUE_BOLD)) expect(ratio(fg, bg), name).toBeGreaterThanOrEqual(7);
  });

  test('lit fills and unlit rings are at least 4.5:1 on both headers, and under a hovered or pinched ray', () => {
    const backs = [PLAQUE_BOLD.headerPlaying, PLAQUE_BOLD.headerSolved, PLAQUE_BOLD.starsHover, PLAQUE_BOLD.starsActive];
    for (const back of backs) {
      expect(ratio(PLAQUE_BOLD.starOn, back), `lit on ${back}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(PLAQUE_BOLD.starRing, back), `ring on ${back}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  const onPanel: readonly PaintName[] = [
    'brass', 'thread', 'threadPreset',
    'marble', 'marbleAmber', 'marbleAzure',
    'goal', 'goalDone', 'cupAmber', 'cupAmberFilled', 'cupAzure', 'cupAzureFilled',
    'wall',
  ];

  test('pegs, both kinds of thread, all three marbles, cup floors and walls are at least 4.5:1 on the back panel', () => {
    for (const name of onPanel) expect(ratio(color(BOLD, name), color(BOLD, 'backPanel')), name).toBeGreaterThanOrEqual(4.5);
  });

  test('ticket 11: the hot and target colours meet the bound of the part they light', () => {
    const lit: readonly PaintName[] = ['brassHot', 'brassTarget', 'threadHot', 'threadPresetHot', 'goalHot', 'creamHot'];
    for (const name of lit) expect(ratio(color(BOLD, name), color(BOLD, 'backPanel')), name).toBeGreaterThanOrEqual(4.5);
  });

  test('ticket 11: a lit part still glows at least as much as the part at rest', () => {
    const pairs = [['brass', 'brassHot'], ['brass', 'brassTarget'], ['thread', 'threadHot'], ['threadPreset', 'threadPresetHot'], ['goal', 'goalHot'], ['cream', 'creamHot']] as const;
    for (const palette of [PLAY, BOLD]) {
      for (const [rest, lit] of pairs) expect(palette[lit].glow, `${lit} over ${rest}`).toBeGreaterThanOrEqual(palette[rest].glow);
    }
  });

  test('each glyph is at least 4.5:1 on its backing, and the backing shows', () => {
    expect(BOLD.glyphBacking.visible).toBe(true);
    for (const name of ['glyphAmber', 'glyphAzure'] as const) {
      expect(ratio(color(BOLD, name), color(BOLD, 'glyphBacking')), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('the back panel goes near-black, the walls cream, and brass brightens', () => {
    expect(ratio(color(BOLD, 'backPanel'), '#000000')).toBeLessThan(1.2);
    expect(color(BOLD, 'wall')).toBe(color(PLAY, 'cream'));
    expect(ratio(color(BOLD, 'brass'), '#000000')).toBeGreaterThan(ratio(color(PLAY, 'brass'), '#000000'));
  });

  test('threads and idle cup floors glow more; the ledge and its buttons do not change', () => {
    for (const name of ['thread', 'threadPreset', 'goal', 'cupAmber', 'cupAzure'] as const) {
      expect(BOLD[name].glow, name).toBeGreaterThan(PLAY[name].glow);
    }
    for (const name of ['walnut', 'walnutFrame', 'cream', 'creamHot'] as const) expect(BOLD[name]).toEqual(PLAY[name]);
  });
});
