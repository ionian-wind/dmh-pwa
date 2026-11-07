# Markdown Rendering Performance

## Purpose

Record the phase 4 evaluation of the Milkdown view renderer. The question was
whether note cards and virtualized module chunks should switch from markdown-it
to a static Milkdown renderer for exact view/edit parity.

**Decision:** keep markdown-it for cards and chunks. Detail views continue to
use one read-only Crepe instance per page. The static Milkdown renderer exists
and is tested, but is not used by the app.

## Benchmark

The benchmark uses the
[`markdown-dataset`](https://github.com/davidmyersdev/markdown-dataset)
package: 983 MIT-licensed README files, about 17.1 million characters, with a
largest document of 472,445 characters.

Run it with:

```bash
npm run perf:markdown
npm run perf:markdown -- --count=25 --sample=typical
npm run perf:markdown -- --count=10 --sample=spread --max-chars=2000000
```

Options:

| Option        | Default   | Meaning                                                 |
| ------------- | --------- | ------------------------------------------------------- |
| `--count`     | `25`      | Number of documents used for the batch scenarios        |
| `--sample`    | `spread`  | `spread` uses the size range; `typical` uses 5–50 KB    |
| `--max-chars` | `2000000` | Maximum total characters loaded into the benchmark page |

The script starts a temporary Vite server, injects the selected decoded
documents into `benchmark.html`, and prints both a table and JSON. The
benchmark entry is dev-only and is not included in the production build.

Scenarios:

- **markdown-it batch** — `parseMarkdown()` plus HTML insertion for the
  selected documents (the current card/chunk path).
- **edit Crepe single** — a full Crepe editor with the largest dataset
  document.
- **read-only Crepe single** — the same document in the read-only feature set.
- **static Milkdown single** — the singleton hidden Crepe renderer, warm.
- **static Milkdown batch** — `renderMarkdownToHtml()` plus HTML insertion for
  the selected documents.

## Results

Typical sample: 25 documents, 386,197 characters, largest document 472,445
characters.

| Scenario                             | Total ms | Ms/doc |
| ------------------------------------ | -------- | ------ |
| markdown-it batch                    | 98.9     | 3.96   |
| static Milkdown batch                | 614.4    | 24.58  |
| edit Crepe single (largest doc)      | 939.1    | 939.1  |
| read-only Crepe single (largest doc) | 699.9    | 699.9  |
| static Milkdown single (largest doc) | 410.7    | 410.7  |

Spread sample including the largest document: 25 documents, 789,308
characters.

| Scenario                             | Total ms | Ms/doc |
| ------------------------------------ | -------- | ------ |
| markdown-it batch                    | 146.8    | 5.87   |
| static Milkdown batch                | 801.9    | 32.08  |
| edit Crepe single (largest doc)      | 951.8    | 951.8  |
| read-only Crepe single (largest doc) | 817.1    | 817.1  |
| static Milkdown single (largest doc) | 423.1    | 423.1  |

Absolute numbers vary by machine. The relative result is stable:

- One read-only Crepe instance is acceptable for a detail page, especially
  because the page already imported the editor chunk.
- A static Milkdown renderer is roughly **5–6× slower** than markdown-it for
  card/chunk batches.
- Mounting one Crepe instance per card would be far worse than either.

## Consequences

- `MilkdownView` remains the detail-view renderer.
- `NoteCard` and `ModuleDocumentView` keep `Markdown.vue` / markdown-it.
- `src/components/common/milkdown/staticRenderer.ts` is available for future
  experiments and is covered by `tests/components/staticRenderer.test.ts`.
- `markdown-it` stays for exports and as the lightweight fallback.
- No production route or bundle imports the benchmark entry.
