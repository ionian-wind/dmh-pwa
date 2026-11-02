# Jukebox

## Purpose

A local music player for session ambience. Users add audio files, attach
playlists to modules, and play music through a global howler-based player that
survives navigation. Files are referenced either through the File System Access
API (`FileSystemFileHandle`) or stored as Blobs in IndexedDB.

## Key files

| File                                            | Role                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| `src/jukebox/types.ts`                          | `JukeboxFile`, `JukeboxTrack`, `JukeboxPlaylist`         |
| `src/jukebox/stores.ts`                         | Three stores + file helpers + picture URL cache          |
| `src/jukebox/playerStore.ts`                    | Playback engine, queue, shuffle/repeat, media session    |
| `src/jukebox/JukeboxView.vue`                   | Library/playlist page                                    |
| `src/jukebox/components/JukeboxPlayer.vue`      | Player controls                                          |
| `src/jukebox/components/JukeboxDialog.vue`      | Draggable mini-player dialog                             |
| `src/jukebox/components/PlaylistList.vue`       | Right-drawer playlist navigator                          |
| `src/jukebox/components/PlaylistEditor.vue`     | Playlist create/edit                                     |
| `src/jukebox/components/TrackCard.vue`          | Track row                                                |
| `src/jukebox/components/TrackInfo.vue`          | Title/artist/artwork                                     |
| `src/jukebox/components/AlbumPicture.vue`       | Artwork with URL cache                                   |
| `src/jukebox/components/AddToPlaylistModal.vue` | Playlist membership toggles and inline playlist creation |
| `src/jukebox/useAnimatedGradient.ts`            | Palette-based background                                 |
| `src/jukebox/utils.ts`                          | `formatTime`                                             |
| `src/utils/files/*`                             | File access + metadata extraction                        |

## Data model

