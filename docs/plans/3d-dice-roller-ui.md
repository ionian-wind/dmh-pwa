# 3D Dice Roller UI — Implementation Plan

> **Status: planned.** Replace the `@3d-dice/dice-box` renderer with a
> first-party Three.js + Rapier renderer, wired to the existing
> [`bag-of-dice`](../../src/utils/bag-of-dice/README.md) engine.
>
> Engine design: [../features/dice-roller/README.md](../features/dice-roller/README.md).
> Engine task tracker: [dice-roller-implementation.md](dice-roller-implementation.md).

## Goal

Build our own 3D dice renderer that:

- uses the existing dice-box mesh and texture assets under
  `public/assets/dice-box`;
- renders with **Three.js**;
- simulates cosmetic tumbling with **Rapier**;
- receives authoritative values from `bag-of-dice`;
- keeps the current draggable dice menu, pool, clear and reroll behavior;
- survives window resizes without blanking the canvas;
- runs behind the existing `diceRoller` feature flag;
- removes the runtime dependency on `@3d-dice/dice-box` / `@3d-dice/dice-ui`.

## Non-goals

- Chat commands, chat cards, roll templates and message delivery.
- Macro library/editor UI.
- Replacing the dice parser/evaluator.
- Physics determining roll results.
- Multiplayer/networked dice.
- Importing third-party themes beyond the shipped `default` and
  `default-extras` themes.

## Current state

- `bag-of-dice` engine is implemented with deterministic RNG and metadata.
- `src/features/dice-roller/NavItem.vue` owns the feature-gated menu entry.
- `src/components/DiceRollerPanel.vue` owns the draggable QMenu, pool, clear,
  reroll and the current DiceBox surface.
- `VITE_FEATURE_DICE_ROLLER` gates the UI and renderer bundle.
- Existing resize workaround avoids resizing DiceBox because its render loop
  stops after dice settle.
- Assets:

```text
public/assets/dice-box/themes/default/default.json
public/assets/dice-box/themes/default/theme.config.json
public/assets/dice-box/themes/default-extras/default-extras.json
public/assets/dice-box/themes/default-extras/theme.config.json
public/assets/dice-box/themes/*/*.png
public/assets/dice-box/themes/*/*.jpg
```

## Key decisions

1. **Engine values are authoritative.** The renderer receives
   `{ sides, value }` records. Physics may tumble dice, but the final face must
   match the recorded value.
2. **Physics is cosmetic.** Rapier steps only while dice are moving. When a die
   settles on the wrong face, it is tweened/snapped to the required face.
3. **PixiJS is not used.** The assets are 3D meshes; Three.js renders them
   directly. Pixi would require a separate 3D layer or a 2.5D sprite rewrite.
4. **Feature-gated and lazy-loaded.** Three.js and Rapier are only imported
   when `VITE_FEATURE_DICE_ROLLER` is enabled.
5. **d100 is two d10 meshes.** The engine rolls `1d100`; the renderer displays a
   percentile d10 plus a units d10. `100` renders as `00 + 0`.
6. **Resize renders; it never clears.** Renderer resize updates size/aspect and
   renders one frame while preserving the scene.
7. **Reduced motion skips physics.** Static dice are placed directly on their
   target faces.

## Module layout

```text
src/features/dice-roller/renderer/
  DiceRenderer.ts          # adapter interface and shared visual types
  ThreeDiceRenderer.ts     # scene, camera, lights, meshes, render loop
  RapierDiceWorld.ts       # Rapier world, bodies, stepping, cleanup
  assetLoader.ts           # Babylon JSON -> Three geometry + colliders
  themeLoader.ts           # theme config -> Three materials
  faceOrientation.ts       # face value -> final quaternion / snap math
  diceValues.ts            # d100 split, value validation, display records
```

`src/components/DiceRollerPanel.vue` keeps the menu/pool shell and consumes the
renderer adapter. The current DiceBox implementation remains as a temporary
adapter until parity.

## Phase 0 — Baseline and contracts

- [x] **3DDR-001** Audit the existing dice-box assets, mesh names, collider
      meshes and face maps.
