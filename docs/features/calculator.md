# Calculator

## Purpose

A floating calculator and unit converter available from the **Tools** section of
the left navigation. It is implemented as a draggable bottom-sheet `QDialog`,
not a route.

## Key files

| File                                     | Role                                     |
| ---------------------------------------- | ---------------------------------------- |
| `src/calculator/CalculatorView.vue`      | Dialog with Calculate and Convert tabs   |
| `src/composables/useDragSnap.ts`         | Drag + snap-back behavior                |
| `src/features/calculator/integration.ts` | Registers the nav item and global dialog |
| `src/features/calculator/NavItem.vue`    | Left-navigation button                   |
| `src/features/calculator/Global.vue`     | Mounts the dialog for the app lifetime   |
| `src/features/calculator/state.ts`       | Shared dialog open state                 |

## Arithmetic tab

- Builds an expression string from button presses.
- `/` is displayed as `÷`, `*` as `×`; aliases are converted back before
  evaluation.
- Evaluation uses `mathjs` (`create(all)` + `evaluate`).
- Errors are shown in a red error section.
- Keyboard support while the dialog is open:
  - `0-9 + - * / . ( )`
  - `Enter` or `=`
  - `Backspace`
  - `c` clears
- `appendBrace()` opens a parenthesis after an operator, otherwise it opens or
  closes based on the open/close counts.
- The `%` key appends mathjs's `%` (modulo); there is no separate percent
  operator.
- There is no history, memory, or exponent button.

## Unit converter tab

- First select a physical base (length, mass, time, current, temperature,
  luminous intensity, amount of substance, force, pressure, energy, power,
  voltage, electric charge, capacitance, resistance, conductance, magnetic
  flux, magnetic flux density, inductance, frequency, angle, area, volume,
  speed, acceleration, density, flow, illuminance).
- Then select a source unit.
- Entered value comes from the arithmetic input/result (conversion is run when
  switching to the tab).
- Renders every other unit in the base with `math.unit(n, from).toNumber(to)`.
- Copy button per row writes to the clipboard.
- Unit labels/options come from `calculator.unitBases.*` and
  `calculator.unitSymbols.*` translation keys.

Known quirks:

- `convertResult` returns `''` for invalid values, which renders as an empty
  row.
- The conversion depends on the arithmetic result; there is no dedicated input
  field.
- Temperature conversion through mathjs uses `degC`/`degF`; labels are
  translated but the source value remains a plain number.

## Dialog behavior

- `QDialog` with `position="bottom"`, drag handle in the toolbar.
- `useDragSnap` moves the card with pointer events and snaps back unless dragged
  more than 200px upward. `transitionHide` switches to a fade when the card has
  been dragged.
- Keyboard listener is global but guarded by `props.modelValue`.
- On unmount it resets the tab and clears the expression.

## App integration

The calculator feature integration registers `NavItem.vue` in the Tools group
and `Global.vue` as a global component. `state.ts` holds the shared
`calculatorOpen` ref, which the nav item toggles and `Global.vue` binds to the
dialog. The dialog is always mounted, so its key listener exists for the app
lifetime.

## Limitations

- No scientific functions (sin, log, etc.) despite mathjs being capable.
- No history tape.
- Unit conversion requires a prior calculation.
- Copy errors (permissions/insecure context) are unhandled.
