# One command bus for player, buttons and tests

Every change to the puzzle (load, drop, add/snip thread, move a rail peg, place the diorama, reset progress) is a `PuzzleCommand` dispatched through `puzzleStore`. Systems react to commands; state is an immutable snapshot. Tests drive the same bus through a dev-only hook that is stripped from production builds, so E2E proofs exercise exactly the code paths the player's hands do, minus the pointer.
