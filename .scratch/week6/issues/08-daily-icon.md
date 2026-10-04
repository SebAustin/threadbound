# 08: Real icon on the daily button

**What to build:** replace the placeholder daily-button icon with a readable sun glyph that matches the other ledge icons.

**Blocked by:** none

**Status:** done

- [x] Screenshot of the ledge shows four distinct icons
- [x] daily.e2e and xr-controls still pass

## Comments
- The sun is a disc plus 8 rays merged into one geometry (one draw call), replacing the plain ring that looked too much like the restart loop and the settings nut.
- Visual (`.scratch/week6/ledge-crop.jpg`): from the low browser camera every icon is foreshortened, but the sun's rays set it apart. **Follow-up for the art pass (07):** tilt the cap icons toward the player so they read from both a seated head and the low browser camera.
- daily.e2e and xr-controls (sun pinch in and back) pass.
