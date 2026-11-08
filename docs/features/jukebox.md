# Jukebox

## Purpose

A local music player for session ambience. Users add audio files, create
playlists, and play music through a global howler-based player that survives
navigation. Audio bytes live in the generic file layer as File System Access
handles, IndexedDB Blobs, or OPFS files.

## Key files

| File                                            | Role                                                  |
| ----------------------------------------------- | ----------------------------------------------------- |
| `src/jukebox/types.ts`                          | `JukeboxTrack`, `JukeboxPlaylist`                     |
| `src/jukebox/stores.ts`                         | Track/playlist stores + picture URL cache             |
| `src/jukebox/playerStore.ts`                    | Playback engine, queue, shuffle/repeat, media session |
| `src/jukebox/JukeboxView.vue`                   | Library/playlist page                                 |
| `src/jukebox/composables/*`                     | Shared edit-mode, importing and bulk-selection state  |
| `src/jukebox/components/JukeboxPlayer.vue`      | Player controls                                       |
| `src/jukebox/components/SoundControlDialog.vue` | Snapable global panel with Jukebox/Ambient tabs       |
| `src/jukebox/components/PlaylistList.vue`       | Right-drawer playlist navigator                       |
| `src/jukebox/components/PlaylistEditor.vue`     | Playlist create/edit + linked entities                |
| `src/jukebox/components/BulkLinkingModal.vue`   | Bulk playlist link editing                            |
| `src/jukebox/components/TrackCard.vue`          | Track row                                             |
| `src/jukebox/components/TrackInfo.vue`          | Title/artist/artwork                                  |
| `src/jukebox/components/AlbumPicture.vue`       | Artwork with URL cache                                |
| `src/jukebox/components/AddToPlaylistModal.vue` | Playlist membership via entity linking                |
| `src/jukebox/useAnimatedGradient.ts`            | Palette-based background                              |
| `src/jukebox/utils/waveform.ts`                 | Web Audio waveform SVG generation                     |
| `src/utils/formatTime.ts`                       | Shared time formatter (also used by timers)           |
| `src/utils/files/*`                             | File access + metadata extraction                     |

## Data model

