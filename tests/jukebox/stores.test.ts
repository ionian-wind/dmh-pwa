import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import {
  deleteJukeboxFile,
  getAllJukeboxFiles,
  getJukeboxFile,
  isFileSystemFileHandle,
  putJukeboxFile,
  trackIsActive,
  usePictureUrlCacheStore,
} from '@/jukebox/stores';

const mocks = vi.hoisted(() => ({
  idbGetItem: vi.fn(),
  idbPutItem: vi.fn(),
  idbDeleteItem: vi.fn(),
  idbGetAllItems: vi.fn(),
}));

vi.mock('@/utils/storage', () => ({
  useStore: vi.fn(() => ({ items: { value: [] } })),
  idbGetItem: mocks.idbGetItem,
  idbPutItem: mocks.idbPutItem,
  idbDeleteItem: mocks.idbDeleteItem,
  idbGetAllItems: mocks.idbGetAllItems,
}));

describe('jukebox stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    let urlCounter = 0;
    (URL as any).createObjectURL = vi.fn(() => `blob:${++urlCounter}`);
    (URL as any).revokeObjectURL = vi.fn();
  });

  it('detects file system handles', () => {
    expect(isFileSystemFileHandle({ kind: 'file' })).toBe(true);
    expect(isFileSystemFileHandle({ kind: 'directory' })).toBe(false);
    expect(isFileSystemFileHandle(null)).toBeFalsy();
  });

  it('forwards file operations to IndexedDB', async () => {
    const file = { id: 'f1', name: 'song.mp3' } as any;
    mocks.idbGetItem.mockResolvedValue(file);
    mocks.idbGetAllItems.mockResolvedValue([file]);

    await expect(getJukeboxFile('f1')).resolves.toBe(file);
    await expect(getAllJukeboxFiles()).resolves.toEqual([file]);
    await putJukeboxFile(file);
    await deleteJukeboxFile('f1');

    expect(mocks.idbGetItem).toHaveBeenCalledWith('jukebox_files', 'f1');
    expect(mocks.idbGetAllItems).toHaveBeenCalledWith('jukebox_files');
    expect(mocks.idbPutItem).toHaveBeenCalledWith('jukebox_files', file);
    expect(mocks.idbDeleteItem).toHaveBeenCalledWith('jukebox_files', 'f1');
  });

  it('caches picture URLs per blob identity and revokes them', () => {
    const store = usePictureUrlCacheStore();
    const first = new Blob(['a'], { type: 'image/png' });
    const second = new Blob(['b'], { type: 'image/png' });

    expect(store.getPictureUrl(undefined)).toBe('');
    expect(store.getPictureUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    );

    const firstUrl = store.getPictureUrl(first);
    expect(firstUrl).toBe('blob:1');
    expect(store.getPictureUrl(first)).toBe(firstUrl);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    const secondUrl = store.getPictureUrl(second);
    expect(secondUrl).not.toBe(firstUrl);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(store.getPictureStyle(first)).toEqual({
      backgroundImage: `url(${firstUrl})`,
    });
    expect(store.getPictureStyle(undefined)).toEqual({ backgroundImage: '' });

    store.clearCache();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(secondUrl);
    expect(store.getPictureUrl(first)).toBe('blob:3');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
  });

  it('checks whether a track is active in the selected playlist', () => {
    const track = { id: 't1' } as any;
    expect(trackIsActive(track, track, 'p1', 'p1')).toBe(true);
    expect(trackIsActive(track, track, 'p1', 'p2')).toBe(false);
    expect(trackIsActive(track, { id: 't2' } as any, 'p1', 'p1')).toBe(false);
    expect(trackIsActive(null, track, 'p1', 'p1')).toBe(false);
  });

  it('ignores non-Blob artwork values that cannot be turned into URLs', () => {
    const store = usePictureUrlCacheStore();
    expect(store.getPictureUrl({} as any)).toBe('');
    expect(store.getPictureStyle({} as any)).toEqual({ backgroundImage: '' });
  });
});