- [x] **3DDR-002** Gate the dice-roller UI and renderer behind
      `VITE_FEATURE_DICE_ROLLER`.
- [x] **3DDR-003** Preserve the existing pool/clear/reroll menu behavior.
- [ ] **3DDR-004** Define the renderer adapter interface and visual records.
- [ ] **3DDR-005** Add a temporary DiceBox adapter implementing the interface.
- [ ] **3DDR-006** Add renderer factory selection behind the feature flag.
- [ ] **3DDR-007** Add adapter contract tests for add, replace, clear, resize and
      dispose.

**Gate:** the panel runs unchanged through the temporary adapter.

## Phase 1 — Asset loader

- [ ] **3DDR-101** Add Three.js and Rapier dependencies.
- [ ] **3DDR-102** Define typed asset/theme interfaces.
- [ ] **3DDR-103** Fetch and parse theme JSON files.
- [ ] **3DDR-104** Convert Babylon `positions`, `normals`, `uvs` and `indices`
      to `THREE.BufferGeometry`.
- [ ] **3DDR-105** Convert left-handed Babylon coordinates to Three's
      right-handed coordinates and fix triangle winding.
- [ ] **3DDR-106** Load render meshes and `*_collider` meshes separately.
- [ ] **3DDR-107** Build Rapier convex-hull point sets from collider meshes.
- [ ] **3DDR-108** Parse `colliderFaceMap` into value/face metadata.
- [ ] **3DDR-109** Load diffuse, normal, specular and light/dark textures.
- [ ] **3DDR-110** Build Three materials for `default` and `default-extras`.
- [ ] **3DDR-111** Add asset-loader tests for mesh counts, d6 geometry and
      collider mapping.
- [ ] **3DDR-112** Add a visual smoke checkpoint for d4/d6/d8/d10/d12/d20/d100.

**Gate:** every supported die can be built and displayed from the existing
assets without Babylon.

## Phase 2 — Three.js scene

- [ ] **3DDR-201** Create the renderer, scene, perspective camera and canvas.
- [ ] **3DDR-202** Add ambient and directional lighting.
- [ ] **3DDR-203** Add the floor/play surface and optional contact shadows.
- [ ] **3DDR-204** Add mesh instance creation for each die type.
- [ ] **3DDR-205** Implement `add(dice)`, `replace(dice)` and `clear()`.
- [ ] **3DDR-206** Implement the idle-aware render loop: render only while dice
      are active, then stop.
- [ ] **3DDR-207** Implement resize: update renderer size, camera aspect and
      render one frame without clearing meshes.
- [ ] **3DDR-208** Cap pixel ratio and provide low-power/reduced-motion mode.
- [ ] **3DDR-209** Keep the canvas transparent and `pointer-events: none`.
- [ ] **3DDR-210** Add renderer tests for scene lifecycle, resize redraw, no RNG
      and no clear-on-resize.

**Gate:** static dice render through Three.js and survive resize.

## Phase 3 — Rapier simulation

- [ ] **3DDR-301** Initialize Rapier (`rapier3d-compat`) lazily.
- [ ] **3DDR-302** Create the floor collider and gravity.
- [ ] **3DDR-303** Create one rigid body per rendered die using convex-hull
      colliders.
- [ ] **3DDR-304** Spawn dice above the floor with cosmetic random spin/impulse.
- [ ] **3DDR-305** Step the world at a fixed timestep.
- [ ] **3DDR-306** Detect sleep/settle with a maximum simulation timeout.
- [ ] **3DDR-307** Synchronize Rapier transforms into Three meshes.
- [ ] **3DDR-308** Remove bodies and meshes on clear/dispose.
- [ ] **3DDR-309** Cap simultaneous dice and settle duration.
- [ ] **3DDR-310** Add tests for body lifecycle, timeout and cleanup.

**Gate:** dice tumble and settle, and the renderer leaves simulation idle.

## Phase 4 — Deterministic face orientation

- [ ] **3DDR-401** Derive local face normals for each die value.
- [ ] **3DDR-402** Validate face conventions for d4/d6/d8/d10/d12/d20.
- [ ] **3DDR-403** Validate d100 tens/units mapping, including `100 = 00 + 0`.
- [ ] **3DDR-404** Compute target quaternions that point the required face up.
- [ ] **3DDR-405** Tween/snap a settled die to its target orientation when
      physics lands on the wrong face.
