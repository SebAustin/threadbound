# Week 7: ship

Status: ready-for-agent

## Problem Statement

Threadbound is feature-complete: 24 levels, a daily and a streak, a melody book, a sound pass, an art pass, settings, and gaze plus pinch. But the submission isn't proven against the competition's own bar, and the materials judges read don't exist yet.

The official rules (Devpost) weight four criteria equally:
- **Innovation & Creativity.**
- **Experience Design:** seated, hands-first, intuitive, with purposeful passthrough and field-of-view awareness.
- **Technical Implementation:** hand tracking, gaze, passthrough, spatial anchoring, "minimum 60 fps", and "entries using passthrough must properly implement scene understanding".
- **Polish & Presentation:** "show real gameplay that honestly represents the experience".

The rules also ask for:
- a video of at most 3 minutes, filmed on a Quest or in the XR Simulator, hosted on YouTube or Vimeo;
- a hosted link (GitHub Pages);
- a description covering inspiration, how it was built, future plans and a target launch date.

The deadline is **Nov 18, 2026, 12:00 PM PST**. The README still advertises "six World 1 puzzles".

## Solution

1. **Prove the Stage 1 bar with automated checks.** A full level played with hands only in an XR session; every interactive element within seated reach (2 ft); a cold start to the first melody in under 60 s; draw calls measured inside an XR session; passthrough placement verified to use detected surfaces (scene understanding).
2. **Bug bash.** A full-codebase review against the plan and the criteria, with fixes.
3. **Write what judges read:** a refreshed README and `docs/submission.md` (description, criteria mapping, accessibility notes, testing instructions).
4. **A video kit:** a shot list and a script of 3:00 or less with gameplay in the first 10 s, plus a script that stages each shot in the emulator. **The user records, uploads and submits.**
5. **Prepare the code freeze and the `v1.0` tag.** The tag's timing is the user's decision (outward-facing).

## User Stories

1. As a judge, I want to open one link and play with my hands, so that judging is effortless.
2. As a judge, I want the README and description to tell me what to try in two minutes, so that I see the best of it.
3. As a judge, I want the experience to respect a seated reach, so that it is comfortable.
4. As a judge, I want it to teach itself in under a minute, so that the first five minutes shine.
5. As a judge, I want a steady frame rate on Quest, so that it meets the 60 fps bar.
6. As a judge, I want mixed reality that sits on my real table, so that passthrough is purposeful.
7. As a viewer of the video, I want to see real gameplay in the first 10 seconds, so that I understand it immediately.
8. As the developer, I want each video shot staged by a script, so that recording is repeatable.
9. As the developer, I want a tagged, frozen release, so that the judged build never changes under the judges.

## Implementation Decisions

- **Stage 1 checks** run at the existing seams (E2E plus emulator XR scripts).
  - Reach: measured from the seated head pose to every peg knob, rail tab, chute, ledge button and plaque control, on every level, with the default and the extreme offsets.
  - First melody: timed through the real onboarding flow with real input.
  - XR draw calls: read from the frame stats during an active session.
  - Scene understanding: checks what the placement system consumes (detected planes, hit test or anchors) and how it behaves without them.
- **Bug bash:** two-axis review sub-agents over the whole codebase, with the plan and the official criteria as the spec. Findings become a ticket and are fixed test-first.
- **README and submission:** plain, specific copy with no overclaiming. Every claim is backed by a test or the code (for example, "every level proven solvable by an automated physics test").
- **Video kit:** `docs/video/` holds the shot list and the script. `shot-setup` is extended to stage named shots (level, threads, slow motion, XR pose).

## Testing Decisions

- New E2E: `reach` (2 ft) and `first-melody` (under 60 s with real pointer input, matching onboarding).
- New XR script: `xr-full-level` (thread by hand pinch, drop by chute pinch, solved), plus draw calls in session.
- The full regression at the end, as every week.

## Out of Scope

Posting, recording, uploading and submitting (the user's). New gameplay features. Accessibility additions beyond the current set are listed as recommendations for the user's decision (high-contrast mode, gaze-dwell selection), because they would change scope.

## Further Notes

The schedule has slack: today is Oct 4, and the freeze is Nov 14. Real-Quest feedback from the forum post may add a bug-fix round before the freeze.
