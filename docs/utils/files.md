# File Handling and Audio Metadata

## Purpose

The jukebox must read local audio files without uploading them. The app
supports two storage strategies:

1. **File System Access API** (Chromium): keep a `FileSystemFileHandle` in
   IndexedDB and re-read the file when needed. Permission may be requested
   again after reload.
2. **Blob fallback** (all other browsers): store the `File`/`Blob` itself in
   IndexedDB.

Metadata extraction (title/artist/album/artwork/color) runs in a Web Worker so
the UI stays responsive.

## Key files

| File | Role |
| --- | --- |
| `IFileHandler.ts` | Interface + `AudioFileData` |
| `index.ts` | Chooses handler at module load (`fileHandler` singleton) |
| `FileSystemFileHandler.ts` | `showOpenFilePicker`, handle reading, drop handles |
| `BlobFileHandler.ts` | `<input type=file>` fallback |
| `FileSystemUtils.ts` | Duration probe + worker orchestration |
| `worker/metadata.worker.ts` | `music-metadata` parse + image color extraction |
| `worker/color-from-image.ts` | Average/prominent color and palette |
| `src/jukebox/stores.ts` | Persist file records and helper CRUD |

## Handler selection

```ts
export function createFileHandler() {
  if ('showOpenFilePicker' in window) return new FileSystemFileHandler();
  return new BlobFileHandler();
}
export const fileHandler = createFileHandler();
```

Selection happens once at module evaluation. In environments where
`window.showOpenFilePicker` is added later (polyfill), the handler will not
change.

## `IFileHandler`

```ts
interface IFileHandler {
  name: string;
  isSupported(): boolean;
  pickAudioFiles(): Promise<AudioFileData[]>;
  getFile(source: JukeboxFileSource): Promise<File>;
  extractTrackMetadata(file: File): Promise<Record<string, unknown>>;
  getAsFileSystemHandle(item: DataTransferItem): Promise<FileSystemFileHandle | null>;
}
```

`AudioFileData = { file: File; source: JukeboxFileSource }`.

## File System Access handler

- `pickAudioFiles()` calls `showOpenFilePicker` with audio types, gets a `File`
  and returns `{ kind: 'handle', handle }` sources.
- `getFile(source)` calls `handle.getFile()`.
- `getAsFileSystemHandle(item)` calls `item.getAsFileSystemHandle()` and
  accepts only `kind === 'file'`.
- Permissions are checked in the player store, not here:
  ```ts
  const query = await handle.queryPermission({ mode });
  const request = await handle.requestPermission({ mode });
  return query === 'granted' || request === 'granted';
  ```
  Both are always awaited, so the request is made even when already granted.
  Calling `requestPermission` outside a user gesture can reject.

Handles survive page reloads in Chromium, but the browser may require a new
permission grant. The app has no "reconnect library" UI; tracks that fail
permission simply fail to play.

## Blob fallback

- `pickAudioFiles` creates a hidden `<input type=file multiple>` and resolves
  when `onchange` fires. It also handles the `cancel` event and uses a
  window-focus fallback to resolve with an empty list, so `isAddingTracks` does
  not get stuck in Safari/Firefox.
- `getFile` reconstructs a `File` with the original name/type.
- Blobs are stored directly in the `jukebox_files` object store. Large
  libraries can exhaust IndexedDB quota; there is no quota check.

## Duration extraction

`getAudioMetadata(file)`:

1. Creates an `<audio preload="metadata">` with an object URL.
2. Resolves `duration` on `loadedmetadata`.
3. Revokes the URL on success.
4. Rejects on `error`.

`extractTrackMetadata` waits for duration, then spawns a **new Worker per
file**, posts the `File`, and resolves with `{ ...metadata, duration }` on
`success` (or `{}` on error). Workers are terminated after the message.

Potential issues:
- The object URL is not revoked on error.
- A new worker per file is expensive; importing 50 files spawns 50 workers
  sequentially (the loop awaits each).
- If the worker never responds, the promise never resolves.
- `content-type` sniffing is not used; `parseBlob` relies on the File type.

## Metadata worker

`metadata.worker.ts`:

- Polyfills `Buffer` from the `buffer` package.
- `parseBlob(file)` from `music-metadata`.
- If a picture exists:
  - creates a `Blob` from the picture bytes,
  - `createImageBitmap`,
  - draws to an `OffscreenCanvas`,
  - extracts `ImageData`,
  - `getColor` and `getPalette` from `color-from-image`.
- Posts `{ type: 'success', metadata }` with:
  `title, artist, album, genre, year, trackNumber, discNumber, composer,
  comment, lyrics, picture (Blob), color, palette`.
- On error posts `{ type: 'error', error: message }`.

`year`, `trackNumber`, etc. may be numbers or undefined; the track type allows
string or number.

### Color extraction

`color-from-image.ts#getArgs` honors the requested `format` (`array` or `hex`),
so the worker's `format: 'hex'` request stores valid CSS colors for
`track.color` and `track.palette`.

### Palette algorithm

- `getAverage` samples every `4 * sample` bytes and averages RGB.
- `getProminent` groups colors by `group` size and returns the most frequent
  entries.
- `getColor` = average, `getPalette` = prominent.
- Transparent pixels are not filtered.

## Persistence

`jukebox_files` records are written with `putJukeboxFile` and read by
`getJukeboxFile`. The record ID is derived from name/size/lastModified in
`JukeboxView.processFiles`, so re-adding the same unchanged file reuses the
record (and overwrites the source). There is no garbage collection for orphaned
files; deleting a track deletes its file record even if other tracks share it.

## Backup implications

Backup/restore does **not** include `jukebox_files`, `jukebox_tracks`, or
`jukebox_playlists`. A restored profile loses all audio references. Blob files
would need to be exported as binary data to be portable; handles are only valid
on the same origin and device.

## Limitations

- No folder import.
- No MIME/extension validation beyond the picker filter.
- No deduplication of tracks.
- No permission-reconnect flow.
- No quota estimation.
- Worker-per-file and sequential metadata extraction make bulk import slow.
- Color/palette output is currently wrong.
- FileSystem handles cannot be serialized and may need relinking after restore.
