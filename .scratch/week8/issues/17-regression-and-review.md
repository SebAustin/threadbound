# 17: Week 8 regression and two-axis review (P1)

**What to build:** the week's closing gate, as in weeks 4-7 (.scratch/week5/issues/12-review-fixes.md, .scratch/week6/issues/10-review-fixes.md). It has five parts: a full regression on what tickets 01-16 shipped; a Standards review and a Spec review of `83977c8..HEAD` (83977c8 is the last commit before week 8); the findings fixed test-first; a list of README and submission lines for week 9's final copy pass; and week 9's tickets.
- **Gate:** every ticket under **Blocked by** reads `**Status:** done`, with its boxes ticked and a Comments entry. Tickets 04 and 05 aren't blockers, because their open parts wait on the user (posting the request, running OBS). For the same reason the gate doesn't wait on the user-only `Human:` boxes of 06 (the future-of-VR answer and tagline, due before submitting) and 16 (the headphones check); list them as open in Comments.
- **Full regression.** Run it with `node_modules` from `npm ci` and the dev server from `npx @iwsdk/cli dev up --headless --allow-browser-automation`, once `dev status` reports `browserCommandReady: true`. Don't edit `src/` while it runs, and follow ticket 02's rule for a running regression. The steps:
  - `npm run typecheck` and `npm run coverage`;
  - `npm run test:e2e` (package.json:18, plus every script tickets 06-16 add to it), `test:e2e:levels` and `test:e2e:levels:slow` (:20-21), and `test:e2e:dailies` (:22);
  - `test:e2e:hands` (:19), now with xr-hosts.sh (06), xr-placement.sh (07), enter-xr.sh (08), xr-guest.sh (09), the three-miss skip check (13) and xr-spatial-audio.sh (16);
  - the CI smoke, locally: `NODE_ENV=production npm run build && npm run test:smoke` (ticket 03; CI runs the same steps before the upload, deploy.yml:29-32 today), then `npm run test:e2e:prod-xr` against the local preview (ticket 02).

  Run it once on the commit after ticket 16, so any breakage becomes a review finding. The run that counts is the rerun on the review-fix commit.
- **The log, `.scratch/week8/regression-final.log`:** use the layout of `.scratch/week8/regression-baseline.log` (ticket 02) and `.scratch/week6/regression-fixes.log`.
  - **Header:** the SHA, the date and `node --version`. Say so if the version isn't .nvmrc's 22.12.0 (local is v26.7.0).
  - **Sections:** `--- unit`, `--- e2e`, `--- levels`, `--- levels slow`, `--- dailies`, `--- xr`, `--- build`, `--- smoke`, `--- prod-xr`.
  - **Summary line:** unit count and coverage, E2E checks passed, levels N/24 at each speed, dailies N/7, hand scripts N/N, smoke and prod-xr PASS counts, and every exit code.
