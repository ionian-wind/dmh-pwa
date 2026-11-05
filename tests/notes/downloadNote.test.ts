import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Note } from '@/types';
import { downloadNote, noteDownloadFileName } from '@/notes/downloadNote';

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Session notes',
    content: '# Session\n\nHello',
    contentType: 'text',
    tags: [],
    typeId: null,
    moduleIds: [],
    hidden: false,
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

  it('downloads text notes as markdown', () => {
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
    expect(clickedAnchor?.download).toBe('Session notes.md');
    expect(clickedAnchor?.href).toContain('blob:note');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:note');
  });

  it('downloads drawing previews as png', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedAnchor = this;
    });

    expect(
      downloadNote(
        note({
          contentType: 'draw',
          content: '{"shapes":[]}',
          preview: 'data:image/png;base64,abc',
        }),
      ),
    ).toBe(true);
    expect(clickedAnchor?.download).toBe('Session notes.png');
    expect(clickedAnchor?.href).toBe('data:image/png;base64,abc');
  });

  it('does not download a drawing without a preview', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    expect(
      downloadNote(note({ contentType: 'draw', preview: undefined })),
    ).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });

  it('sanitizes unsafe file names', () => {
    expect(noteDownloadFileName('A/B: C?', 'md')).toBe('A-B- C-.md');
    expect(noteDownloadFileName('', 'png')).toBe('note.png');
    expect(noteDownloadFileName('   ', 'md')).toBe('note.md');
  });

  it('treats missing text content as an empty document', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    expect(downloadNote(note({ content: undefined as any }))).toBe(true);
  });
});
