# File Handling and Audio Metadata

## Purpose

The app reads user-selected files without uploading them. The generic file API
supports three storage strategies behind one interface:

1. **File System Access API** (preferred, Chromium): keep a
   `FileSystemFileHandle` in IndexedDB and re-read the file when needed.
   Permission may be requested again after reload.
2. **OPFS** (origin-private file system): stream large fallback files into an
   app-owned `files/` directory. Used for Blob picks at or above 8 MB.
3. **Blob fallback** (Firefox/Safari or when the APIs fail): store the
   `File`/`Blob` itself in IndexedDB.

Jukebox metadata extraction (title/artist/album/artwork/color) runs in a Web
Worker so the UI stays responsive.

## Key files

| File                         | Role                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `index.ts`                   | Public generic file API                                |
| `pickFiles.ts`               | File/directory pickers with FSA → input fallback       |
| `access.ts`                  | Source → File/URL, permission checks                   |
| `types.ts` / `signature.ts`  | Generic stored-file types and dedupe signature         |
| `fileStorage.ts`             | Generic `files` IndexedDB CRUD, dedupe and OPFS policy |
| `opfs.ts`                    | OPFS read/write/delete/list/clear and threshold        |
| `streams.ts`                 | Chunked copy with progress and cancellation            |
| `save.ts`                    | Save picker + download fallback                        |
| `persist.ts`                 | Storage estimate, persistence and byte formatting      |
| `diagnostics.ts`             | File counts by source kind and unavailable records     |
| `hash.ts`                    | Streaming SHA-256 + Web Crypto fast path               |
| `markdownUrls.ts`            | `dmh-file://` markdown refs and object-URL resolution  |
| `zip.ts`                     | Blob-based ZIP reader for sound-pack imports           |
| `fileReferences.ts`          | Shared-file deletion reference providers               |
| `registerFileReferences.ts`  | Jukebox/map reference providers                        |
| `FileSystemUtils.ts`         | Audio duration probe + metadata worker orchestration   |
| `worker/metadata.worker.ts`  | `music-metadata` parse + image color extraction        |
| `worker/color-from-image.ts` | Average/prominent color and palette                    |
| `src/jukebox/stores.ts`      | Jukebox track/playlist stores                          |

## Generic file API

Consumers import only the public API from `@/utils/files`; the File System
Access and blob implementations stay hidden.

```ts
pickFiles(options?): Promise<PickedFile[]>
pickDirectory(options?): Promise<PickedFile[]>
getPickedFileFromDataTransferItem(item): Promise<PickedFile | null>
getFileFromSource(source): Promise<File>
getUrlFromSource(source): Promise<string>
verifySourcePermission(source, mode?): Promise<boolean>

importFile(file, options?): Promise<{ file: StoredFile; created: boolean }>
importStoredFile(file, source, options?): Promise<ImportedFile>
relinkStoredFile(fileId, file, source, options?): Promise<StoredFile | undefined>
migrateStoredFileToOpfs(file): Promise<StoredFile>
migrateAllBlobFilesToOpfs(): Promise<number>
deleteFileIfUnreferenced(fileId): Promise<boolean>

hashBlob(blob, options?): Promise<string>
hashText(text): Promise<string>
sha256Hex(data): Promise<string>
findStoredFileByContentHash(hash): Promise<StoredFile | undefined>

openZip(blob): Promise<ZipEntries>
readZipText(entries, candidates): Promise<string | null>
readZipBlob(entries, candidates): Promise<Blob | null>
listZipFiles(entries, prefix): ZipEntry[]

copyBlob(blob, sink, options?): Promise<void>
saveBlob(blob, options): Promise<'saved' | 'downloaded' | 'cancelled'>
createObjectUrlHandle(blob): { url, revoke }

supportsOpfs(): boolean
writeOpfsFile(path, blob, options?): Promise<void>
readOpfsFile(path): Promise<File>
deleteOpfsFile(path): Promise<void>
listOpfsFiles(dir?): Promise<OpfsFileInfo[]>
clearOpfsFiles(): Promise<void>
clearOpfsData(): Promise<void>

getStorageEstimate(): Promise<StorageEstimateInfo>
isStoragePersisted(): Promise<boolean>
requestPersistentStorage(): Promise<boolean>
formatBytes(bytes): string
getFileStorageDiagnostics(): Promise<FileStorageDiagnostics>
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

- `getFileFromSource()` calls `handle.getFile()` for handles, reads an OPFS
  file for OPFS sources, and reconstructs a `File` from blob sources.
- `verifySourcePermission()` checks `queryPermission` first and only calls
  `requestPermission` when needed. Blob and OPFS sources always return `true`.
- Drag/drop uses `getPickedFileFromDataTransferItem()`, which prefers
  `getAsFileSystemHandle()` and falls back to `getAsFile()`.
- `pickDirectory()` recursively collects file handles (or a
  `webkitdirectory` input fallback) for bulk imports.

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
  contentHash?;
  source;
  createdAt;
  updatedAt;
}
```

