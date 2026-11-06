import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveBlob } from '@/utils/files/save';

function fakeWritable() {
  let text = '';
  return {
    writable: {
      write: vi.fn(async (data: BlobPart) => {
        text += await new Blob([data]).text();
      }),
      close: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
    },
    text: () => text,
  };
}

describe('saveBlob', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as any).showSaveFilePicker;
    (URL as any).createObjectURL = vi.fn(() => 'blob:save');
    (URL as any).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
  });

  afterEach(() => {
    delete (window as any).showSaveFilePicker;
    vi.useRealTimers();
  });

  it('downloads when the save picker is unavailable', async () => {
    vi.useFakeTimers();
    const result = await saveBlob(new Blob(['hello']), {
      suggestedName: 'test.txt',
    });

    expect(result).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:save');
  });

  it('streams into the save-picker handle', async () => {
    const { writable, text } = fakeWritable();
    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue(writable),
    });

    const result = await saveBlob(new Blob(['hello']), {
      suggestedName: 'test.txt',
      mimeType: 'text/plain',
      description: 'Text',
    });

    expect(result).toBe('saved');
    expect(text()).toBe('hello');
    expect(writable.close).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect((window as any).showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'test.txt',
      types: [
        {
          description: 'Text',
          accept: { 'text/plain': ['.txt'] },
        },
      ],
    });
  });

  it('returns cancelled when the user closes the picker', async () => {
    (window as any).showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(
      saveBlob(new Blob(['hello']), { suggestedName: 'test.txt' }),
    ).resolves.toBe('cancelled');
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it('falls back to a download when the picker fails', async () => {
    (window as any).showSaveFilePicker = vi
      .fn()
      .mockRejectedValue(new Error('no picker'));

    await expect(
      saveBlob(new Blob(['hello']), { suggestedName: 'test.txt' }),
    ).resolves.toBe('downloaded');
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('aborts the writable and downloads when writing fails', async () => {
    const writable = {
      write: vi.fn().mockRejectedValue(new Error('disk full')),
      close: vi.fn(),
      abort: vi.fn().mockResolvedValue(undefined),
    };
    (window as any).showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue(writable),
    });

    await expect(
      saveBlob(new Blob(['hello']), { suggestedName: 'test.txt' }),
    ).resolves.toBe('downloaded');
    expect(writable.abort).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('honours useSavePicker: false', async () => {
    (window as any).showSaveFilePicker = vi.fn();

    await expect(
      saveBlob(new Blob(['hello']), {
        suggestedName: 'test.txt',
        useSavePicker: false,
      }),
    ).resolves.toBe('downloaded');
    expect((window as any).showSaveFilePicker).not.toHaveBeenCalled();
  });

  it('uses the default description and handles names without extensions', async () => {
    const { writable } = fakeWritable();
    const picker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue(writable),
    });
    (window as any).showSaveFilePicker = picker;

    await expect(
      saveBlob(new Blob(['hello']), {
        suggestedName: 'README',
        mimeType: 'text/plain',
      }),
    ).resolves.toBe('saved');
    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'README',
      types: [
        {
          description: 'File',
          accept: { 'text/plain': [''] },
        },
      ],
    });

    await expect(
      saveBlob(new Blob(['hello']), { suggestedName: 'README.md' }),
    ).resolves.toBe('saved');
    expect(picker).toHaveBeenLastCalledWith({
      suggestedName: 'README.md',
      types: undefined,
    });
  });
});