- **Two-axis review:** two read-only sub-agents, both on one fixed SHA.
  - **Standards:** checks the diff against AGENTS.md (Conventions and the Traps table), src/AGENTS.md, .claude/agents/iwsdk-project-code-reviewer.md and the user's coding-style, testing and security rules. Findings are split into HARD and judgement, as in .scratch/week7/issues/02-bug-bash.md:10. The new per-frame code (the placement fade-in, melody timing, the star and caption pulses) must not allocate in `update()` and must read signals with `.peek()`. Every listener, including the reference-space `reset` and the visibility listener, must be torn down through `cleanupFuncs`.
  - **Spec:** checks the build against .scratch/week8/spec.md (the 13 user stories, plus the Implementation and Testing Decisions), ADRs 0004-0006 and CONTEXT.md.
    - Each story comes back met (with a test name or path:line), partly met, or missed. Story 7's device half (a real pinch on Quest Browser's 2D page) is recorded as unproven, not met.
    - Every gap a week 8 ticket lists under **Gaps closed** maps to its evidence, or stays open for week 9.
    - A term check compares new names, player-facing text and test check names with the _Avoid_ lists. Drift today: the thread limit called by an avoided word (src/lib/hud.ts:41, src/features/hud/HudSystem.ts:20, public/ui/hud.uikitml:2, tests/e2e/plaque.e2e.mjs:23; ticket 12 renames these, so verify them); the old verb for the stars, the sun and the reset (public/ui/hud.uikitml:152, src/lib/hud.ts:58, :60, tests/e2e/guarded-reset.e2e.mjs:28, and src/lib/resetGuard.ts's "two pokes" and `resetPoke`; tickets 11 and 14 rename these, so verify them); the old button name (tests/e2e/settings.e2e.mjs:46, tests/e2e/xr-controls.sh:26; ticket 12 renames these, so verify them); and w4-03's old title, on Spool's _Avoid_ list (ticket 14 renames it to "Thrift", so verify it). Fix or rename each one, or record why it stays. The fingertip press on ledge buttons (`PokeInteractable`) and the performance budget are legitimate.
- **Fixes:** every behaviour change is test-first, and Comments record its RED run against the old code, as week 5 did. The findings go in Comments under Spec axis, Standards axis, and Accepted, not changed (the week 6 layout). A finding that needs the user's decision is listed, not guessed. CONTEXT.md gains or revises any term that drifted. Commit the fixes as `fix: week 8 review findings (...)` together with the final log. Push only once that log is green, following README "Develop" (README.md:65-82, as ticket 03 rewrites it).
- **Copy list for week 9:** re-run ticket 06's claim audit against the shipped build. List every README.md and docs/submission.md line that must change:
  - each `<!-- true once week 8 ticket 10 lands ... -->` marker and `[if shipped]` bracket left by ticket 06;
  - each claim without evidence in the final log;
  - each shipped feature the copy leaves out (for example `?fresh=1` in the testing instructions, held back by ticket 06).

  Each entry gives the file:line, the current words, what shipped and its evidence, and the change.
- **Week 9 tickets:** write them in this format as `.scratch/week9/issues/NN-*.md`, from .scratch/week9/spec.md and the tester replies summarized in ticket 04's Comments.
  - Tester fixes come first (spec :5), then the candidates in priority order, with the final copy pass (:18) last. The copy-pass ticket carries the copy list.
  - Finger-strum (:9) is ticketed only if ticket 10's commit is dated Nov 4 or earlier. Otherwise it's dropped from the spec, with that reason.
  - Spec-axis misses and deferred findings become tickets, or are accepted in writing.
  - The efforts fit Nov 5-10 with a day spare. Candidates below that line are listed in the spec with the reason.
  - The spec's `Status:` moves from needs-triage to ready-for-agent.

**Blocked by:** 01, 02, 03, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16

**Status:** ready-for-agent

- [ ] Unit: `npm run typecheck` and `npm run coverage` pass on the review-fix commit, with no fewer tests than the baseline log. Every fix that changes `src/lib/` behaviour adds a unit test that failed first.
- [ ] E2E: every `test:e2e` script passes with real input. That includes ticket 10's melody checks: 3 or more distinct notes on w1-01 and w1-03, and the same notes on a repeat drop (spec :107).
- [ ] E2E: levels prove 24/24 at normal speed and 24/24 at SLOW=1, each run on the index it asked for (tests/e2e/levels.sh:20). `test:e2e:dailies` passes every daily.
- [ ] XR: every `test:e2e:hands` script passes, including the four spec checks (spec :109-113): Enter XR with a long press (08's enter-xr.sh: an 800 ms mouse press, standing in for Quest Browser's pinch on the 2D page, which IWER can't emulate before a session), a guest-play run, a skip after three misses, and placement again after a recenter.
- [ ] Smoke: the local production build passes `npm run test:smoke` and `npm run test:e2e:prod-xr`, with zero console errors.
- [ ] Log: regression-final.log has the header, the nine sections and the summary line. Every PASS line in regression-baseline.log appears in it, or Comments explain its rename or removal (the term check will rename some).
- [ ] Review: Comments summarize both reports. Every HARD finding and every missed story is fixed, or accepted with a reason. Each term-check hit is fixed or marked legitimate.
- [ ] Copy: the list is in week 9's copy-pass ticket, and every entry has a path:line and its evidence. tests/unit/copyHonesty.test.ts (ticket 06) still passes.
- [ ] Week 9: `.scratch/week9/issues/` holds the tickets, numbered from 01, with tester fixes first, the copy pass last, and efforts that fit Nov 5-10. The week 9 spec reads ready-for-agent.
- [ ] The fix commit includes regression-final.log, and a Comments line closes gap 42 with its SHA.

**Effort:** M (~2 days)

**Gaps closed:** #42 (the final regression; tickets 01 and 02 covered the earlier runs)

**Risks:**
- Silent failures are usually the environment: a stale Vite overlay (tests/e2e/no-overlay.e2e.mjs), `dev restart` dropping `--allow-browser-automation`, a lost lease (`runtime recover`), or HMR swapping code mid-run. Levels run one per 110 s lease, so the two level runs take most of an hour.
- zsh function variables are global. A new helper's `for i` once made levels.sh prove level 1 twenty times, so declare `local` and keep the index guard.
- Fixes to the plaque or ledge hit the known UIKit traps. Spans that start empty never lay out, so give them placeholder text. A press that disposes its own target must act on release. Pointer listeners go on child meshes.
- Tester replies may not have arrived by Nov 4. Write the week 9 tickets anyway with a slot kept for tester fixes, and add tickets as replies come in.

## Comments
- **Carried over from ticket 01's post-landing review:** make xr-controls' chute check race-free with a `marbleCount` PROBE_FIELDS entry, passing on `status != idle || marbleCount > 0`. Details are in ticket 01's Comments.
- **From ticket 01:** the flat-view camera moved to (0, 1.07, 0.40) (`iwsdk.config.json`), so flat-view screenshots and shots look about 10% smaller and lower. Re-check ticket 05's flat-view shots. The Enter XR pill still covers the settings face's (unclickable) title.
