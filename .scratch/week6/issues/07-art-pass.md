# 07: Art pass, materials and lighting

**What to build:** warmer, crafted materials (wood tint variation, brass pegs and rails, a soft contact shadow) and better study lighting, using the compose-scene and build-model specialists where they apply. Stay within the draw-call budget.

**Blocked by:** 01

**Status:** done

- [x] Ledge icons tilted toward the player (readable from a seated head and the low browser camera)
- [x] Before/after runtime screenshots of both backdrops (600 px)
- [x] Level proof still passes with the budget check

## Comments
- Materials: a procedural, seeded wood-grain CanvasTexture shared by every walnut surface (no draw-call cost); the frame is a shade darker than the back panel, so the case reads as layered; brass at metalness 0.85 / roughness 0.28.
- A contact shadow (one shared unit plane, unlit radial gradient, no depth write) under the case grounds it on the virtual table and on the real table in passthrough.
- Cap icons sit in a mount tilted about 30 degrees toward the player.
- Lighting (via iwsdk-compose-scene, fast path): the IBLGradient went from cool blue-grey (lit brighter from below) to a warm cream sky, a warm mid equator and a dark, slightly cool ground, so the diorama is top-lit and the brass catches highlights. The study background is now warm brown (0x30221d).
- Evidence: `.scratch/week6/art-review.jpg` (before above after, same view of Last Thread). Coral threads and amber/azure marbles stay distinct.
- Found while verifying: the passthrough room check (`xr-room.e2e`) was not called by any runner. It is now the first step of `xr-controls.sh` (AR hides the study: alpha-blend).
- Budget after the pass: busiest w2-06 Three Cups 57/80 (six marbles), w3-06 54, w4-06 53.
