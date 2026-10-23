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
Removing a thread by pinching it.

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
The thread count a level can be solved with.

**Star**:
One of up to three a solve earns: one for the solve itself, one for using **par** threads or fewer, one for solving with the first drop since the level loaded or restarted.

**Thread limit**:
The most threads the player may place on a level; preset threads don't count. One above **par**, so a spare thread can still solve, at the cost of a star.
_Avoid_: budget, cap

**Plaque**:
The panel standing on the diorama's top edge: level title, place in the world, best stars.
_Avoid_: HUD (in prose), menu

**Ledge**:
The diorama's front lip, within reach: its buttons, the hint line, and the threads placed against the **thread limit**.

**Ghost hand**:
The translucent fingertips that demonstrate pinch-pull and the chute pinch on a first-time player's first level.

**Melody**:
The notes a drop plays: each bounce on a thread sounds that thread's next note, climbing from its **root**, and a solve closes on the **cadence**. A drop's marbles share each thread's climb: up from the root to the top of the scale, then down from just below the root to the bottom, then from the root again, so a thread sounds every note of the scale before one repeats. The next drop starts again from the roots. A drop without a solve ends without the cadence. Replayed on a solve with its original timing.

**Root**:
A thread's first note, set by its length: shorter rings higher.

**Cadence**:
The chord the cups ring when a drop solves, closing its melody.

**Spool**:
World 4's total length of thread for a level. A thread, or a slide that stretches threads, that would overspend it is refused. Preset threads are free.
_Avoid_: budget, ink

**Refusal**:
A thread or slide the rules turn down: a dull thunk, plus a hint on the ledge saying why, until the player's next success.

**Daily**:
One campaign board per local calendar day, on a tight **spool**. It never unlocks campaign levels, and its stars belong to its day. The sun button opens it and returns to the campaign. A finished campaign reopens on it. It has its own name and only uses mechanics the player has already reached.
_Avoid_: challenge (in names)

**Skip**:
Moving on from a level after three drops that ended without a solve, offered on the settings face. The skipped level earns no stars and stays unsolved: the player can come back to it, and it doesn't count toward finishing the campaign.

**Guest play**:
Playing from the first level without reading or changing the saved progress; nothing from it is kept. For judges on a shared headset.

**Streak**:
Consecutive local days with a daily solve, credited to the day the daily was opened.

**Settings face**:
The plaque's other side, flipped by the settings button: slow motion, high contrast, the diorama offset, the star total, the **skip** when offered, and the guarded progress reset.
_Avoid_: settings menu, gear

**Slow motion**:
Time dilation of the simulation (physics, releases and rest timers all run at 2/3 speed), so every solution plays out identically, only slower.

**Offset**:
The player's height and distance adjustment of the diorama, in whole steps. Changing it **relocates** the diorama: a rebuild at the new pose that keeps threads, slides and a solve, and waits for a drop in progress to end.

**Melody book**:
The tune each campaign level's best solve played, kept with progress. Pinching the plaque's stars replays it; the settings face plays the whole book.

**Cue**:
The one sound a game event makes (a cup chime, a button click, a refusal thunk...), defined in a single table. Musical cues stay in the pentatonic scale; failure cues sit below it.

**Command bus**:
`puzzleStore.dispatch`: the single entry point for every change to the puzzle, used alike by the player's input, the ledge buttons and the tests.

## Relationships

- A **level** has one **diorama**, one or more **chutes**, two or more **pegs** and one or more **cups**
- A **thread** joins exactly two **pegs**; a **rail peg** carries its threads with it when it slides
- A **solve** awards 1–3 **stars**: the solve, **par** or fewer threads, and the first drop
- A level's **thread limit** is its **par** + 1
- A **daily** is a variant of a campaign **level**: same board, tighter **spool**

## Flagged ambiguities

- "goal" (code) and **cup** (prose) are the same thing; prefer **cup** in new names where it doesn't fight the level schema.
