import slugify from 'slugify';
import type { Note } from '@/types';
import { stripBlockAnchors } from '@/utils/noteAnchors';

function safeFileName(title: string, extension: string, id: string): string {
  const base =
    slugify(title || 'note', { lower: true, strict: true, trim: true }) ||
    'note';
  return `${base}-${id}.${extension}`;
}

function triggerDownload(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * Download a note as Markdown.
 */
export function downloadNote(note: Note): boolean {
  const blob = new Blob([stripBlockAnchors(note.content ?? '')], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, safeFileName(note.title, 'md', note.id));
  URL.revokeObjectURL(url);
  return true;
}

export { safeFileName as noteDownloadFileName };