See [architecture/data-model.md](../architecture/data-model.md#jukebox-entities).

- `JukeboxFile` stores the file `source` and basic stat fields. The `id` is
  deterministic: `${file.name}-${file.lastModified}-${file.size}`.
- `JukeboxTrack` stores extracted metadata and references `fileId`. Album art
  is stored as a `Blob` (`picture`) plus derived `color`/`palette`.
- `JukeboxPlaylist` stores `trackIds` in display order; `sortOrder` orders
  playlists; `moduleIds` links playlists to modules.
- `JukeboxTrack.playlistIds` is declared but never maintained; membership is
  read from playlists.

None of these stores use schema validation, because `FileSystemFileHandle` and
`Blob` are not plain JSON.

## Importing tracks

Two entry points:

1. **File picker** (`fileHandler.pickAudioFiles`):
   - Chromium with `showOpenFilePicker`: returns handles (persistent
     references; permission may be requested later).
   - Other browsers: `BlobFileHandler` creates a temporary `<input type=file>`
     and stores Blobs.
2. **Drag and drop** on the document:
   - `onDragEnter/Over/Leave` track drag state and show a full-page drop zone.
   - `onDrop` prefers `DataTransferItem.getAsFileSystemHandle()`; falls back to
     `getAsFile()` Blob.
   - Only `audio/*` or `.mp3/.wav/.ogg/.flac/.aac` files are accepted.

`processFiles`:

1. Computes the deterministic file ID.
2. Reads any existing file record (to preserve `createdAt`).
3. Writes the file record.
4. Extracts metadata through `fileHandler.extractTrackMetadata`:
   - duration via an `<audio>` element,
   - tags/artwork via a dedicated worker (`music-metadata`, `OffscreenCanvas`),
   - dominant color and up to four palette colors via a bundled color extractor
     (`amount: 4`, `sample: 10`, `group: 30`, hex output). Fewer than four
     colors are returned only when the artwork has fewer distinct grouped
     colors.
5. Creates a track.
6. If a playlist is selected, appends the new track ID.
7. Calls `playerStore.actualiseQueue()`.

There is no deduplication of tracks: re-adding the same file creates another
track that shares the same `fileId`.

## Playback engine (`playerStore.ts`)

### State

```
currentTrack, isPlaying, currentTime, duration, volume, lastVolume
queue: JukeboxTrack[], queueIndex: number, queuePlaylistId: string | null
```

Shuffle, repeat mode, active playlist, and last track are stored in
`configStore` (localStorage).

### Howler integration

`prepareAudioFile(track, seekTo)`:

1. Loads the file record.
2. For handles, calls `queryPermission` **and** `requestPermission` (both are
   always awaited; the request may fail without a user gesture).
3. Gets the `File`, creates an object URL, determines format from MIME type or
   extension.
4. Destroys the previous Howl and creates a new one with `html5: true`.
5. Event handlers update `isPlaying`, `duration`, progress (via
   `requestAnimationFrame`), seek state, and load errors.
6. If the file is `NotFoundError`, marks the track `disabled: true`.
7. Sets `currentTrack`.

`playTrack` starts playback and stores `jukeboxLastTrackId`.

`togglePlay` pauses/resumes the existing Howl; it does nothing if no Howl
exists.

`seek`, `setVolume`, `toggleMute` update Howler and config.

### Queue construction

`getPlaylistTracks(shuffle)`:

- Uses the queue's playback playlist (`queuePlaylistId`), not the playlist
  currently being browsed.
- If that playlist exists, map its `trackIds` through the tracks store.
- Otherwise use all tracks. A track that belongs to no playlist therefore
  falls back to the all-tracks queue.
- Filter `disabled`.
- If shuffle, `.toSorted(() => 0.5 - rng())` (a biased random comparator).

`queuePlaylistId` is captured when a track starts:

- Prefer the currently browsed playlist when it contains the track.
- Otherwise use the first playlist that contains the track.
- Otherwise `null`, meaning all tracks.

`actualiseQueue()` rebuilds the queue when the playback playlist changes,
shuffle toggles, playlist contents change, or explicitly after
import/remove/sort. `watchPlaylist()` watches the playback playlist ID plus the
playlist track IDs and track/disabled signature. Browsing another playlist
does not rebuild the queue while a track is current, so previous/next stay
bound to the playing track's playlist. Selecting a playlist only seeds the
queue when nothing is playing.

### Next/previous

- `hasNextTrack`: false at the end unless repeat mode is `list`.
- `playNext`:
  - repeat `track`: replay current track from the beginning;
  - if no next, stop and reset progress;
  - if at the last queue item and repeat is `list`, wrap the index to the
    start of the queue.
- `playPrev`: if current time ≥ 5s, restart the track; otherwise move back one
  queue item.
- `removeTrackFromQueue`: removes all instances, stops if it was current, and
  plays next if it was playing.
- `queueTrackNext(track)` / `queueTrackLast(track)`: move a track to just after
  the current item or to the end of the queue. Existing occurrences are moved
  instead of duplicated, and the current item keeps playing.
- `onend` always calls `playNext`.
- With `jukeboxSmoothTrackChange` enabled, `playTrack` fades the previous
  Howl out over 1.2 s, detaches its callbacks, then unloads it, while the new
  Howl fades in on `onplay`. During automatic playback the next track starts
  1.2 s before the end so the two tracks overlap instead of waiting for `onend`.

### Media Session

Registers play/pause/prev/next handlers and updates `MediaMetadata` with title,
artist, and artwork (string or Blob via the shared picture cache). Album is
hard-coded to "Owlbear's DMH".

### Restore last track

`init()` loads tracks/playlists, applies `jukeboxLastVolume`, sets up the media
session, calls `restoreLastTrack()`, then `watchPlaylist()`.

`restoreLastTrack` prepares the audio file at the saved progress but does not
play it. Because `prepareAudioFile` sets `currentTrack`, the UI shows the
restored track paused.

### New-track detection

`playTrack` captures the previous track ID before `prepareAudioFile` and resets
progress when the track actually changes.

`prepareAudioFile` already assigned `currentTrack = track`, so `isNewTrack` is
always false and `resetDuration()` never runs. The new Howl starts at 0, so
playback is correct, but `currentTime` may briefly show the previous track's
position until `onplay/onseek` updates it.

## Library page (`JukeboxView.vue`)

- Left: `BaseListView` in list mode with `TrackCard` rows.
- Right drawer: `PlaylistList`.
- Footer: `JukeboxPlayer` with animated background, no artwork.
- The list shows either all tracks (no playlist selected) or the selected
  playlist's tracks, in playlist order.
- Dragging is enabled only when a playlist is selected; reorder writes
  `playlist.trackIds` and resorts the queue.
- Track click toggles play if it is the active track, otherwise starts it from
  the playlist.
- A per-row icon-only actions menu (`IconDotsVertical`) contains Add to
  Playlist, Play next, Play last, and Remove.
- Play next/last reorder the live queue without interrupting the current track.
- Remove deletes the track, removes it from every playlist, deletes the file
  record, and updates the local list.
- Selecting a playlist only changes the browsed track list. While a track is
  current, playback controls stay bound to that track's playlist; the queue
  switches when another track is started.

The page also registers document-level drag listeners and removes them on
unmount. The `filesStore` is loaded but unused.

## Playlists

- `PlaylistList` shows "All Tracks", then playlists sortable via drag.
- Playlist sort order is persisted as `sortOrder`.
- Edit opens `PlaylistEditor` (name, modules, description).
- `AddToPlaylistModal` toggles track membership in existing playlists and can
  create a new playlist inline; the created playlist receives the current track
  immediately and appears checked in the list.
- Remove has no confirmation and does not affect tracks.

## Player UI

- Progress slider (fraction 0..1), current/remaining toggle, duration.
- Transport controls use a three-column grid (`1fr auto 1fr`): shuffle/repeat
  left, previous/play/next exactly centered, volume right.
- Shuffle and repeat controls.
- Volume button with hover popup, mouse-wheel adjustment, a percentage label
  in the popup, and a native title/aria label with the current level.
- Settings button next to volume opens a menu with persisted player options:
  - **Smooth track change** (off by default): cross-fades outgoing/incoming
    tracks over ~1.2 s when the track changes.
  - **Animate player background** (on by default): enables the album-colour
    morph gradient in both the footer player and the dialog card.
- Animated album-colour background: while playing with `animatedBackground`,
  a `.animated-gradient-surface` pseudo-element uses `--custom-gradient` (from
  `track.palette` or `track.color`) and drifts/zooms via the
  `jukebox-gradient-morph` animation. The gradient is built from one blurred
  radial blob per palette colour over a soft base gradient, so colours flow
  into each other instead of sweeping in a single linear direction. The worker
  requests four palette colours.
- The bottom-drawer player is one animated surface. In the jukebox dialog the
  `QCard` itself owns the surface, so the header toolbar and player content
  share a single animation; the embedded player is rendered without its own
  background animation.
- Controls inherit `--jp-control-color`, derived from the palette with the best
  worst-case contrast (dark or white). Sliders, time labels, buttons, and the
  track title therefore stay readable as the gradient animates.
- The jukebox footer has no extra padding, so the player fills it, but keeps the
  grey player-panel background and an external drop shadow above its top edge.
- The gradient renders in an absolutely positioned, clipped layer (`.animated-gradient-layer`)
  so its oversized animated pseudo-element cannot create scrollbars on the
  scrollable dialog card.

## Known problems

### Color extraction (fixed)

`color-from-image.ts#getArgs` now honors `args.format`, so the worker's
`format: 'hex'` request returns hex strings. `track.color` and `track.palette`
are valid CSS colors, and gradients/contrast calculations work.

### Shared picture cache (fixed)

`AlbumPicture` no longer clears the shared cache on unmount. Artwork URLs are
revoked when the jukebox page unmounts. Cache keys use blob identity instead of
`size-type`, avoiding collisions between different covers.

### Gradient division by zero (fixed)

`useAnimatedGradient` special-cases a one-color palette instead of dividing by
zero.

### Duplicate files and shared deletion (fixed)

Re-adding the same file reuses its track; deleting a track only deletes the
file record when no other track references it.

### Permission prompts at startup (fixed)

`verifyFilePermission` returns immediately when permission is already granted
and catches request failures during startup restore.

### Queue growth under repeat-list (fixed)

`playNext` wraps the queue index instead of appending the playlist on every
loop.

### `playTrack` new-track detection (fixed)

The previous track ID is captured before preparation, so changing tracks resets
progress as intended.

### Browser support

- File System Access handles only work in Chromium.
- Firefox/Safari fall back to Blob storage, which copies audio files into
  IndexedDB and consumes quota.
- iOS background audio behavior is not explicitly handled.

### Misc

- `JukeboxTrack.playlistIds` is dead data.
- `formatTime` lives in jukebox utils but is reused by timers.
- Media Session artwork only works with string pictures (Web URLs); Blob
  pictures are ignored.
- `album` metadata is hard-coded in Media Session.
- No search, sort (artist/album), or filter in the library.
