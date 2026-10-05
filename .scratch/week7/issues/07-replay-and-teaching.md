# 07: Revisit levels, an ending, and teaching beyond level 1 (P1)

**What to build:**
- **Level select on the settings face:** Prev and Next among levels already reached, so solved levels (their stars and melody book) can be revisited. No floating menu.
- **An ending:** after the last level, the plaque says the campaign is complete (no dead end).
- **A hint for each new mechanic:** the first level of each new mechanic shows one line on the plaque (snip, colors, rail tab, spool), the same way onboarding teaches the first pinch.
- **Plaque text fit:** check that the longest title and labels fit (a daily title plus "Daily - start a streak").

**Blocked by:** 06

**Status:** done

## Comments
- **Level select:** the settings face gains a row: Prev | "Level 3 of 24" (or "Daily puzzle") | Next. `lib/levelSelect.ts` (7 unit tests) allows any level up to the first unsolved one, by id, so it survives level insertions. Browsing keeps the settings face open: a rebuild now carries a `BuildReason` ('fresh' | 'relocated' | 'browsing') instead of a `relocated` flag, and only 'fresh' resets the face.
- **Ending:** solving the last campaign level shows "All 24 solved - poke the sun for a daily" (the count comes from the campaign).
- **Teaching:** a schema-checked level `hint` (plain ASCII, 40 characters at most) on the level that introduces each mechanic: Trampoline (springy threads), Snip, Fork (color cups), Slide (rail tab), Short Spool. Hint priority: refusal, onboarding, level hint (until solved), ending, then the daily's way back.
- **Plaque fit:** the worst case (a daily with no streak) was staged. "Daily - start a streak" wrapped into the threads label, so it became "Daily puzzle" (and "Daily - streak N"), and dailies keep their board's name without ", tight", because the plaque already says Daily. Measured with UIKit layout inspection in the browser and in XR: the title "Over and Under" is one line (16.8 x 2.64 cm in a 29.5 x 4.8 cm header). A downscaled screenshot had suggested a wrap; the layout numbers are the evidence.
- E2E `level-select` (7 checks, in the chain, real clicks).