See [architecture/data-model.md](../architecture/data-model.md#jukebox-entities).

- Audio files are generic `StoredFile` records in the `files` store. A record
  has a generated `id`, a metadata `signature`, and a `source` that is a
  `FileSystemFileHandle`, a `Blob`, or an OPFS path. File imports deduplicate by
  signature (`name`, `size`, `type`, `lastModified`); the jukebox does not
  request content hashing.
- `JukeboxTrack` stores extracted metadata and references `fileId`. Album art
  is stored as a `Blob` (`picture`) plus derived `color`/`palette`.
- `JukeboxTrack.waveform` holds a generated inline SVG waveform string, or
  `null` when the audio could not be decoded. While a track is playing, its
  `TrackCard` row renders that SVG as a background waveform: a dim layer plus a
  brighter layer clipped to the current playback progress. The waveform area
  starts after the album artwork/icon and keeps left and right padding inside
  the track text column. Play/pause animates the waveform between zero height
  and its full row height.
- `JukeboxPlaylist` stores `trackIds` in display order, `sortOrder` for playlist
  order, and `links` for linked locations/parties/pawns/encounters.
- `JukeboxTrack.playlistIds` is declared but never maintained; membership is
  read from playlists.

None of these stores use schema validation, because `FileSystemFileHandle` and
`Blob` are not plain JSON.

## Importing tracks

Three entry points:

1. **Add Tracks** (`pickFiles` from the generic file API):
   - Chromium with `showOpenFilePicker`: returns handles (persistent
     references; permission may be requested later).
   - Other browsers, or if the API fails: falls back to a temporary
     `<input type=file>` and stores Blobs.
2. **Add folder** (`pickDirectory`, recursive): uses the directory picker in
   Chromium and a `webkitdirectory` input elsewhere; handles are kept when
   available.
3. **Drag and drop** on the document:
   - `onDragEnter/Over/Leave` track drag state and show a full-page drop zone.
   - `onDrop` uses `getPickedFileFromDataTransferItem()`, which prefers
     `getAsFileSystemHandle()` and falls back to `getAsFile()`.
   - Only `audio/*` or `.mp3/.wav/.ogg/.flac/.aac` files are accepted.

`processFiles`:

1. Calls `importStoredFile(file, source)`, which reuses an existing `files`
   record with the same signature or writes a new one. Large blobs may be
   promoted to OPFS by the generic storage layer.
2. Reuses an existing track with the same `fileId` when one exists.
3. Extracts metadata through `extractTrackMetadata`:
   - duration via an `<audio>` element,
   - tags/artwork via a dedicated worker (`music-metadata`, `OffscreenCanvas`),
   - dominant color and up to four palette colors via a bundled color extractor
     (`amount: 4`, `sample: 10`, `group: 30`, hex output). Fewer than four
     colors are returned only when the artwork has fewer distinct grouped
     colors.
4. Generates a waveform via `createWaveformSvg(file)`:
   - decodes the file with `AudioContext.decodeAudioData`,
   - downsamples the first channel into peak bars and normalizes them against
     the loudest bar so quiet recordings still fill the waveform height,
   - emits a compact single-path inline SVG.
   - Returns `null` when Web Audio is unavailable or decoding fails, so the
     import still succeeds without a waveform.
5. Creates a track when the file was not already imported.
6. If a playlist is selected, appends new track IDs in order.
7. Calls `playerStore.actualiseQueue()`.

Re-adding the same file reuses both the stored file and its existing track; it
does not create a duplicate track.

While an import is running (picker open, files processing, or dropped files
being handled), the main Add Tracks button is disabled and shows a loading
state, and the sidebar's Edit-mode switch is disabled.

## Playback engine (`playerStore.ts`)

### State

```
currentTrack, isPlaying, currentTime, duration, volume, lastVolume
queue: JukeboxTrack[], queueIndex: number, queuePlaylistId: string | null
```

Shuffle, repeat mode, the browsed playlist, and the last track plus its
playback playlist context are stored in `configStore` (localStorage).

### Howler integration

`prepareAudioFile(track, seekTo)`:

1. Loads the file record.
2. Verifies read permission for handle sources (`queryPermission`, then
   `requestPermission` when needed). Blob and OPFS sources need no permission.
3. Gets the `File` from the handle/blob/OPFS source, creates an object URL, and
   determines format from MIME type or extension.
4. Destroys the previous Howl and creates a new one with `html5: true`.
5. Event handlers update `isPlaying`, `duration`, progress (via
   `requestAnimationFrame`), seek state, and load errors. `onplay` pauses
   ambient playback through the playback coordinator.
6. Sets `currentTrack`.

If the file record is missing, permission is denied, the file is not found, or
reading it fails, `prepareAudioFile` returns `false`. `playTrack` then marks the
track `disabled: true`, shows a `Track not available` notification, and lets
the caller skip to the next playable track. Disabled tracks render muted and
are filtered out of playback queues.

`playTrack` starts playback and stores `jukeboxLastTrackId` plus
`jukeboxLastPlaylistId` (`null` for the all-tracks context).

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

`queuePlaylistId` is captured when a track starts and follows the browsed
context:

- If a playlist is selected and contains the track, use that playlist.
- If All Tracks is selected, use `null` even when the track also belongs to a
  playlist.
- If the selected playlist does not contain the track, fall back to `null`.

The chosen context is persisted as `jukeboxLastPlaylistId` alongside the last
track.

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
  - skip unavailable tracks until a playable one is found;
  - if no next, stop and reset progress;
  - if at the last queue item and repeat is `list`, wrap the index to the
    start of the queue.
- `playPrev` skips unavailable tracks backwards; if current time ≥ 5s, it
  restarts the track instead.
- Clicking a track that is not yet marked disabled but whose file is unavailable
  disables it, shows the notification, and starts the next available track in
  the same queue.
- Clicking an already disabled track only shows the notification; it does not
  change the current track, queue, or playback context.
- Next/previous enabled states remain based on queue position, not on file
  availability. The exception is an unavailable last track with repeat off:
  once skipping reaches the end, the next button becomes disabled.
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
artist, and artwork. String pictures are used directly; Blob pictures are
converted to cached object URLs by the shared picture cache. Album is
hard-coded to "Owlbear's DMH".

### Restore last track

`init()` loads tracks/playlists, applies `jukeboxLastVolume`, sets up the media
session, calls `restoreLastTrack()`, then `watchPlaylist()`.

`restoreLastTrack` prepares the audio file at the saved progress but does not
play it. It restores the saved playback context from `jukeboxLastPlaylistId`:
a playlist ID when playback came from that playlist, or `null` for all tracks.
The currently browsed playlist is ignored. Because `prepareAudioFile` sets
`currentTrack`, the UI shows the restored track paused.

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
- In edit mode, a selected playlist's tracks can be sorted from their per-row
  drag handle; reorder writes `playlist.trackIds` and resorts the queue.
  Clicking the row itself plays the track. A pointer down/up on a handle without
  a positional change is ignored and does not resort the queue.
- Edit mode also shows bulk-selection checkboxes for tracks and playlists. Tracks
  in the All Tracks view still get a checkbox (though they have no sortable
  order), so they can be selected without drag handles.
- Selection is exclusive: selecting tracks disables playlist checkboxes and
  selecting playlists disables track checkboxes.
- Shift-clicking a track or playlist checkbox selects or deselects the whole
  range between the last clicked item and the current one in display order.
- While items are selected, a sticky bulk panel appears above the list with a
  `Select all` pseudo-link and a `Cancel selection` pseudo-link. `Select all`
  selects every item in the current view (the visible playlist/all-tracks list
  or the playlist sidebar) and hides once everything is selected. `Cancel
selection` clears the current selection. The panel reserves its own layout
  space and overlays items while the list scrolls.
- While edit mode is on and at least one row is selected, the main header shows
  an Edit/Delete button group on the left side, before the title area.
  - Edit on selected tracks opens a playlist linking modal; applying it adds
    the selected tracks to checked playlists and removes them from unchecked
    playlists.
  - Delete confirms once, then removes all selected tracks/playlists. Deleting
    the active playlist clears the active selection.
- Selection is cleared when leaving edit mode, switching playlists, or applying
  a bulk action.
- Track click toggles play if it is the active track, otherwise starts it from
  the playlist.
- A per-row icon-only actions menu (`IconDotsVertical`) contains Add to
  Playlist, Play next, Play last, and Remove.
- Play next/last reorder the live queue without interrupting the current track.
- Remove asks for confirmation, then deletes the track, removes it from every
  playlist, deletes the file record when unreferenced, and updates the local
  list.
- Selecting a playlist only changes the browsed track list. While a track is
  current, playback controls stay bound to that track's playlist; the queue
  switches when another track is started.
- Add Tracks opens the file picker; the header folder button imports a whole
  folder recursively.

The page also registers document-level drag listeners and removes them on
unmount.

## Playlists

- `PlaylistList` shows "All Tracks", then playlists. In edit mode playlists use
  a per-row drag handle for sorting; clicking the row selects the playlist.
- A View/Edit mode switch sits at the bottom of the playlist sidebar.
  - View mode: no drag handles, no playlist manage buttons on hover, and no
    Remove item in track menus.
  - Edit mode: sorting handles appear, playlist manage buttons show on hover,
    and track menus include Remove.
  - The "New playlist" row is always available in both modes.
- The All Tracks row or the playback playlist gets a left accent border,
  depending on the active playback context. The browsed playlist does not
  affect this indicator.
- Playlist sort order is persisted as `sortOrder`; sorting is available only
  in edit mode.
- Edit opens `PlaylistEditor`: Main tab for name/description plus a Linked
  entities tab for locations, parties, pawns and encounters.
- `AddToPlaylistModal` uses the shared `EntitiesLinking` layout with
  `kind="playlist"`. Linked playlists show as removable rows; the add dialog
  provides playlist search and creation. Linked playlists are pre-selected in
  the dialog, so they can also be unlinked there. Adding or creating a playlist
  links the current track immediately, and removing a linked playlist unlinks
  it.
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
  - **Animate player background** (on by default): shows the album-colour
    gradient in both the footer player and the sound-control panel. The gradient is
    static when playback is paused and morphs only while playing; pausing keeps
    the animation phase so resuming continues from the same point instead of
    restarting. Turning the setting off removes the gradient entirely.
  - **Display cover while playing** (on by default): controls the album artwork
    in the sound-control panel. The footer player stays compact and does not
    render artwork. When shown in the panel, the artwork sits to the left of the
    track details, progress bar and transport controls.
  - **Show player dialog** (on by default, stored as
    `jukeboxUseMiniPlayer`): the app-menu Jukebox item opens the snapable
    sound-control panel. When off, the item navigates to `/jukebox` instead.
    The panel has Jukebox and Ambient tabs in builds where the ambient feature
    is enabled; it opens on whichever source is currently playing.
  - The same four player options are also available in the app Settings dialog.
- Album-colour background: when enabled with `animatedBackground`, a
  `.animated-gradient-surface` pseudo-element uses `--custom-gradient` (from
  `track.palette` or `track.color`, both derived from the album cover). The
  gradient is built from one blurred radial blob per palette colour over a soft
  base gradient, so colours flow into each other instead of sweeping in a
  single linear direction. The worker requests four palette colours.
- The bottom-drawer player is one gradient surface. In the sound-control panel
  the `QCard` itself owns the surface, so the header toolbar and player content
  share a single background; the embedded player is rendered without its own
  gradient. The gradient is only shown on the Jukebox tab and is removed when
  the Ambient tab is selected. The panel is a snapable dialog with two modes.
  When docked it is a bottom panel whose width and horizontal position follow
  the page-content area, excluding the left menu and right sidebar; the album
  cover sits to the left of the progress and transport controls. Dragging the panel away from the
  bottom switches it to a floating dialog with the larger album cover centred
  above the track details. Dragging the floating dialog back near the bottom
  docks it again, while anywhere else it can be moved freely across the page.
  The mode transition starts when the drag crosses the detach or dock
  threshold, not when the pointer is released. The panel detaches after a
  5 px upward drag; the dock snap area is measured from the floating dialog's
  bottom edge and is 10 px deep. The snap catcher is armed only after the
  dialog has left that bottom area. Docking ends the drag gesture, so further
  pointer movement does not immediately pull the panel back out. When detaching,
  the floating dialog is positioned so the centre of its header sits under the
  pointer.
- Track changes crossfade the outgoing and incoming gradient layers. If the next
  track has no cover palette, the current gradient fades out instead.
- Controls inherit `--jp-control-color`, derived from the palette with the best
  worst-case contrast (dark or white). Sliders, time labels, buttons, and the
  track title therefore stay readable over the gradient, whether static or
  animating.
- The jukebox footer removes the layout's extra padding so the player fills it,
  keeps the grey player-panel background, and adds a gradient shadow above its
  top edge. The non-modal player itself keeps a 1rem top inset.
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

File imports deduplicate by signature, and re-adding the same file reuses its
track. Deleting a track only deletes the file record when no other track (or
other registered feature) references it.

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
  IndexedDB (or OPFS where supported) and consumes quota.
- iOS background audio behavior is not explicitly handled.

### Misc

- `JukeboxTrack.playlistIds` is dead data.
- `formatTime` lives in the shared `utils/formatTime.ts` and is reused by
  timers.
- `album` metadata is hard-coded in Media Session.
- No search, sort (artist/album), or filter in the library.
