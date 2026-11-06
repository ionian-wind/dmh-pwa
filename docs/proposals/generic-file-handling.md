# Generic File Handling and Large-File Storage

**Status:** core phases implemented. OPFS, streaming helpers, the save picker,
folder import, storage diagnostics and the binary backup v2 are in the tree.
Remaining optional work: streaming ZIP extraction for very large archives,
content hashing, a handle reconnect flow, lazy migration of existing IDB blobs,
and "include external handles" in backups.

**Scope:** every binary the app owns: jukebox audio, ambient sound packs,
location map images, note attachments, module archives, and backups.

**Related documents:**

- [utils/files.md](../utils/files.md) — current file API
- [persistence-and-state.md](../architecture/persistence-and-state.md) — IDB,
  stores and backup
- [image-quick-tools.md](image-quick-tools.md) — first consumer of the new
  helpers
- [image-filters-and-composition.md](image-filters-and-composition.md) — larger
  image workflows

**Inspiration:** the four Habr articles listed in
[References](#references). This document takes the generic Blob, OPFS,
streaming and File System Access ideas from them and leaves out the
server-upload and PNG-trailer techniques.

---

## 1. Summary

Before this work the file layer abstracted over two storage strategies:

1. a `FileSystemFileHandle` for user-owned files (zero-copy, Chromium), and
2. a `Blob` stored directly in IndexedDB (fallback).

That was a good foundation, but it did not scale to large files, backups, or a
future image tool:

- Large fallback files lived inside IndexedDB, where structured-clone and
  transaction costs are high.
- Backup serialized every Blob as base64 inside JSON, inflating the archive and
  holding whole files in memory.
- `importSoundPack()` read the entire `.spk` with `arrayBuffer()` before
  handing it to JSZip.
- Object URLs were managed per feature; the jukebox player created one per
  track and never revoked it.
- There was no folder import, save picker, quota display, persistent-storage
  request, or OPFS storage.

This work adds a **third source kind, OPFS**, a streaming API, a shared save
helper, storage diagnostics, and a versioned backup format that stores file
bytes as binary ZIP entries instead of base64 JSON.

The guiding rule:

> IndexedDB stores metadata. Large bytes live behind a source abstraction,
> preferably as a file handle or an OPFS file, and are read or written as
> streams.

### Implementation notes

Implemented in the current tree:

- `StoredFileSource` now includes `{ kind: 'opfs'; path }`; handle and blob
  sources remain supported.
- `src/utils/files/opfs.ts` provides read/write/delete/list/clear operations and
  an 8 MB fallback threshold.
- `src/utils/files/streams.ts` provides chunked copying with progress and
  cancellation.
- Blob fallbacks at or above the threshold are written to OPFS during
  `importStoredFile()`; handles are still preserved zero-copy.
- `saveBlob()` uses the File System Access save picker when available and
  streams into it, with an anchor-download fallback.
- `pickDirectory()` adds File System Access folder picking and a
  `webkitdirectory` fallback.
- `persist.ts` and `diagnostics.ts` power the Settings → Storage panel.
- Backup v2 writes `manifest.json`, `files.json` and binary `files/<id>`
  entries; restore writes bytes back to OPFS when available and falls back to
  IDB blobs.
- Jukebox playback now revokes its object URL when the track changes or stops.
- The Jukebox header has an "Add folder" action using `pickDirectory()`.

Still open:

- Streaming ZIP extraction for very large `.spk`/module archives. JSZip still
  reads the archive as a whole, although it now receives the Blob directly.
- Optional content hashing and lazy migration of existing IDB blob records.
- Reconnect UI for expired handles and optional "include external files" in
  backups.

---

## 2. Goals and non-goals

### Goals

- One public file API for audio, images, archives and future attachments.
- Keep the zero-copy `FileSystemFileHandle` path for user-owned files.
- Use **OPFS** for fallback files that are large or likely to grow.
- Stream reads and writes; avoid `arrayBuffer()` for large files.
- Expose progress and cancellation for imports, exports and restores.
- Add a shared "save blob" helper with File System Access save-picker support.
- Add folder import for bulk audio/image workflows.
- Add storage quota and persistence diagnostics.
- Replace base64 backup payloads with binary ZIP entries.
- Define a migration path that keeps existing installations working.

### Non-goals

- A backend or chunked server upload. The app remains local-first.
- Automatic cloud sync.
- Editing files inside the user's file system without an explicit action.
- Content-addressed storage as a first step. Metadata signatures stay the
  default dedupe mechanism; a streaming content hash can be added later.

---

## 3. Original state (before implementation)

### 3.1 Source kinds

```ts
// src/utils/files/types.ts
export type StoredFileSource =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'handle'; handle: FileSystemFileHandle };
```

Consumers:

- `pickFiles()` returns a `handle` source when `showOpenFilePicker` exists, and
  a `blob` source from the `<input type="file">` fallback.
- `getFileFromSource()` reads either source.
- `getStoredFileBlob()` returns `source.blob` or `handle.getFile()`.
- Backup converts blob sources to `blob-data` base64 and handle sources to
  `unavailable`.

### 3.2 Known limitations

From [utils/files.md](../utils/files.md):

- No folder import.
- No MIME/extension validation beyond the picker filter.
- Dedupe by metadata signature, not content hash.
- No orphaned-file garbage collection.
- No permission-reconnect flow.
- No quota estimation.
- Worker-per-file metadata extraction is slow for bulk imports.
- Handles cannot be serialized into backups.

Additional observations from the current tree:

- `src/jukebox/playerStore.ts` calls `URL.createObjectURL(file)` for every
  track and never calls `revokeObjectURL`.
- `src/ambient-sound/utils/packManager.ts#importSoundPack()` reads the whole
  `.spk` into an `ArrayBuffer`.
- `backupAllStores()` builds the entire ZIP in memory and base64-encodes every
  Blob.
- `restoreAllStores()` clears stores one at a time; a failure can leave a
  partially restored database.
- Map images are stored at original resolution; there is no import-time
  optimization.

---

## 4. Storage tiers

| Tier       | Source value                 | Bytes live in              | Best for                                | Caveats                                   |
| ---------- | ---------------------------- | -------------------------- | --------------------------------------- | ----------------------------------------- |
| **Handle** | `{ kind: 'handle', handle }` | User's file system         | Files the user already owns             | Origin/device bound; permission may reset |
| **OPFS**   | `{ kind: 'opfs', path }`     | Origin-private file system | Large fallback files, audio, map images | Still subject to quota/eviction           |
| **IDB**    | `{ kind: 'blob', blob }`     | IndexedDB object store     | Small files, legacy records             | Large Blobs inflate DB and memory         |
| **Memory** | transient `File`/`Blob`      | Page memory                | Preview, picker result before save      | Not persisted                             |

Selection policy:

```ts
function chooseSource(file: File, picked: StoredFileSource): StoredFileSource {
  if (picked.kind === 'handle') return picked; // zero-copy
  if (supportsOpfs() && file.size >= OPFS_THRESHOLD) {
    return { kind: 'opfs', path: nextPath(file) };
  }
  return picked; // small blob in IDB
}
```

`OPFS_THRESHOLD` should be configurable. A default around **8–16 MB** keeps
small images and icons in IDB while sending audio, maps and archives to OPFS.

### Proposed type change

```ts
export type StoredFileSource =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'handle'; handle: FileSystemFileHandle }
  | { kind: 'opfs'; path: string };

export interface StoredFile extends WithMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  signature: string;
  source: StoredFileSource;
}
```

This is additive at the data level. Code that switches on `source.kind` must
gain an `opfs` branch:

- `getFileFromSource()`
- `getStoredFileBlob()`
- `getMapFileBlob()`
- backup serialization
- restore
- deletion and reference cleanup

Unknown source kinds should fail closed with a clear "file source is not
available" error rather than returning `undefined`.

---

## 5. OPFS adapter

### 5.1 Capability detection

```ts
export function supportsOpfs(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.getDirectory === 'function'
  );
}
```

OPFS is available in modern Chromium, Firefox and Safari. It is not a
replacement for handles, and it is still evictable unless the origin is
granted persistent storage.

### 5.2 Path layout

Use the generated file ID as the OPFS file name:

```text
<origin-private root>/
  files/
    <fileId>        # raw bytes; name/MIME live in IDB metadata
```

The ID avoids collisions and makes backup/restore straightforward. Do not use
the user-visible name as the path.

### 5.3 Write with a stream

```ts
async function writeOpfs(path: string, blob: Blob): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const files = await root.getDirectoryHandle('files', { create: true });
  const handle = await files.getFileHandle(path, { create: true });
  const writable = await handle.createWritable();

  // The article's cross-browser recommendation:
  // do not use blob.arrayBuffer() or writable.write(blob) for large files.
  await blob.stream().pipeTo(writable, { preventClose: true });
  await writable.close();
}
```

`preventClose: true` lets us keep the writable open for multiple chunks and
close it explicitly.

### 5.4 Read

```ts
async function openOpfs(path: string): Promise<File> {
  const root = await navigator.storage.getDirectory();
  const files = await root.getDirectoryHandle('files');
  const handle = await files.getFileHandle(path);
  return handle.getFile();
}
```

`File.stream()` then provides a `ReadableStream<Uint8Array>` without loading
the whole file.

### 5.5 Worker access

For high-throughput copies, a worker can use
`FileSystemFileHandle.createSyncAccessHandle()`. Keep that out of the main
thread. For normal imports, `createWritable()` + `pipeTo()` is enough.

### 5.6 Failure handling

- `QuotaExceededError`: report available/required size and offer cleanup.
- Missing OPFS file: mark the record unavailable and offer relinking/removal.
- Browser without OPFS: fall back to an IDB Blob.
- Private browsing: OPFS may be disabled or cleared on exit; show a warning in
  storage diagnostics.

---

## 6. Large-file rules

### 6.1 Stream instead of buffering

- Files above a threshold must not use `arrayBuffer()` unless an API requires
  it.
- Read with `blob.stream().getReader()` and process chunks.
- Write with `blob.stream().pipeTo(writable, { preventClose: true })`.
- For ZIP archives, prefer a streaming unzip implementation for large inputs.
  JSZip currently loads the whole archive; it can remain the fallback for small
  files.

### 6.2 Chunked copy helper

```ts
export interface FileProgress {
  loaded: number;
  total: number;
  percent: number;
}

export async function copyBlob(
  blob: Blob,
  sink: (chunk: Uint8Array) => Promise<void>,
  options: {
    chunkSize?: number;
    signal?: AbortSignal;
    onProgress?: (progress: FileProgress) => void;
  } = {},
): Promise<void> {
  const chunkSize = options.chunkSize ?? 4 * 1024 * 1024;
  const reader = blob.stream().getReader();
  let loaded = 0;

  try {
    for (;;) {
      if (options.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      await sink(value);
      options.onProgress?.({
        loaded,
        total: blob.size,
        percent: blob.size === 0 ? 100 : Math.round((loaded / blob.size) * 100),
      });
    }
  } finally {
    reader.releaseLock();
  }
}
```

### 6.3 Archive imports

`importSoundPack()` is the clearest current offender:

```ts
const arrayBuffer = await spkFile.arrayBuffer();
const zip = await JSZip.loadAsync(arrayBuffer);
```

For a pack with large music files this creates several full-size copies: the
File, the ArrayBuffer, the unzipped entries, and the stored Blobs.

Proposed path:

1. Stream the `.spk` into OPFS as a temporary archive.
2. Parse the central directory and extract only `pack.json` first.
3. Copy each audio entry to OPFS one at a time.
4. Write the pack record only after all required files succeed.
5. Delete the temporary archive.

If a streaming ZIP dependency is not acceptable yet, keep JSZip for archives
below the threshold and show a clear error for oversized packs.

### 6.4 Content hashing

The existing `signature` is metadata-based:

```ts
name | size | lastModified | type;
```

It avoids reading file contents, which is good for large files. A content hash
would improve dedupe but must be computed incrementally. `crypto.subtle.digest`
does not support streaming; use an incremental hash implementation (for
example `hash-wasm`) if this becomes necessary. Do not read a 500 MB file into
memory just to hash it.

---

## 7. Public API

Keep the existing API working and add opt-in options.

```ts
export interface ImportFileOptions {
  /** Preserve a picker-provided handle instead of copying bytes. */
  source?: StoredFileSource;
  /** auto: handle > OPFS > IDB blob. */
  storage?: 'auto' | 'handle' | 'opfs' | 'blob';
  signal?: AbortSignal;
  onProgress?: (progress: FileProgress) => void;
}

export interface SaveFileOptions {
  suggestedName: string;
  mimeType?: string;
  description?: string;
  /** Prefer showSaveFilePicker when available. */
  useSavePicker?: boolean;
}

export async function importFile(
  file: File,
  options?: ImportFileOptions,
): Promise<ImportedFile>;

export async function openFileStream(
  file: StoredFile,
  options?: { signal?: AbortSignal },
): Promise<ReadableStream<Uint8Array>>;

export async function getFileBlob(file: StoredFile): Promise<Blob>;

export async function saveBlob(
  blob: Blob,
  options: SaveFileOptions,
): Promise<'saved' | 'downloaded' | 'cancelled'>;

export async function requestPersistentStorage(): Promise<boolean>;

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}>;
```

Compatibility:

- `importStoredFile(file, source)` remains as a thin wrapper around
  `importFile(file, { source })`.
- `getStoredFileBlob()` stays for callers that genuinely need a Blob, but new
  large-file callers should use `openFileStream()`.
- `getStoredFileUrl()` stays for `<img>`/`<audio>` playback, but callers must
  revoke the URL.

---

## 8. Save helper

`<a download>` works everywhere but always creates a second copy in the
downloads folder and cannot overwrite an existing file. When
`showSaveFilePicker` is available, let the user choose the destination and
stream directly into it.

```ts
export async function saveBlob(
  blob: Blob,
  options: SaveFileOptions,
): Promise<'saved' | 'downloaded' | 'cancelled'> {
  if (options.useSavePicker !== false && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.mimeType
          ? [
              {
                description: options.description ?? 'File',
                accept: {
                  [options.mimeType]: [extensionOf(options.suggestedName)],
                },
              },
            ]
          : undefined,
      });
      const writable = await handle.createWritable();
      await blob.stream().pipeTo(writable, { preventClose: true });
      await writable.close();
      return 'saved';
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return 'cancelled';
      // Fall through to the download path.
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.suggestedName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
```

Callers to migrate:

- backup download (`HomeView.downloadBlob`)
- note Markdown/PNG download (`notes/downloadNote.ts`)
- module export (`ModuleView`)
- sound-pack export (`packManager.exportSoundPackAsFile`)
- probability-calculator CSV (`ProbabilityCalculatorView.downloadExport`)
- future image exports

---

## 9. Folder import and batch picking

Add `pickDirectory()` using `showDirectoryPicker()` when available:

```ts
export interface DirectoryPickOptions {
  accept?: Record<string, string[]>;
  recursive?: boolean;
  signal?: AbortSignal;
  onProgress?: (file: File, index: number, total: number) => void;
}

export async function pickDirectory(
  options?: DirectoryPickOptions,
): Promise<PickedFile[]>;
```

Rules:

- Enumerate entries with `for await (const entry of dir.values())`.
- Recurse only when requested.
- Filter by extension/MIME before reading.
- Preserve handles for each file so the caller can import without copying.
- Fallback: a multiple `<input type="file">` (no directory awareness on
  browsers without the API) or a clear "folder import is not supported here"
  message.
- Do not read file contents during enumeration.

First consumers:

- jukebox: "Add folder" for a session's music.
- image quick tools: batch import a folder of handouts/maps.
- image composition: add a folder as a layer source.

---

## 10. Permissions, persistence and diagnostics

### 10.1 Handle permissions

Keep `verifySourcePermission()`. Add a small state model for the UI:

```ts
type FileAccessState = 'available' | 'needs-permission' | 'missing' | 'denied';
```

Views should show a "Reconnect file" action instead of silently failing.
Playback and image loading should check permission before creating an object
URL.

### 10.2 Persistent storage

```ts
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
```

Call this once, at a sensible moment (first file import or the first visit to
Settings → Storage). Do not block startup on it. Persistence is
best-effort: browsers may still evict data.

### 10.3 Storage panel

Add **Settings → Content → Storage** with:

- usage and quota from `navigator.storage.estimate()`
- persistent-storage state and a request button
- counts and sizes of files by source kind (`handle`, `opfs`, `blob`)
- number of unavailable handles and a reconnect list
- orphan count and a cleanup action
- warning that browser permissions are outside the app's control

This also gives users a reason to trust the local-first model.

---

## 11. Backup and restore v2

### 11.1 Format

```text
dmh-backup-2026-11-06.zip
  manifest.json
  stores/
    characters.json
    notes.json
    ...
  files.json              # StoredFile metadata, source descriptors
  files/
    <fileId>              # binary bytes for OPFS/IDB-blob sources
```

`manifest.json`:

```json
{
  "format": "dmh.backup",
  "version": 2,
  "createdAt": "2026-11-06T12:00:00.000Z",
  "appVersion": "1.0.0",
  "stores": ["characters", "notes", "files"],
  "fileEncoding": "binary",
  "includesExternalFiles": false
}
```

`files` metadata lives in `files.json`; it is not duplicated under
`stores/`. The binary entries are keyed by file ID so they remain independent
of user-visible names.

### 11.2 Export rules

- OPFS and IDB-blob sources: write bytes as `files/<id>`.
- Handle sources: write metadata with `source.kind: 'unavailable'` and the
  original name/path hint. Optionally offer "include external files" which
  asks for permission, copies the bytes into the archive, and records that the
  backup contains them.
- Do not base64-encode binary payloads.
- Stream ZIP output to the save picker or an OPFS temporary file; do not build
  the whole ZIP in memory.
- Report progress and support cancellation.

### 11.3 Restore rules

1. Read and validate `manifest.json` before touching any store.
2. Stage metadata and file bytes (OPFS temporary directory or a staging IDB
   store).
3. Validate records; collect errors instead of aborting at the first bad row.
4. Swap stores in a controlled order, or use a staging database and reload.
5. Restore file bytes to OPFS when available, otherwise IDB Blobs.
6. Mark handle-backed records as `needs-relink`; show a reconnect list.
7. Keep legacy import support: `jukebox_files.json` / `map_files.json` and
   `blob-data` entries.
8. Reload the app after a successful restore so every store and worker
   reinitializes.

### 11.4 Checksums

Optional but recommended: store a SHA-256 per file in `files.json` and verify
on restore. This requires a streaming hash implementation; it is not a reason
to buffer whole files.

---

## 12. Garbage collection and reference integrity

The existing `fileReferences.ts` providers already prevent deleting a file
that a jukebox track or map still references.

Extend the same flow:

- `deleteFileIfUnreferenced()` deletes the OPFS file or IDB record.
- Add providers for future note attachments and image projects.
- Add a read-only orphan scan that reports files with no provider claiming
  them.
- Offer a manual "Clean up unused files" action with a confirmation and a
  count/size summary.
- Never run destructive cleanup automatically at startup.

---

## 13. Object URL ownership

Every `URL.createObjectURL()` needs an owner and a release point. Introduce a
small helper instead of a global magic manager:

```ts
export interface ObjectUrlHandle {
  url: string;
  revoke: () => void;
}

export function createObjectUrlHandle(blob: Blob): ObjectUrlHandle {
  const url = URL.createObjectURL(blob);
  let revoked = false;
  return {
    url,
    revoke: () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(url);
    },
  };
}
```

Rules:

- A component/composable owns every URL it creates and revokes it in
  `onBeforeUnmount` or when replacing the value.
- A player owns the URL for the lifetime of its `Howl`; revoke it when the
  `Howl` is unloaded.
- A thumbnail cache exposes `clearCache()` and is cleared when the app resets
  or the owning view unmounts.
- Never revoke a URL while an `<audio>`/`<video>` still needs to stream it.
- For downloads, revoke after the click task completes (for example
  `setTimeout(..., 1000)`), not synchronously in the same tick.

Immediate fix: `src/jukebox/playerStore.ts` should keep `src` alongside `howl`
and revoke it after `howl.unload()` (or when the current track is replaced).
The ambient store already tracks and revokes pack audio URLs.

---

## 14. Migration plan

### Phase 0 — safe cleanup (low risk)

- Add `createObjectUrlHandle` and fix the jukebox leak.
- Add shared `saveBlob()` and migrate existing downloads.
- Add `navigator.storage.persist()` and a basic storage estimate.
- Add tests for URL revocation and save fallbacks.

### Phase 1 — OPFS adapter

- Add `supportsOpfs()`, read/write/delete helpers and the `opfs` source kind.
- New blob imports above the threshold use OPFS.
- Existing IDB blob records continue to work unchanged.
- Update backup serialization to understand `opfs` (still base64 at this
  stage if necessary).

### Phase 2 — backup v2 and lazy migration

- Add `manifest.json` and binary `files/<id>` entries.
- Keep legacy restore.
- Optionally migrate existing IDB blobs to OPFS during backup or on first
  access, with progress and a setting.
- Add the storage diagnostics panel and reconnect flow.

### Phase 3 — streaming and batch

- Add streaming ZIP import for large `.spk`/module archives.
- Add folder import.
- Add optional content hashing.
- Add orphan cleanup UI.

---

## 15. Testing

### Unit tests

- source selection: handle → handle, small blob → IDB, large blob → OPFS
- OPFS path generation and delete
- `copyBlob()` progress, abort and chunk sizes
- save helper: picker success, picker abort, picker failure → download
- backup serialization with `blob`, `opfs` and `handle` sources
- restore with legacy `blob-data` and legacy `jukebox_files`/`map_files`
- object URL handle revokes once

### Integration / browser tests

- OPFS is not available in `fake-indexeddb` or jsdom; mock the adapter in
  unit tests and cover the real API in Playwright.
- Chromium: pick a real file, verify handle permission flow, OPFS write/read,
  save-picker path.
- Firefox: verify input fallback and IDB blob path.
- Large file smoke test: import a generated file above the threshold and assert
  that the UI stays responsive and progress reaches 100%.

### Backup round-trip

- Create a file in OPFS, a file in IDB, and a handle record.
- Export backup.
- Assert `files.json` has no base64 payloads and `files/<id>` entries exist
  for the first two.
- Restore into a clean profile and verify bytes, metadata and reference
  providers.

---

## 16. Risks and open questions

| Risk                                      | Mitigation                                                    |
| ----------------------------------------- | ------------------------------------------------------------- |
| OPFS quota/eviction                       | request persistence, show usage, keep backups                 |
| Two blob stores complicate deletion       | central source adapter, one delete path                       |
| Streaming ZIP dependency                  | keep JSZip for small archives, add a streaming path for large |
| Handle permission loss                    | reconnect UI, clear unavailable state                         |
| Backup compatibility                      | versioned manifest, keep legacy reader, test round-trip       |
| Large backups still consume disk          | stream to save picker/OPFS, report size before starting       |
| Duplicate detection stays metadata-only   | optional streaming content hash later                         |
| `getAllStoredFiles()` dedupe scan is O(n) | index signature in IDB if file counts grow                    |

Open questions:

- Should OPFS be the default for all new blob fallbacks, or only above a size
  threshold?
- Should "include external files" be part of backup v2, or a separate export?
- Do we want a new `@zip.js/zip.js` dependency for streaming archives?
- Should file bytes move to OPFS automatically, or only when the user opts in?
- How much storage should the UI reserve for backups and temporary files?

---

## 17. Acceptance criteria

- A large file import never loads the whole file into memory merely to copy
  it; peak memory stays proportional to the chunk size.
- New fallback imports use OPFS when available and above the threshold.
- Every object URL created by file viewers/players has a defined revoke point.
- The jukebox no longer leaks one object URL per played track.
- Users can save exports through the browser save picker, with a download
  fallback.
- A backup v2 archive contains binary file entries, a manifest, and no base64
  file payloads.
- Restoring a v2 backup restores file bytes and marks handle-backed files for
  relinking.
- Settings shows storage usage, persistence state and unavailable files.
- Existing databases, backups and handle records continue to load.

---

## References

- [JavaScript: практическое руководство по Blob, File API и оптимизации памяти](https://habr.com/ru/companies/timeweb/articles/976774/)
  — Blob creation, chunking, image compression, export, URL lifetime.
- [JavaScript. Работа с большими файлами в браузере. Часть 1/2: Чтение файлов](https://habr.com/ru/articles/1027666/)
  — reading PNG chunks without loading the file, file input lifecycle.
- [JavaScript. Работа с большими файлами в браузере. Часть 2/2: Создание 5Gb файлов в браузере](https://habr.com/ru/articles/1040752/)
  — OPFS writes, `blob.stream().pipeTo()`, save picker, streaming downloads.
- [JavaScript: чтение и запись файлов с помощью File System Access API](https://habr.com/ru/companies/timeweb/articles/653703/)
  — open/save/directory pickers, writable streams, permission model.

What we deliberately do **not** take from the articles:

- the chunked **server upload** class (no backend);
- base64 data URLs for large images or files;
- revoking audio/video URLs at `loadedmetadata`;
- PNG trailing data as the primary storage for critical project data;
- the article's CSV example (it contains escaping/newline bugs).
