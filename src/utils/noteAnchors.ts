import MarkdownIt from 'markdown-it';
import { nanoid } from 'nanoid';

const BLOCK_ANCHOR_PATTERN = /\s*<!--\s*dmh:block=([A-Za-z0-9_-]+)\s*-->\s*$/;
const BLOCK_ANCHOR_GLOBAL = /\s*<!--\s*dmh:block=[A-Za-z0-9_-]+\s*-->/g;

const tokenizer = new MarkdownIt({
  html: true,
  linkify: false,
  breaks: false,
});

export function extractBlockAnchorId(text: string): string | null {
  const match = BLOCK_ANCHOR_PATTERN.exec(text);
  return match ? match[1] : null;
}

export function stripBlockAnchors(markdown: string): string {
  return markdown.replace(BLOCK_ANCHOR_GLOBAL, '').trimEnd();
}

/**
 * Re-attach anchors from a previous Markdown value to matching unchanged
 * lines. Raw mode hides anchor comments, so this keeps bookmark IDs stable
 * when the user edits the source without touching an anchored line.
 */
export function preserveBlockAnchors(next: string, previous: string): string {
  if (!previous.includes('<!--')) return next;

  const anchors = new Map<string, string[]>();
  for (const line of previous.split(/\r?\n/)) {
    const match = BLOCK_ANCHOR_PATTERN.exec(line);
    if (!match) continue;
    const base = line.slice(0, match.index).trim();
    if (!base) continue;
    const ids = anchors.get(base) ?? [];
    ids.push(match[1]);
    anchors.set(base, ids);
  }
  if (anchors.size === 0) return next;

  return next
    .split(/\r?\n/)
    .map((line) => {
      if (BLOCK_ANCHOR_PATTERN.test(line)) return line;
      const id = anchors.get(line.trim())?.shift();
      return id ? `${line} <!-- dmh:block=${id} -->` : line;
    })
    .join('\n');
}

/**
 * Give every top-level heading and paragraph a persistent block anchor.
 * Existing anchors are preserved, so edits never change a block's identity.
 */
export function ensureBlockAnchors(markdown: string): string {
  if (!markdown.trim()) return markdown;

  const tokens = tokenizer.parse(markdown, {});
  const lines = markdown.split(/\r?\n/);
  const insertions = new Map<number, string>();

  for (const token of tokens) {
    if (token.level !== 0) continue;
    if (token.type !== 'heading_open' && token.type !== 'paragraph_open') {
      continue;
    }
    if (!token.map) continue;

    const [start, end] = token.map;
    const blockSource = lines.slice(start, end).join('\n');
    if (!blockSource.trim()) continue;
    if (BLOCK_ANCHOR_PATTERN.test(blockSource)) continue;

    const anchorId = `note-block-${nanoid(8)}`;
    insertions.set(end - 1, ` <!-- dmh:block=${anchorId} -->`);
  }

  if (insertions.size === 0) return markdown;

  for (const [lineIndex, marker] of insertions) {
    lines[lineIndex] = `${lines[lineIndex]}${marker}`;
  }
  return lines.join('\n');
}
