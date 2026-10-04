# Threadbound

A seated, hands-first mixed-reality puzzle: stretch elastic threads between pegs so falling marbles bounce into cups. Every thread is a string tuned by its length, so a solution plays as a melody.

## Language

**Diorama**:
The ~50 cm puzzle box standing on the player's table (or the virtual study's table); one per level.
_Avoid_: board, box, scene

**Frame**:
The diorama's local coordinate system: x right, y up from the base, z = 0 the marble channel. All puzzle geometry is authored in it.
_Avoid_: local space, anchor (the anchor is only the frame's origin object)

**Peg**:
A brass pin on the back panel that threads attach to.

**Rail peg**:
A peg that slides along one axis between two limits.
_Avoid_: slider, moving peg

**Tab**:
The pinchable brass handle hanging off a rail peg; dragging it slides the peg. Pinching the peg itself always starts a thread.
_Avoid_: handle (in prose), knob (that is the peg's round front)

**Thread**:
An elastic string between two pegs. Shorter is tighter, bouncier and higher pitched. Undirected: a→b is the same thread as b→a.
_Avoid_: string, line, rope

**Preset thread**:
A thread authored by the level; it does not count toward the player's thread limit and may need snipping.

**Snip**:
Removing a thread by poking or pinching it.

**Chute**:
Where a level's marbles enter; pinching it starts a drop. A chute releases marbles of one color.

**Drop**:
One release of all of a level's marbles, round-robin across chutes.

**Cup**:
A goal on the diorama floor. A colored cup only scores marbles of its color.
_Avoid_: goal (in prose; the code type is `goals`), bucket

**Sorting color**:
Amber or azure: marble colors that must land in a cup of the same color. Teal marbles score in any uncolored cup.

**Glyph**:
The shape paired with a sorting color (triangle = amber, circle = azure) so color is never the only signal.

**Solve**:
Every marble of a drop settled in a cup that accepts it.
_Avoid_: win, clear

**Par**:
The thread count a level can be solved with; at or under par earns three **stars**.

**Plaque**:
The panel standing on the diorama's top edge: level title, place in the world, best stars, thread budget, onboarding hint.
_Avoid_: HUD (in prose), menu

**Ghost hand**:
The translucent fingertips that demonstrate pinch-pull and the chute pinch on a first-time player's first level.

**Melody**:
The notes played by bounces during a drop, replayed on a solve.

**Spool**:
World 4's total length of thread for a level. A thread, or a slide that stretches threads, that would overspend it is refused. Preset threads are free.
_Avoid_: budget (that's the thread count), ink

**Refusal**:
A thread or slide the rules turn down: a dull thunk, plus a plaque hint saying why, until the player's next success.

**Daily**:
One campaign board per local calendar day, on a tight **spool**. It never unlocks campaign levels, and its stars belong to its day. The sun button opens it and returns to the campaign.
_Avoid_: challenge (in names)

**Streak**:
Consecutive local days with a daily solve, credited to the day the daily was opened.

**Settings face**:
The plaque's other side, flipped by the gear button: slow motion, the diorama offset, and the guarded progress reset.
_Avoid_: settings menu

**Slow motion**:
Time dilation of the simulation (physics, releases and rest timers all run at 2/3 speed), so every solution plays out identically, only slower.

**Offset**:
The player's height and distance adjustment of the diorama, in whole steps. Changing it **relocates** the diorama: a rebuild at the new pose that keeps threads, slides and a solve, and waits for a drop in progress to end.

**Command bus**:
`puzzleStore.dispatch`: the single entry point for every change to the puzzle, used alike by the player's input, the ledge buttons and the tests.

## Relationships

- A **level** has one **diorama**, one or more **chutes**, two or more **pegs** and one or more **cups**
- A **thread** joins exactly two **pegs**; a **rail peg** carries its threads with it when it slides
- A **solve** awards 1–3 **stars** from threads used versus **par**
- A **daily** is a variant of a campaign **level**: same board, tighter **spool**

## Flagged ambiguities

- "goal" (code) and **cup** (prose) are the same thing; prefer **cup** in new names where it doesn't fight the level schema.
