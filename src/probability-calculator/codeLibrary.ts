export interface CodePiece {
  id: string;
  name: string;
  code: string;
  /** Include this piece in the namespace used for calculations. */
  include: boolean;
}

export const CODE_LIBRARY_STORAGE_KEY = 'dmh-probability-calculator:library';

interface CodeLibraryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isCodePiece(value: unknown): value is CodePiece {
  if (!value || typeof value !== 'object') return false;
  const piece = value as Partial<CodePiece>;
  return (
    typeof piece.id === 'string' &&
    typeof piece.name === 'string' &&
    typeof piece.code === 'string' &&
    typeof piece.include === 'boolean'
  );
}

export function loadCodeLibrary(
  storage: CodeLibraryStorage = localStorage,
): CodePiece[] {
  try {
    const stored = storage.getItem(CODE_LIBRARY_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isCodePiece) : [];
  } catch {
    return [];
  }
}

export function saveCodeLibrary(
  pieces: CodePiece[],
  storage: CodeLibraryStorage = localStorage,
): void {
  try {
    storage.setItem(CODE_LIBRARY_STORAGE_KEY, JSON.stringify(pieces));
  } catch {
    // Storage can be unavailable; the in-memory library still works.
  }
}

export function createCodePiece(name: string, code: string): CodePiece {
  return {
    id: crypto.randomUUID(),
    name,
    code,
    include: false,
  };
}
