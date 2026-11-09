# Plans

Plans are **committed work**: they are expected to be implemented at some
point. They define scope, phases, acceptance criteria and any manual steps.
They may still change, but they are not open-ended ideas.

For optional, exploratory ideas that may never be implemented, use
[`../proposals/`](../proposals/).

## Current plans

Last reviewed against the code and test suite on **2026-11-09** (207 test files /
1615 tests passing).

| Plan                                                  | Status                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [Scribe and Play modes](scribe-and-play-modes.md)     | planned — not implemented (P1)                                                                      |
| [Milkdown view renderer](milkdown-view-renderer.md)   | implemented (phases 1–4); static renderer evaluated and not adopted                                 |
| [PWA hardening](pwa-hardening-plan.md)                | phases 1–2 done in emulation, most of phase 3 done; device and Lighthouse/PWABuilder checks pending |
| [Build-time feature flags](feature-flags.md)          | implemented; verification green (14 build configurations)                                           |
| [Remove the Modules entity](remove-modules-entity.md) | completed (historical; Modules removed, related proposals obsolete)                                 |
| [Dice roller](dice-roller.md)                         | planned — greenfield extensible parser/evaluator; not started                                       |

## Conventions

- Keep a task checklist and mark completed items.
- Record dependencies and any decisions already made.
- Separate manual verification steps from implementation tasks.
- Link related proposals when they provide background or alternatives.
- Move a plan to the feature/architecture docs once it is implemented and the
  plan is no longer needed for tracking.
