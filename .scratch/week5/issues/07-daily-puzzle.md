# 07: Daily puzzle

**What to build:** a ledge button loads today's challenge from a pool of seven, picked by local date; its stars are kept apart from the campaign.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Pure daily pick unit-tested (deterministic, in range, consecutive days differ)
- [x] Seven challenge levels proven by the level proof
- [x] Real click on the daily button loads today's pick; plaque says Daily (E2E)

## Comments
- **Scope change:** the pool is seven campaign boards replayed on a tight spool (stored solution + 1-2 cm, whole centimetres) instead of seven new levels. Fresh constraint on a familiar board each day, solvable by construction (identical physics; the schema rejects a variant whose solution does not fit). All seven proven live (`npm run test:e2e:dailies`).
- Pick: day number x 3 + 5 mod 7 (stride coprime with the pool: a full week's rotation, never the same puzzle two days running).
- Daily stars live under 'daily-<id>'; dailies never unlock campaign levels or show Next. Ledge sun button; XR pinch covered in xr-controls.sh.
