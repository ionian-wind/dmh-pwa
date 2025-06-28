# Markdown to JSON Converter

This script converts markdown files into JSON files for the DMH PWA application, generating module entities, tree structures, and individual note files, all packaged in a zip archive.

## Usage

```bash
node scripts/markdown-to-json.js --name <module-name> [markdown-file]
```

### Arguments

- `--name <module-name>`: Required. The name of the module to create
- `[markdown-file]`: Optional. Path to the markdown file (defaults to `docs/cos.md`)

### Examples

```bash
# Convert the default Curse of Strahd file
node scripts/markdown-to-json.js --name "Curse of Strahd"

# Convert a specific markdown file
node scripts/markdown-to-json.js --name "My Module" path/to/my-file.md
```

## Output

The script generates a single zip archive file in `output/<module-name>_module.zip` containing:

### Archive Structure
```
<module-name>_module.zip
├── module.json
├── tree.json
├── summary.json
└── notes/
    ├── <note-id-1>.json
    ├── <note-id-2>.json
    └── ...
```

### 1. `module.json`
Module entity file with the following structure:
```json
{
  "id": "generated-id",
  "name": "Module Name",
  "createdAt": 1234567890,
  "updatedAt": 1234567890,
  "noteTree": [...]
}
```

### 2. `tree.json`
Tree structure file representing the hierarchical organization of notes based on markdown headers.

### 3. `notes/` directory
Individual JSON files for each note, one per markdown section. Each note has the structure:
```json
{
  "id": "generated-id",
  "title": "Section Title",
  "content": "Raw markdown content",
  "typeId": null,
  "tags": [],
  "moduleId": "module-id",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

### 4. `summary.json`
Summary file with conversion statistics:
```json
{
  "moduleName": "Module Name",
  "moduleId": "generated-module-id",
  "totalSections": 100,
  "totalNotes": 100,
  "generatedAt": "2025-06-28T19:18:24.039Z"
}
```

## How It Works

1. **Parses Markdown**: Reads the markdown file and identifies sections based on headers (`#`, `##`, etc.)
2. **Generates IDs**: Uses `nanoid(10)` to generate unique IDs for each entity
3. **Builds Tree Structure**: Creates a hierarchical tree based on header levels
4. **Creates Notes**: Generates individual note files for each section
5. **Packages Everything**: Creates a zip archive containing all generated files
6. **Links Everything**: Connects notes to the module via `moduleId`

## Requirements

- Node.js with ES modules support
- `nanoid` package (already included in the project)
- `jszip` package (already included in the project)

## Notes

- Each markdown header becomes a note
- The tree structure is built based on header levels (h1, h2, h3, etc.)
- All timestamps are set to the current time when the script runs
- Note types and tags are left empty (null/empty array) and can be set manually later
- The zip file name is automatically generated from the module name (special characters replaced with underscores)

## Example Output

For the Curse of Strahd module:
```
output/Curse_of_Strahd_module.zip (2.4MB)
├── module.json (229KB)
├── tree.json (210KB)
├── summary.json (204B)
└── notes/ (1,211 files)
    ├── KRrNrtQOAJ.json
    ├── I98cQKrAMY.json
    └── ...
``` 