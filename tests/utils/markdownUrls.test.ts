import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  importFile: vi.fn(),
  getStoredFile: vi.fn(),
  getStoredFileUrl: vi.fn(),
}));

vi.mock('@/utils/files/fileStorage', () => ({
  importFile: mocks.importFile,
  getStoredFile: mocks.getStoredFile,
  getStoredFileUrl: mocks.getStoredFileUrl,
}));

import {
  clearStoredFileUrlCache,
  fileMarkdownUrl,
  hydrateStoredFileUrls,
  parseFileMarkdownUrl,
  resolveStoredFileUrl,
  uploadStoredFile,
} from '@/utils/files/markdownUrls';

describe('markdown file URLs', () => {
  beforeEach(() => {
    mocks.importFile.mockReset();
    mocks.getStoredFile.mockReset();
    mocks.getStoredFileUrl.mockReset();
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    clearStoredFileUrlCache();
  });

  afterEach(() => {
    clearStoredFileUrlCache();
  });

  it('builds and parses the dmh-file scheme', () => {
    expect(fileMarkdownUrl('file-1')).toBe('dmh-file://file-1');
    expect(parseFileMarkdownUrl('dmh-file://file-1')).toBe('file-1');
    expect(parseFileMarkdownUrl('dmh-file://')).toBeNull();
    expect(parseFileMarkdownUrl('https://example.com/a.png')).toBeNull();
  });

  it('stores uploads through the application file layer', async () => {
    mocks.importFile.mockResolvedValue({
      file: { id: 'file-1' },
      created: true,
    });
    const file = new File(['image'], 'image.png', { type: 'image/png' });

    await expect(uploadStoredFile(file)).resolves.toBe('dmh-file://file-1');
    expect(mocks.importFile).toHaveBeenCalledWith(file, {
      storage: 'auto',
      contentHash: true,
    });
  });

  it('resolves and caches object URLs for stored files', async () => {
    mocks.getStoredFile.mockResolvedValue({ id: 'file-1' });
    mocks.getStoredFileUrl.mockResolvedValue('blob:file-1');

    await expect(resolveStoredFileUrl('dmh-file://file-1')).resolves.toBe(
      'blob:file-1',
    );
    await expect(resolveStoredFileUrl('dmh-file://file-1')).resolves.toBe(
      'blob:file-1',
    );

    expect(mocks.getStoredFile).toHaveBeenCalledTimes(1);
    expect(mocks.getStoredFileUrl).toHaveBeenCalledTimes(1);
  });

  it('keeps non-file URLs untouched and handles missing files', async () => {
    await expect(
      resolveStoredFileUrl('https://example.com/a.png'),
    ).resolves.toBe('https://example.com/a.png');
    mocks.getStoredFile.mockResolvedValue(undefined);
    await expect(resolveStoredFileUrl('dmh-file://missing')).resolves.toBe('');
  });

  it('hydrates rendered image and link URLs', async () => {
    mocks.getStoredFile.mockImplementation(async (id: string) => ({ id }));
    mocks.getStoredFileUrl.mockImplementation(async (file: any) => {
      return `blob:${file.id}`;
    });

    const root = document.createElement('div');
    root.innerHTML =
      '<img src="dmh-file://file-1"><a href="dmh-file://file-2">file</a>';
    await hydrateStoredFileUrls(root);

    expect(root.querySelector('img')?.getAttribute('src')).toBe('blob:file-1');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('blob:file-2');
  });

  it('hydrates deferred image placeholders', async () => {
    mocks.getStoredFile.mockImplementation(async (id: string) => ({ id }));
    mocks.getStoredFileUrl.mockImplementation(async (file: any) => {
      return `blob:${file.id}`;
    });

    const root = document.createElement('div');
    root.innerHTML =
      '<img src="data:image/gif;base64,placeholder" data-file-src="dmh-file://file-3">';
    await hydrateStoredFileUrls(root);

    const image = root.querySelector('img');
    expect(image?.getAttribute('src')).toBe('blob:file-3');
    expect(image?.hasAttribute('data-file-src')).toBe(false);
  });
});
