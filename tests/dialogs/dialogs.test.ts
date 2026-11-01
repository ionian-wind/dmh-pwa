import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from 'quasar';

import { confirm } from '@/dialogs/confirm';
import { prompt } from '@/dialogs/prompt';

function mockDialog(mode: 'ok' | 'cancel', value?: any) {
  const api: any = {
    onOk: vi.fn((callback: (value?: any) => void) => {
      if (mode === 'ok') callback(value);
      return api;
    }),
    onCancel: vi.fn((callback: () => void) => {
      if (mode === 'cancel') callback();
      return api;
    }),
  };
  vi.mocked(Dialog.create).mockReturnValue(api);
  return api;
}

describe('dialog helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves confirm to true and forwards defaults', async () => {
    mockDialog('ok');

    await expect(confirm('Delete this?')).resolves.toBe(true);

    expect(Dialog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Delete this?',
        title: 'Confirm',
        persistent: true,
        ok: expect.objectContaining({ label: 'OK', color: 'primary' }),
        cancel: expect.objectContaining({
          label: 'Cancel',
          color: 'secondary',
        }),
      }),
    );
  });

  it('resolves confirm to false and forwards custom options', async () => {
    mockDialog('cancel');

    await expect(
      confirm('Continue?', {
        title: 'Custom',
        okText: 'Yes',
        cancelText: 'No',
        color: 'warning',
      }),
    ).resolves.toBe(false);

    expect(Dialog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Custom',
        ok: expect.objectContaining({ label: 'Yes', color: 'warning' }),
        cancel: expect.objectContaining({ label: 'No', color: 'warning' }),
      }),
    );
  });

  it('resolves prompt with the entered value', async () => {
    mockDialog('ok', 'New name');

    await expect(prompt('Name?')).resolves.toBe('New name');

    expect(Dialog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Name?',
        title: 'Prompt',
        prompt: expect.objectContaining({ model: '', type: 'text' }),
      }),
    );
  });

  it('resolves prompt with null on cancel and custom prompt options', async () => {
    mockDialog('cancel');

    await expect(
      prompt('Name?', {
        title: 'Rename',
        okText: 'Save',
        cancelText: 'Discard',
        color: 'secondary',
        inputType: 'textarea',
        modelValue: 'Initial',
      }),
    ).resolves.toBeNull();

    expect(Dialog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rename',
        prompt: expect.objectContaining({ model: 'Initial', type: 'textarea' }),
        ok: expect.objectContaining({ label: 'Save', color: 'secondary' }),
        cancel: expect.objectContaining({
          label: 'Discard',
          color: 'secondary',
        }),
      }),
    );
  });
});
