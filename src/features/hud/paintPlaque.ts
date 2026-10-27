import type { UIKitMLAsset } from '@iwsdk/core';
import type { PlaqueColors } from '../../lib/colors';

/** The plaque's three stars, left to right (public/ui/hud.uikitml). */
export const STAR_IDS = ['hud-star-1', 'hud-star-2', 'hud-star-3'] as const;

/**
 * The level face's colours that don't follow the puzzle: the plaque, the title row's text,
 * the stars' rings, and the stars' backing under a ray and while pinched. Set as conditional
 * properties, a repaint's hover and press colours replace the stylesheet's own (hud.uikitml
 * holds the default ones as literals).
 */
export function paintPlaque(panel: UIKitMLAsset, colors: PlaqueColors): void {
  panel.getElementById('plaque')?.setProperties({ backgroundColor: colors.plaque, borderColor: colors.plaqueBorder });
  panel.getElementById('hud-title')?.setProperties({ color: colors.title });
  panel.getElementById('hud-world')?.setProperties({ color: colors.world });
  panel.getElementById('hud-stars')?.setProperties({
    hover: { backgroundColor: colors.starsHover },
    active: { backgroundColor: colors.starsActive },
  });
  for (const id of STAR_IDS) panel.getElementById(id)?.setProperties({ borderColor: colors.starRing });
}
