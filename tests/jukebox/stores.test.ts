import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import {
  isFileSystemFileHandle,
  trackIsActive,
  usePictureUrlCacheStore,
} from '@/jukebox/stores';

vi.mock('@/utils/storage', () => ({
  useStore: vi.fn(() => ({ items: { value: [] } })),
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
