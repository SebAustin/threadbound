/**
 * Colour accessibility math, the method the week 8 audit used: WCAG 2.x contrast,
 * CIEDE2000 colour difference, and colour-vision-deficiency simulation (Machado,
 * Oliveira and Fernandes 2009, severity 1, applied in linear sRGB). Pure.
 */

/** sRGB channels in 0..1, gamma-encoded and unrounded (a simulated colour keeps its precision). */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** CIE L*a*b* under D65. */
export interface Lab {
  readonly L: number;
  readonly a: number;
  readonly b: number;
}

/** A colour as '#rrggbb' or as unrounded sRGB channels. */
export type Color = string | Rgb;

export type CvdKind = 'protan' | 'deutan' | 'tritan';

type Matrix = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

/** Machado 2009, severity 1.0, for linear RGB. */
const MACHADO: Readonly<Record<CvdKind, Matrix>> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Linear sRGB to CIE XYZ (D65). */
const RGB_TO_XYZ: Matrix = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const D65 = [0.95047, 1, 1.08883] as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** '#rrggbb' as sRGB channels in 0..1; throws on anything else. */
export function hexToRgb(hex: string): Rgb {
  if (!HEX_COLOR.test(hex)) throw new Error(`not a #rrggbb colour: ${hex}`);
  const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16) / 255;
  return { r: channel(1), g: channel(3), b: channel(5) };
}

const rgbOf = (color: Color): Rgb => (typeof color === 'string' ? hexToRgb(color) : color);
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const apply = (m: Matrix, [x, y, z]: readonly [number, number, number]): [number, number, number] => [
  m[0][0] * x + m[0][1] * y + m[0][2] * z,
  m[1][0] * x + m[1][1] * y + m[1][2] * z,
  m[2][0] * x + m[2][1] * y + m[2][2] * z,
];
const linearOf = (color: Color): [number, number, number] => {
  const { r, g, b } = rgbOf(color);
  return [toLinear(r), toLinear(g), toLinear(b)];
};

/** WCAG 2.x relative luminance. */
export function relativeLuminance(color: Color): number {
  const [r, g, b] = linearOf(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1 to 21, in either order. */
export function contrastRatio(a: Color, b: Color): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** How a colour looks with a full protan, deutan or tritan deficiency (unrounded sRGB). */
export function simulateCvd(color: Color, kind: CvdKind): Rgb {
  const [r, g, b] = apply(MACHADO[kind], linearOf(color)).map((c) => toGamma(clamp01(c)));
  return { r, g, b };
}

const labF = (t: number) => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29);

/** sRGB to CIE L*a*b* (D65). */
export function toLab(color: Color): Lab {
  const [fx, fy, fz] = apply(RGB_TO_XYZ, linearOf(color)).map((v, i) => labF(v / D65[i]));
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const isLab = (c: Color | Lab): c is Lab => typeof c !== 'string' && 'L' in c;
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const POW_25_7 = 25 ** 7;

/** Hue angle in degrees, 0..360 (0 for a neutral). */
const hueOf = (b: number, a: number) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) * DEG + 360) % 360);

/** CIEDE2000's mean hue of two colours (h1, h2 in degrees; either chroma zero sums them). */
function meanHue(h1: number, h2: number, chromaProduct: number): number {
  if (chromaProduct === 0) return h1 + h2;
  if (Math.abs(h1 - h2) <= 180) return (h1 + h2) / 2;
  return h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
}

/** CIEDE2000's hue difference in degrees, wrapped to -180..180 (0 when either chroma is zero). */
function hueDifference(h1: number, h2: number, chromaProduct: number): number {
  if (chromaProduct === 0) return 0;
  const d = h2 - h1;
  if (d > 180) return d - 360;
  if (d < -180) return d + 360;
  return d;
}

/** CIEDE2000 (kL = kC = kH = 1) between two colours, given as hex, sRGB or Lab. */
export function deltaE2000(one: Color | Lab, two: Color | Lab): number {
  const p = isLab(one) ? one : toLab(one);
  const q = isLab(two) ? two : toLab(two);
  const meanC = (Math.hypot(p.a, p.b) + Math.hypot(q.a, q.b)) / 2;
  const g = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + POW_25_7)));
  const a1 = (1 + g) * p.a;
  const a2 = (1 + g) * q.a;
  const c1 = Math.hypot(a1, p.b);
  const c2 = Math.hypot(a2, q.b);
  const h1 = hueOf(p.b, a1);
  const h2 = hueOf(q.b, a2);
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((hueDifference(h1, h2, c1 * c2) / 2) * RAD);
  const L = (p.L + q.L) / 2;
  const C = (c1 + c2) / 2;
  const H = meanHue(h1, h2, c1 * c2);
  const t =
    1 - 0.17 * Math.cos((H - 30) * RAD) + 0.24 * Math.cos(2 * H * RAD) + 0.32 * Math.cos((3 * H + 6) * RAD) - 0.2 * Math.cos((4 * H - 63) * RAD);
  const sL = 1 + (0.015 * (L - 50) ** 2) / Math.sqrt(20 + (L - 50) ** 2);
  const sC = 1 + 0.045 * C;
  const sH = 1 + 0.015 * C * t;
  const rT = -Math.sin(2 * 30 * Math.exp(-(((H - 275) / 25) ** 2)) * RAD) * 2 * Math.sqrt(C ** 7 / (C ** 7 + POW_25_7));
  const l = (q.L - p.L) / sL;
  const c = (c2 - c1) / sC;
  const h = dH / sH;
  return Math.sqrt(l * l + c * c + h * h + rT * c * h);
}
