# Timers

## Purpose

Countdown timers for tracking spell durations, torch life, timed events, or
table breaks. Timers run in the background via a global one-second poll and
raise a Quasar notification when they finish.

## Key files

| File | Role |
| --- | --- |
| `src/stores/timers.ts` | Timer store, start/stop/reset, global tick |
| `src/timers/TimersView.vue` | List page |
| `src/timers/TimerEditor.vue` | Create/edit modal with H:M:S spinners |
| `src/timers/TimerListItem.vue` | Row with controls and countdown |
| `src/App.vue` | Starts the store and animates the nav icon |

## Data

```ts
interface Timer {
  id: string;
  createdAt: number;
  updatedAt: number;
  title?: string;
  description?: string;
  duration: number;          // milliseconds
  startedAt: number | null;  // Date.now() when started
  status: 'inactive' | 'running' | 'finished';
}
```

Schema (`timer.schema.json`) requires `id`, `duration`, `startedAt`, `status`,
timestamps and forbids additional properties. `title`/`description` are
`string | null` in the schema and optional strings in TS.

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

`useTimerStore().init()` is called once from `App.vue#onMounted`:

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
setTimeout(checkFinishedTimers, 1000)
```

Consequences:

- `now` updates every second even when no timer is running.
- The timeout chain is never cleared; it survives navigation (the store is a
  singleton) and lives for the page lifetime.
- If two timers finish at once, multiple notifications appear.
- The store calls `useI18n()` so it must be created after i18n is installed.
- A timer whose `startedAt` is in the future yields a negative elapsed; it
  simply never finishes until the clock catches up.
- The tick continues after the tab is hidden (browsers throttle timers, so a
  long-hidden tab may finish late).

## List page (`TimersView.vue`)

- Loads timers.
- `BaseListView` with `TimerListItem` and `TimerEditor`.
- `cardProps` pass `onStart/onStop/onReset/onEdit/onDelete` as event listeners.
- `@start`, `@stop`, `@reset` are declared on `BaseListView` but never emitted
  by it; the real wiring is the card props.
- Delete confirmation message passes the literal title `'timer'`.
- Create forces `status: 'inactive'`, `startedAt: null`.

## Editor (`TimerEditor.vue`)

- Title, description.
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
- Uses `formatTime` from the jukebox utilities.
- `watch(timerStore.now)` updates only when the timer is running.

## App integration

`App.vue` watches `timerStore.now`; while `timerStore.running` is true it cycles
the timers navigation icon through twelve clock icons (`hours` array). Because
the poll updates `now` every second, the icon advances one frame per second.

## Limitations

- No pause/resume; stop discards progress.
- No audio cue, only a Quasar toast.
- No per-timer repeat, loop, or +1 round adjustments.
- Timers are not included in backup/restore (`MAIN_STORE_NAMES` omits them).
- Polling runs forever.
- No visible elapsed/end timestamp or sorting options.
- Hours are capped at 99.