- `importStoredFile(file, source, options)` deduplicates by
  `name | size | lastModified | type` and returns either the existing record or
  a new one. With `storage: 'auto'`, handles are preserved zero-copy and Blob
  fallbacks at or above `OPFS_THRESHOLD_BYTES` (8 MB) are streamed into OPFS.
- `contentHash: true` computes a SHA-256 and deduplicates by content as well as
  metadata. Hashing streams for large files and uses Web Crypto for small ones.
- `importFile(file, options)` is the convenience wrapper that defaults the
  source to the picked Blob.
- `relinkStoredFile(fileId, file, source)` replaces a missing or
  permission-lost source without changing the file ID or business references.
- `migrateStoredFileToOpfs()` moves an existing large IDB blob to OPFS;
  `getStoredFileBlob()` applies it lazily and the Settings panel can run it in
  bulk.
- Jukebox tracks store `fileId → files.id`; they keep audio metadata separately
  in `jukebox_tracks`.
- Maps store `map.fileId → files.id`; image metadata lives in
  `map_image_metadata`. Large Blob-backed map images are promoted to OPFS when
  the location is saved.
- Deleting business records calls `deleteFileIfUnreferenced(fileId)`, which
  checks registered jukebox/map reference providers before removing the
  generic record. `deleteStoredFile()` also removes the matching OPFS file.

Legacy `jukebox_files` and `map_files` records are migrated into `files`
preserving their IDs. The old stores are cleared and no longer used.

### Source kinds

```ts
type StoredFileSource =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'handle'; handle: FileSystemFileHandle }
  | { kind: 'opfs'; path: string };
```

OPFS files live under `files/<fileId>` in the origin-private file system. The
metadata (`name`, `type`, `size`, `lastModified`) remains in IndexedDB.

### Large files

`copyBlob()` reads a Blob in chunks, awaits the sink, reports progress and
honours an `AbortSignal`. OPFS writes use it, so a large fallback file is never
buffered as a second full-size copy. The File System Access save picker uses the
same streaming path through `saveBlob()`.

## Backup implications

Backup/restore includes `files`, `jukebox_tracks`, `jukebox_playlists` and
`map_image_metadata`.

Backup v2 writes:

- `manifest.json` with the format/version and store list;
- `files.json` with StoredFile metadata;
- binary `files/<fileId>` entries for Blob and OPFS sources.

Handle sources are written as `unavailable` because a
`FileSystemFileHandle` is not JSON-serializable. When
`backupAllStores({ includeExternalFiles: true })` is used (and Settings has the
matching toggle enabled), readable handles are copied into the archive as binary
entries instead. Restoring writes binary file entries back to OPFS when
available and falls back to IDB Blobs. Restoring an older backup still converts
`jukebox_files.json` / `map_files.json` and legacy `blob-data` entries.

## Limitations

- MIME/extension validation beyond the picker filter is not enforced.
- No garbage collection for files that become orphaned during map image
  replacement.
- No quota warning before a write; the Settings panel reports usage after the
  fact.
- Worker-per-file and sequential metadata extraction make bulk import slow.
- Color/palette output is currently wrong.
- FileSystem handles cannot be serialized; they are marked unavailable or
  copied only when external files are explicitly included in a backup.
- Generic file IDs are generated; legacy IDs are preserved by migration.
- Reconnect matching uses filename and size; a per-file picker would be more
  precise for large libraries.
