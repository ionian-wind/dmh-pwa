# Timers

## Purpose

Countdown timers for tracking spell durations, torch life, timed events, or
table breaks. Timers run in the background via a global one-second poll and
raise a Quasar notification when they finish.

## Key files

| File                              | Role                                        |
| --------------------------------- | ------------------------------------------- |
| `src/stores/timers.ts`            | Timer store, start/stop/reset, global tick  |
| `src/timers/TimersPanel.vue`      | Floating timer panel and list               |
| `src/timers/TimerEditor.vue`      | Inline create/edit form with H:M:S spinners |
| `src/timers/TimerListItem.vue`    | Row with controls and countdown             |
| `src/features/timers/NavItem.vue` | Toggles the panel, starts the store         |
| `src/features/timers/Global.vue`  | Mounts the panel at app level               |
| `src/features/timers/state.ts`    | Shared panel open state                     |

## Data

```ts
interface Timer {
  id: string;
  createdAt: number;
  updatedAt: number;
  title?: string;
  duration: number; // milliseconds
  startedAt: number | null; // Date.now() when started
  status: 'inactive' | 'running' | 'finished';
}
```

Schema (`timer.schema.json`) requires `id`, `duration`, `startedAt`, `status`,
timestamps and forbids additional properties. `title` is `string | null` in the
schema and an optional string in TS. Version 20 removes the former
`description` field from stored timers.
Timers are included in backup/restore through `MAIN_STORE_NAMES`.

## Lifecycle

```
inactive ──start──▶ running ──elapsed ≥ duration──▶ finished
   ▲                  │                                │
   └────── stop ──────┘                                │
   ▲                                                   │
   └──────────────── reset (alias for start) ──────────┘
```

- `start(id)` sets `startedAt = now`, `status = 'running'` unless already
  running.
- `stop(id)` sets `startedAt = null`, `status = 'inactive'`; elapsed progress
  is discarded.
- `reset(id)` is literally `start(id)`, so a finished timer restarts.
- When elapsed time reaches `duration`, the poll sets `status = 'finished'` and
  shows a notification. `startedAt` is left unchanged.

## Global tick

`useTimerStore().init()` is called from the timers nav item's `onMounted`:

1. `base.load()`.
2. If the module-level `counter` flag is false, set it and start
   `checkFinishedTimers()`.

`checkFinishedTimers()`:

```ts
nowRef.value = Date.now();
running.value = false;
for each timer:
  if running && startedAt:
    if now - startedAt >= duration: update status='finished'; notify
    else: running = true
await persisted updates
if (running) schedule the next poll in 1000ms
```

Consequences:

- `now` updates once per tick while at least one timer is running.
- The poll reschedules itself only while at least one timer is running; when
  the last running timer stops or finishes, polling stops.
- The store is a singleton, so the poll survives navigation; `init()`'s
  `counter` guard prevents a second poll chain.
- If two timers finish at once, multiple notifications appear.
- The store calls `useI18n()` so it must be created after i18n is installed.
- A timer whose `startedAt` is in the future yields a negative elapsed; it
  simply never finishes until the clock catches up.
- The tick continues after the tab is hidden (browsers throttle timers, so a
  long-hidden tab may finish late).

## Panel (`TimersPanel.vue`)

- Opened from the Timers navigation item, like the calculator and dice roller.
- Uses the shared `DraggablePanel` shell; there is no `/timers` page.
- Loads timers and shows `TimerListItem` rows with start/stop/reset, edit, and
  delete controls, plus a **Create Timer** footer action.
- The create/edit form lives inside a `QExpansionItem` below the timer list.
  It is collapsed by default; the **Create Timer** row expands it. Editing a
  timer opens the same form with that timer's values.
- Delete confirmation uses the timer title, or `timers.noTitle` when untitled.
- Create forces `status: 'inactive'`, `startedAt: null`.

## Form (`TimerEditor.vue`)

- Inline form rendered inside the panel's `QExpansionItem`; no modal.
- Title only (no description, no duration heading).
- Three `NumberSpinner`s for hours (0-99), minutes (0-59), seconds (0-59).
- A watcher on the three refs recomputes `duration` in milliseconds.
- A watcher on `props.timer` converts `duration` back to H:M:S.
- There is no direct numeric duration input and no validation for 0 duration.
- `NumberSpinner` accepts typed values, clamps them to the configured range,
  and also supports press-and-hold +/-.

## List item (`TimerListItem.vue`)

- Shows start/stop/reset control depending on status.
- Remaining time:
  - running: `duration - (timerStore.now - startedAt)`
  - inactive/finished: full duration
- Uses `formatTime` from `@/utils/formatTime`.
- Inactive and finished timers show their time without a duration or status
  label; finished rows show the timer time instead of a "Finished!" message.
- Edit and delete actions are hidden until the row is hovered or focused.
- `watch(timerStore.now)` updates only when the timer is running.

## Nav integration

`src/features/timers/NavItem.vue` toggles `timersOpen` from `state.ts`;
`src/features/timers/Global.vue` mounts the panel at app level. It calls
`timerStore.init()` on mount and watches `timerStore.now`; while
`timerStore.running` is true it cycles the timers navigation icon through twelve
clock icons (`hours` array). Because the poll updates `now` once per second, the
icon advances one frame per second.

## Limitations

- No pause/resume; stop discards progress.
- No audio cue, only a Quasar toast.
- No per-timer repeat, loop, or +1 round adjustments.
- Polling only runs while at least one timer is running.
- No visible elapsed/end timestamp or sorting options.
- Hours are capped at 99.
