# Nearest Features

**Status (2026-11-09):** implemented for note images; arbitrary file attachments
remain unexposed.

Original note: add an "upload" file feature for notes — files and images.

Current behavior: Crepe image blocks upload through the generic file layer
(`uploadStoredFile()` → `files` store / OPFS) and Markdown stores stable
`dmh-file://<fileId>` references. There is no note attachment picker or generic
file-link UI yet; see
[generic-file-handling.md](generic-file-handling.md) for the shared storage
layer and remaining polish.
