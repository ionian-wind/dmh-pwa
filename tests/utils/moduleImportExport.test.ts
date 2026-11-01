import { describe, expect, it } from 'vitest';
import { remapImportedModule } from '@/utils/moduleImportExport';

describe('module import timestamps', () => {
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
          moduleId: 'old-module',
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
});
