# 04: Video kit

**What to build:** `docs/video/shot-list.md` and `docs/video/script.md` (3:00 or less, real gameplay in the first 10 s, no AI-generated footage), plus a `shot-setup` that stages each named shot in the emulator (level, threads, slow motion, headset pose). **The user records with the XR Simulator or the emulator, uploads and submits.**

**Blocked by:** 03

**Status:** done

## Comments
- `docs/video/shot-list.md` (10 shots, 2:45 in total, gameplay from 0:00) and `docs/video/script.md` (on-screen text and an optional VO).
- `zsh tests/e2e/shot.sh <shot>` stages any of the 9 named shots: it loads the level, prepares threads or the solve, and for XR shots seats the emulated player at the room's dining table and enters passthrough. Every shot was verified to stage (placed on the table; melody-book solved before entry).
- Found while staging: entering passthrough **during a drop** rebuilt the board and ended the drop. The shot now waits for the solve; the product fix (defer placement until the drop ends, like Raise/Lower) is in the bug-bash fix ticket.
- **The user records, uploads (YouTube or Vimeo) and submits.**