- [ ] **3DDR-406** Ensure the same value always produces the same visible face.
- [ ] **3DDR-407** Add face-orientation unit tests for every supported die.
- [ ] **3DDR-408** Add visual golden checks for ambiguous dice (d4, d10, d100).

**Gate:** rendered faces always match `bag-of-dice` values.

## Phase 5 — bag-of-dice wiring

- [ ] **3DDR-501** Create the roll engine inside the dice-roller feature.
- [ ] **3DDR-502** Map pool entries to engine notation.
- [ ] **3DDR-503** On die click: add to pool, roll one die, pass the result to
      the renderer.
- [ ] **3DDR-504** On reroll: reroll every pooled die and replace the rendered
      set.
- [ ] **3DDR-505** On clear: clear pool and renderer.
- [ ] **3DDR-506** Split engine `1d100` results into two d10 visuals.
- [ ] **3DDR-507** Pass engine warnings/errors to the panel without letting
      renderer failures break rolling.
- [ ] **3DDR-508** Add panel tests with mocked engine and renderer.
- [ ] **3DDR-509** Add deterministic integration tests for add/reroll/clear.
- [ ] **3DDR-510** Add a renderer-failure fallback that keeps the pool state.

**Gate:** every visible die value comes from the engine.

## Phase 6 — Migration and cleanup

- [ ] **3DDR-601** Switch the panel to the Three/Rapier renderer.
- [ ] **3DDR-602** Keep the DiceBox adapter as a temporary fallback.
- [ ] **3DDR-603** Remove the resize workaround once the new renderer owns the
      canvas.
- [ ] **3DDR-604** Remove `@3d-dice/dice-box` and `@3d-dice/dice-ui` usage.
- [ ] **3DDR-605** Remove unused DiceBox worker/asset copies if no longer
      needed; keep the theme mesh/texture assets.
- [ ] **3DDR-606** Update feature ownership and bundle audits.
- [ ] **3DDR-607** Update feature documentation and remove the temporary
      adapter.

**Gate:** the app no longer imports a dice-box renderer at runtime.

## Phase 7 — Performance and acceptance

- [ ] **3DDR-701** Stop animation/physics when no dice are active.
- [ ] **3DDR-702** Keep rAF handlers below the frame budget in a production
      build.
- [ ] **3DDR-703** Test 1, 10 and 30 dice pools.
- [ ] **3DDR-704** Test resize during rest and during animation.
- [ ] **3DDR-705** Test reduced-motion and WebGL-unavailable fallbacks.
- [ ] **3DDR-706** Test feature-disabled bundles contain no Three/Rapier code.
- [ ] **3DDR-707** Verify text/2D roll metadata remains available without the
      3D renderer.
- [ ] **3DDR-708** Update the implementation tracker and feature docs.

## Test matrix

| Suite         | Required cases                                                      |
| ------------- | ------------------------------------------------------------------- |
| Adapter       | add, replace, clear, resize, dispose, failure fallback              |
| Assets        | mesh/collider counts, coordinate conversion, winding, UVs, themes   |
| Three scene   | mesh lifecycle, idle loop, resize redraw, no clear on resize        |
| Rapier        | body creation, settle, timeout, cleanup                             |
| Faces         | every die value, d4/d10/d100 conventions, deterministic orientation |
| Values        | d100 split, 100 = 00 + 0, invalid sides fallback                    |
| bag-of-dice   | add, reroll, clear, deterministic values, metadata parity           |
| Performance   | 1/10/30 dice, idle CPU, resize, reduced motion                      |
| Feature flags | disabled bundle excludes renderer code                              |

## Acceptance criteria

- Existing assets render in Three.js.
- Rapier adds cosmetic tumbling but never determines values.
- Every rendered face matches the engine result.
- Resize never clears or blanks settled dice.
- The animation loop is idle when no dice move.
- The feature-disabled build does not include Three.js, Rapier or dice UI.
- `@3d-dice/dice-box` is no longer used at runtime.
- All new modules have tests and the coverage gate remains green.
