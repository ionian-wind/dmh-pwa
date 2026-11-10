# Proposal — Watabou and donjon imports

> **Status: deferred proposal, not in the current implementation scope.**

External generator imports are related to the deferred random-dungeon proposal.

## Watabou One Page Dungeon

- Parse exported JSON rooms, corridors, doors and notes.
- Convert rooms to polygons, corridors to paths/rectangles, doors to door
  objects, notes to text or a skipped-items report.
- Place in a new map with a neutral preset.

## donjon

- Parse saved maps and convert rooms, corridors and doors.
- Document unsupported polymorph shapes and skipped geometry.
- Import into a new map, never replacing the current map.

See `random-dungeon.md` for the generator proposal and
`07-persistence-library-export.md` for the original importer notes.
