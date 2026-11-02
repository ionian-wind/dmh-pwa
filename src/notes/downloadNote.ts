import type { Note } from '@/types';

function safeFileName(title: string, extension: string): string {
  const base = (title || 'note')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim()
    .slice(0, 120);
  return `${base || 'note'}.${extension}`;
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
 * Download a text note as Markdown or a drawing note as PNG.
 * Returns false when a drawing note has no stored preview.
 */
export function downloadNote(note: Note): boolean {
  if (note.contentType === 'draw') {
    if (!note.preview) return false;
    triggerDownload(note.preview, safeFileName(note.title, 'png'));
    return true;
  }

  const blob = new Blob([note.content ?? ''], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, safeFileName(note.title, 'md'));
  URL.revokeObjectURL(url);
  return true;
}

export { safeFileName as noteDownloadFileName };
