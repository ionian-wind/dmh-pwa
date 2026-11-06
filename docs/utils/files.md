# File Handling and Audio Metadata

## Purpose

The app reads user-selected files without uploading them. The generic file API
supports two storage strategies behind one interface:

1. **File System Access API** (preferred, Chromium): keep a
   `FileSystemFileHandle` in IndexedDB and re-read the file when needed.
   Permission may be requested again after reload.
2. **Blob fallback** (Firefox/Safari or when the API fails): store the
   `File`/`Blob` itself in IndexedDB.

Jukebox metadata extraction (title/artist/album/artwork/color) runs in a Web
Worker so the UI stays responsive.

## Key files

| File                         | Role                                                    |
| ---------------------------- | ------------------------------------------------------- |
| `index.ts`                   | Public generic file API                                 |
| `pickFiles.ts`               | Generic picker with File System Access → input fallback |
| `access.ts`                  | Source → File/URL, permission checks                    |
| `types.ts` / `signature.ts`  | Generic stored-file types and dedupe signature          |
| `fileStorage.ts`             | Generic `files` IndexedDB CRUD and dedupe imports       |
| `fileReferences.ts`          | Shared-file deletion reference providers                |
| `registerFileReferences.ts`  | Jukebox/map reference providers                         |
| `FileSystemUtils.ts`         | Audio duration probe + metadata worker orchestration    |
| `worker/metadata.worker.ts`  | `music-metadata` parse + image color extraction         |
| `worker/color-from-image.ts` | Average/prominent color and palette                     |
| `src/jukebox/stores.ts`      | Jukebox track/playlist stores                           |

## Generic file API

Consumers import only the public API from `@/utils/files`; the File System
Access and blob implementations stay hidden.

```ts
pickFiles(options?): Promise<PickedFile[]>
getPickedFileFromDataTransferItem(item): Promise<PickedFile | null>
getFileFromSource(source): Promise<File>
getUrlFromSource(source): Promise<string>
verifySourcePermission(source, mode?): Promise<boolean>

importStoredFile(file, source): Promise<{ file: StoredFile; created: boolean }>
deleteFileIfUnreferenced(fileId): Promise<boolean>
```

`PickedFile = { file: File; source: StoredFileSource }`.

`pickFiles()` behavior:

1. If `showOpenFilePicker` exists, use the File System Access API and return
   `{ kind: 'handle', handle }` sources.
2. If the picker is aborted, return an empty array.
3. If the picker fails for another reason, fall back to a regular
   `<input type="file">` and return `{ kind: 'blob', blob }` sources.
4. If the API is unavailable, use the input fallback directly.

The input fallback handles both `change` and `cancel`, with a window-focus
fallback for browsers that never emit `cancel`.

## Source access

- `getFileFromSource()` calls `handle.getFile()` for handles and reconstructs a
  `File` from blob sources.
- `verifySourcePermission()` checks `queryPermission` first and only calls
  `requestPermission` when needed. Blob sources always return `true`.
- Drag/drop uses `getPickedFileFromDataTransferItem()`, which prefers
  `getAsFileSystemHandle()` and falls back to `getAsFile()`.

Handles survive page reloads in Chromium, but the browser may require a new
permission grant. Tracks that fail permission simply fail to play.

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

All domains share the generic `files` object store:

```ts
interface StoredFile {
  id;
  name;
  size;
  type;
  lastModified;
  signature;
  source;
  createdAt;
  updatedAt;
}
```

- `importStoredFile(file, source)` deduplicates by
  `name | size | lastModified | type` and returns either the existing record or
  a new one.
- Jukebox tracks store `fileId → files.id`; they keep audio metadata separately
  in `jukebox_tracks`.
- Maps store `map.fileId → files.id`; image metadata lives in
  `map_image_metadata`.
- Deleting business records calls `deleteFileIfUnreferenced(fileId)`, which
  checks registered jukebox/map reference providers before removing the
  generic record.

Legacy `jukebox_files` and `map_files` records are migrated into `files`
preserving their IDs. The old stores are cleared and no longer used.

## Backup implications

Backup/restore includes `files`, `jukebox_tracks`, `jukebox_playlists` and
`map_image_metadata`. Blob sources are serialized as base64 data; handles are
marked unavailable because `FileSystemFileHandle` is not JSON-serializable.
Restoring an older backup converts `jukebox_files.json` / `map_files.json` into
the generic store.

## Limitations

- No folder import.
- No MIME/extension validation beyond the picker filter.
- Generic files deduplicate by metadata signature, not content hash.
- No garbage collection for files that become orphaned during map image
  replacement.
- No permission-reconnect flow.
- No quota estimation.
- Worker-per-file and sequential metadata extraction make bulk import slow.
- Color/palette output is currently wrong.
- FileSystem handles cannot be serialized and may need relinking after restore.
- Generic file IDs are generated; legacy IDs are preserved by migration.

See [proposals/generic-file-handling.md](../proposals/generic-file-handling.md)
for the proposed OPFS, streaming, quota and binary-backup upgrade.
