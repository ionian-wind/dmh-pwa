import { describe, expect, it, vi } from 'vitest';
import {
  CODE_LIBRARY_STORAGE_KEY,
  createCodePiece,
  loadCodeLibrary,
  saveCodeLibrary,
  type CodePiece,
} from '../codeLibrary';

function fakeStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => {
      value = next;
    }),
  };
}

describe('code library storage', () => {
  it('loads valid pieces and ignores invalid data', () => {
    const pieces: CodePiece[] = [
      { id: '1', name: 'Ability', code: 'output 3d6', include: true },
    ];
    const storage = fakeStorage(JSON.stringify([...pieces, { nope: true }]));
    expect(loadCodeLibrary(storage)).toEqual(pieces);
  });

  it('returns an empty library for missing or corrupt data', () => {
    expect(loadCodeLibrary(fakeStorage())).toEqual([]);
    expect(loadCodeLibrary(fakeStorage('not json'))).toEqual([]);
  });

  it('saves pieces to storage', () => {
    const storage = fakeStorage();
    const pieces = [createCodePiece('Attack', 'output 1d20')];
    saveCodeLibrary(pieces, storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      CODE_LIBRARY_STORAGE_KEY,
      JSON.stringify(pieces),
    );
  });

  it('creates a non-included piece with an id', () => {
    const piece = createCodePiece('Attack', 'output 1d20');
    expect(piece.name).toBe('Attack');
    expect(piece.code).toBe('output 1d20');
    expect(piece.include).toBe(false);
    expect(piece.id).toBeTruthy();
  });
});
