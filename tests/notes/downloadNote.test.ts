import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Note } from '@/types';
import { downloadNote, noteDownloadFileName } from '@/notes/downloadNote';

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Session notes',
    content: '# Session\n\nHello',
    tags: [],
    typeId: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('note downloads', () => {
  let clickedAnchor: HTMLAnchorElement | null = null;

  afterEach(() => {
    vi.restoreAllMocks();
    clickedAnchor = null;
  });

  it('downloads notes as markdown', () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:note'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedAnchor = this;
    });

    expect(downloadNote(note())).toBe(true);
    expect(clickedAnchor?.download).toBe('session-notes-note-1.md');
    expect(clickedAnchor?.href).toContain('blob:note');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:note');
  });

  it('slugifies titles and appends the entity id', () => {
    expect(noteDownloadFileName('A/B: C?', 'md', 'note-1')).toBe(
      'ab-c-note-1.md',
    );
    expect(noteDownloadFileName('', 'png', 'note-2')).toBe('note-note-2.png');
    expect(noteDownloadFileName('   ', 'md', 'note-3')).toBe('note-note-3.md');
    expect(noteDownloadFileName('Привет мир', 'md', 'note-4')).toBe(
      'privet-mir-note-4.md',
    );
  });

  it('treats missing text content as an empty document', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    expect(downloadNote(note({ content: undefined as any }))).toBe(true);
  });
});
