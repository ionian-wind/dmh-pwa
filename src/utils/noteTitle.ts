import type { Note } from '@/types';

const MAX_LENGTH = 40;
const BLOCK_ANCHOR = /<!--\s*dmh:block=[A-Za-z0-9_-]+\s*-->/g;

function firstContentLine(content: string): string {
  return (
    content
      .split(/\r?\n/)
      .map((line) => line.replace(BLOCK_ANCHOR, '').trim())
      .find((line) => line.length > 0) ?? ''
  );
}

function plainText(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^>\s+/, '')
    .replace(/[*_`~]/g, '')
    .trim();
}

/**
 * Title for UI labels. Falls back to the first content line, cropped with
 * three dots when it is too long.
 */
export function noteDisplayTitle(
  note: Pick<Note, 'title' | 'content' | 'contentType'> | null | undefined,
): string {
  const title = note?.title?.trim();
  if (title) return title;
  if (!note || note.contentType === 'draw') return '';

  const line = plainText(firstContentLine(note.content ?? ''));
  if (line.length <= MAX_LENGTH) return line;
  return `${line.slice(0, MAX_LENGTH - 3).trimEnd()}...`;
}
