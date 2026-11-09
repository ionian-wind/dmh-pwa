# Map Studio — plan index

This folder contains the implementation plan for a PixiJS-based, Dungeon Scrawl–style map drawing studio for DMH.

The feature is large enough that it is split into focused documents:

1. [00-overview.md](00-overview.md) — goals, scope, decisions, constraints, success criteria.
2. [01-feature-parity.md](01-feature-parity.md) — exhaustive feature checklist and phasing.
3. [02-architecture.md](02-architecture.md) — runtime architecture, Pixi integration, UI composition, state, performance.
4. [03-data-model.md](03-data-model.md) — persisted document model, schema versioning, stores, migrations.
5. [04-geometry-and-tools.md](04-geometry-and-tools.md) — geometry engine and every drawing tool.
6. [05-rendering-and-styles.md](05-rendering-and-styles.md) — Pixi render passes, dungeon styles, grids, textures, lighting, fog.
7. [06-ui-ux-and-input.md](06-ui-ux-and-input.md) — desktop/tablet/mobile layouts, panels, keyboard, touch, accessibility.
8. [07-persistence-library-export.md](07-persistence-library-export.md) — local library, autosave, `.ds`, PNG/PDF/UVTT, importers, location baking.
9. [08-random-dungeon.md](08-random-dungeon.md) — procedural dungeon generator and external generator imports.
10. [09-testing-rollout.md](09-testing-rollout.md) — test strategy, performance budgets, milestones, task breakdown, risks.

## Plan status

- Requirements source: Roll20 Dungeon Scrawl help center sections linked by the user, including all tool, sidebar, layer and styling subpages.
- Decisions confirmed with the user:
  - **Studio only**: the existing OpenLayers location viewer remains unchanged.
  - **All local editor features**, including local library/autosave and Pro-equivalent editor features.
  - **Drawings only**: the studio does not display or edit location markers, areas or entity links.
  - **Full touch/mobile parity**.
- Implementation: not started. This is a design document, not a record of completed work.
