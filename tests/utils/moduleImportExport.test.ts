import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

import {
  importModuleFromZip,
  parseModuleZip,
  remapImportedModule,
  validateModuleImport,
} from '@/utils/moduleImportExport';
import { openDB, StorageError } from '@/utils/storage';
import { validateSchema } from '@/utils/schemaValidator';

vi.mock('@/utils/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/storage')>();
  return { ...actual, openDB: vi.fn() };
});

vi.mock('@/utils/schemaValidator', () => ({
  canValidate: vi.fn(() => true),
  registerValidationSchema: vi.fn(),
  validateSchema: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
}));

async function makeZip(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: 'blob' });
}

describe('module import timestamps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves archive timestamps while generating fresh IDs', () => {
    const result = remapImportedModule({
      module: {
        id: 'old-module',
        name: 'Module',
        createdAt: 111,
        updatedAt: 222,
      } as any,
      tree: [{ noteId: 'old-note', children: [] }],
      notes: [
        {
          id: 'old-note',
          title: 'Note',
          content: 'Body',
          typeId: null,
          tags: [],
          moduleIds: ['old-module'],
          hidden: true,
          createdAt: 333,
          updatedAt: 444,
        } as any,
      ],
    });

    expect(result.module.id).not.toBe('old-module');
    expect(result.notes[0].id).not.toBe('old-note');
    expect(result.module.createdAt).toBe(111);
    expect(result.module.updatedAt).toBe(222);
    expect(result.notes[0].createdAt).toBe(333);
    expect(result.notes[0].updatedAt).toBe(444);
  });

  it('falls back to the import time when timestamps are missing', () => {
    const before = Date.now();
    const result = remapImportedModule({
      module: { id: 'old', name: 'M' } as any,
      tree: [],
      notes: [],
    });
    expect(result.module.createdAt).toBeGreaterThanOrEqual(before);
    expect(result.module.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it('validates missing, orphaned and matching note references', () => {
    const tree = [{ noteId: 'a', children: [{ noteId: 'b', children: [] }] }];
    const result = validateModuleImport(
      { noteTree: tree as any },
      tree as any,
      [{ id: 'a' }, { id: 'c' }] as any,
    );

    expect(result.missingNoteIds).toEqual(['b']);
    expect(result.orphanedNoteFiles).toEqual(['c']);
    expect(result.treeMatchesModule).toBe(true);

    const mismatch = validateModuleImport(
      { noteTree: [{ noteId: 'a', children: [] }] as any },
      tree as any,
      [{ id: 'a' }, { id: 'b' }] as any,
    );
    expect(mismatch.treeMatchesModule).toBe(false);
  });

  it('parses a module zip and skips invalid note files', async () => {
    const blob = await makeZip({
      'module.json': JSON.stringify({ name: 'Imported' }),
      'tree.json': JSON.stringify([{ noteId: 'n1', children: [] }]),
      'notes/n1.json': JSON.stringify({ id: 'n1', title: 'Note' }),
      'notes/bad.json': '{not json',
    });

    const result = await parseModuleZip(blob);

    expect(result.module).toEqual({ name: 'Imported' });
    expect(result.tree).toEqual([{ noteId: 'n1', children: [] }]);
    expect(result.notes).toEqual([{ id: 'n1', title: 'Note' }]);
  });

  it('reports missing or invalid module zip entries', async () => {
    await expect(parseModuleZip(await makeZip({}))).rejects.toThrow(
      'Module file not found in zip',
    );
    await expect(
      parseModuleZip(await makeZip({ 'module.json': '{bad' })),
    ).rejects.toThrow('Invalid module.json format');
    await expect(
      parseModuleZip(await makeZip({ 'module.json': '{}' })),
    ).rejects.toThrow('Tree file not found in zip');
    await expect(
      parseModuleZip(
        await makeZip({ 'module.json': '{}', 'tree.json': '{bad' }),
      ),
    ).rejects.toThrow('Invalid tree.json format');
    await expect(
      parseModuleZip(await makeZip({ 'module.json': '{}', 'tree.json': '[]' })),
    ).resolves.toEqual({ module: {}, tree: [], notes: [] });
  });

  it('imports a module, its notes and mention indexes', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const table = vi.fn(() => ({ put, bulkPut }));
    const transaction = vi.fn(async (_mode, ...args: any[]) => {
      const callback = args.at(-1);
      return callback({ table });
    });
    vi.mocked(openDB).mockResolvedValue({
      modules: {},
      notes: {},
      indexations_mentions: {},
      transaction,
    } as any);

    const result = await importModuleFromZip({
      module: { name: 'Imported' } as any,
      tree: [{ noteId: 'n1', children: [] }] as any,
      notes: [
        {
          id: 'n1',
          title: 'Note',
          content: 'See [Goblin](monster://m1) and [Goblin](monster://m1)',
          typeId: null,
          tags: [],
          moduleIds: ['old'],
          hidden: false,
        } as any,
      ],
    });

    expect(result.noteCount).toBe(1);
    expect(result.moduleId).toBeTruthy();
    expect(table).toHaveBeenCalledWith('modules');
    expect(table).toHaveBeenCalledWith('notes');
    expect(table).toHaveBeenCalledWith('indexations_mentions');
    expect(put).toHaveBeenCalledTimes(1);
    expect(bulkPut).toHaveBeenCalledTimes(2);
  });

  it('fills missing tree ids and handles empty trees and note lists', () => {
    const result = remapImportedModule({
      module: { id: 'm', name: 'M' } as any,
      tree: [
        {
          noteId: 'missing',
          children: [{ noteId: 'n1', children: [] }],
        },
      ] as any,
      notes: [
        {
          id: 'n1',
          title: 'Note',
          content: '',
          typeId: null,
          tags: [],
          moduleIds: ['m'],
          hidden: false,
        } as any,
      ],
    });
    expect(result.module.noteTree[0].noteId).toBeTruthy();
    expect(result.notes[0].contentType).toBe('text');
    expect(result.notes[0].hidden).toBe(false);
  });

  it('rejects invalid modules and notes and skips empty mention indexes', async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const table = vi.fn(() => ({ put, bulkPut }));
    const transaction = vi.fn(async (_mode, ...args: any[]) => {
      const callback = args.at(-1);
      return callback({ table });
    });
    vi.mocked(openDB).mockResolvedValue({
      modules: {},
      notes: {},
      indexations_mentions: {},
      transaction,
    } as any);

    vi.mocked(validateSchema).mockResolvedValueOnce({
      valid: false,
      errors: ['bad module'],
    });
    await expect(
      importModuleFromZip({
        module: { name: 'Bad' } as any,
        tree: [],
        notes: [],
      }),
    ).rejects.toBeInstanceOf(StorageError);

    vi.mocked(validateSchema)
      .mockResolvedValueOnce({ valid: true, errors: [] })
      .mockResolvedValueOnce({ valid: false, errors: ['bad note'] });
    await expect(
      importModuleFromZip({
        module: { name: 'Bad note' } as any,
        tree: [],
        notes: [{ id: 'n1', title: 'Note', content: '' } as any],
      }),
    ).rejects.toBeInstanceOf(StorageError);

    vi.mocked(validateSchema).mockResolvedValue({ valid: true, errors: [] });
    const result = await importModuleFromZip({
      module: { name: 'Clean' } as any,
      tree: undefined as any,
      notes: [{ id: 'n1', title: 'Note', content: 'no mentions' } as any],
    });
    expect(result.noteCount).toBe(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(bulkPut).toHaveBeenCalledTimes(2);
  });

  it('wraps storage failures in a StorageError', async () => {
    const put = vi.fn().mockRejectedValue(new Error('disk full'));
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const table = vi.fn(() => ({ put, bulkPut }));
    const transaction = vi.fn(async (_mode, ...args: any[]) => {
      const callback = args.at(-1);
      return callback({ table });
    });
    vi.mocked(openDB).mockResolvedValue({
      modules: {},
      notes: {},
      indexations_mentions: {},
      transaction,
    } as any);

    await expect(
      importModuleFromZip({
        module: { name: 'Imported' } as any,
        tree: [],
        notes: [],
      }),
    ).rejects.toBeInstanceOf(StorageError);
  });
});
