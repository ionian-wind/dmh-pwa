# Proposal — `.ds` import/export

> **Status: deferred proposal, not in the current implementation scope.**

Dungeon Scrawl `.ds` files are ZIP archives containing a JSON document and
referenced image assets. A future importer would create a new local project (or
a new map) and map supported geometry, layers, objects and assets into the DMH
document model. Export would be best-effort, with a compatibility report.

## Why deferred

- The local document model and image/file references are still evolving.
- Exact round-trip fidelity is not realistic; a partial importer needs a clear
  reporting UI and careful validation.
- Current scope covers native local projects, image/PDF/UVTT export and
  apply-to-location.

## Outline if activated

1. Parse ZIP with size limits and schema validation.
2. Convert layers, shapes, styles, doors, stairs, text and image references.
3. Create a new project by default; never overwrite an existing project.
4. Report skipped/unsupported nodes and missing assets.
5. Export best-effort `.ds` with simplified styles and a compatibility warning.

See `07-persistence-library-export.md` for the earlier design notes.
