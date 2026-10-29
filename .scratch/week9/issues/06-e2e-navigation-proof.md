# 06: A navigation can't stop an E2E script (P1)

**What to build:** week 9 spec item 13, pulled above the effort line because ticket 07's final regression depends on it: today a navigation during `waitFor` can stop the whole `test:e2e` chain at random (week 8 ticket 20's review: 2 of 3 runs stopped on `Execution context was destroyed`).
- `waitFor` (tests/e2e/lib.mjs:7-14) polls with `app.evaluate`. When the page navigates during a poll (`navigateApp`, a reload), Playwright throws `Execution context was destroyed`. Treat that error, and only that error, as "not yet" and poll again; every other error still throws.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] E2E: a new check (in `tests/e2e/no-overlay.e2e.mjs` or its own script at the head of `test:e2e`) reloads the page while `waitFor` polls and still resolves true once the app is back; run it against the old `waitFor` first and quote the ERROR in Comments.
- [ ] Unit or E2E: an unrelated error inside the predicate still throws (not swallowed).
- [ ] E2E: one full `npm run test:e2e` run passes.

**Effort:** S (~0.25 day)

**Gaps closed:** none listed (week 9 spec item 13)

**Risks:**
- Swallowing more than that one error would hide real failures; match the message exactly.

## Comments
