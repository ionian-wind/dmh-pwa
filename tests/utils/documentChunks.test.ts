import { describe, expect, it } from 'vitest';
import { buildDocumentChunks } from '@/utils/documentChunks';
import type { Note } from '@/types';

const note = (id: string, title = id): Note => ({
  id,
  title,
  content: 'Body',
  typeId: null,
  tags: [],
  moduleId: 'm',
  hidden: true,
  createdAt: 0,
  updatedAt: 0,
});

describe('buildDocumentChunks', () => {
  it('walks a tree in pre-order and injects anchors', () => {
    const chunks = buildDocumentChunks(
      [
        {
          noteId: 'a',
          children: [{ noteId: 'b' }],
        },
        { noteId: 'c' },
      ],
      [note('a'), note('b'), note('c')],
    );

    expect(chunks.map((chunk) => chunk.noteId)).toEqual(['a', 'b', 'c']);
    expect(chunks[0].content).toContain('{#note-a}');
    expect(chunks[1].level).toBe(chunks[0].level + 1);
  });

  it('does not recurse forever on a cyclic tree', () => {
    const chunks = buildDocumentChunks(
      [{ noteId: 'a', children: [{ noteId: 'a' }] }],
      [note('a')],
    );
    expect(chunks).toHaveLength(1);
  });

  it('skips missing notes but still visits their children', () => {
    const chunks = buildDocumentChunks(
      [{ noteId: 'missing', children: [{ noteId: 'b' }] }],
      [note('b')],
    );
    expect(chunks.map((chunk) => chunk.noteId)).toEqual(['b']);
  });
});
