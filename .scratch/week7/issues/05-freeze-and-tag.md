# 05: Code freeze and v1.0 tag

**What to build:** a release checklist (the full regression green, the build deployed, the Pages URL verified, the tag `v1.0` on the judged commit). Tagging and pushing the tag is outward-facing, and its timing (after real-Quest feedback, no later than Nov 14) is **the user's call**.

**Blocked by:** 02, 03, 04

**Status:** ready-for-human

## Comments

- **Oct 23, week 8 ticket 03:** the freeze plan is now to tag `v1.0`, deploy from `v*` tags (or `workflow_dispatch`) only, and have a ruleset block pushes to `main` until about Dec 11. The github-pages environment's main-only branch policy must then also admit `v*` tags, or the tag's deploy job is refused (gap 8). Ticket 03 itself only added `paths-ignore` for docs, Markdown and `.scratch/` pushes; it didn't change the trigger, add a ruleset or disable the workflow.
