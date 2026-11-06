import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from 'quasar';
import { mount } from '@vue/test-utils';

import i18n from '@/i18n';
import { useConfigStore } from '@/utils/configStore';
import { confirm } from '@/dialogs/confirm';
import { prompt } from '@/dialogs/prompt';
import { confirmUnsavedChanges } from '@/dialogs/unsavedChanges';
import UnsavedChangesDialog from '@/dialogs/UnsavedChangesDialog.vue';

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
    i18n.global.locale.value = 'en';
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
          textColor: 'dark',
        }),
      }),
    );
  });

  it('skips confirmation when deletion confirmation is disabled', async () => {
    const config = useConfigStore();
    config.confirmDelete = false;

    await expect(confirm('Delete this?')).resolves.toBe(true);
    expect(Dialog.create).not.toHaveBeenCalled();

    config.confirmDelete = true;
  });

  it('uses the current locale for confirm defaults', async () => {
    i18n.global.locale.value = 'ru';
    mockDialog('ok');

    await expect(confirm('Удалить запись?')).resolves.toBe(true);

    expect(Dialog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Подтвердить',
        ok: expect.objectContaining({ label: 'ОК', color: 'primary' }),
        cancel: expect.objectContaining({
          label: 'Отмена',
          color: 'secondary',
          textColor: 'dark',
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
        cancel: expect.objectContaining({
          label: 'No',
          color: 'warning',
          textColor: 'dark',
        }),
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

    const dialogOptions = vi.mocked(Dialog.create).mock.calls.at(-1)?.[0];
    expect(dialogOptions).not.toHaveProperty('modelValue');

    expect(Dialog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rename',
        prompt: expect.objectContaining({ model: 'Initial', type: 'textarea' }),
        ok: expect.objectContaining({ label: 'Save', color: 'secondary' }),
        cancel: expect.objectContaining({
          label: 'Discard',
          color: 'secondary',
          textColor: 'dark',
        }),
      }),
    );
  });

  it.each([
    ['save', 'save'],
    ['discard', 'discard'],
    ['cancel', 'cancel'],
  ])('resolves unsaved changes choice %s', async (mode, expected) => {
    const api: any = {
      onOk: vi.fn((callback: (choice: string) => void) => {
        if (mode !== 'cancel') callback(mode);
        return api;
      }),
      onCancel: vi.fn((callback: () => void) => {
        if (mode === 'cancel') callback();
        return api;
      }),
    };
    vi.mocked(Dialog.create).mockReturnValue(api);

    await expect(confirmUnsavedChanges('Careful')).resolves.toBe(expected);

    expect(Dialog.create).toHaveBeenCalledWith({
      component: UnsavedChangesDialog,
      componentProps: { message: 'Careful' },
      persistent: true,
    });
  });

  it('renders the three unsaved-change actions', async () => {
    const wrapper = mount(UnsavedChangesDialog, {
      props: { message: 'Careful' },
    });

    expect(wrapper.text()).toContain('Unsaved changes');
    expect(wrapper.text()).toContain('Careful');
    expect(wrapper.find('.unsaved-save').text()).toBe('Save');
    expect(wrapper.find('.unsaved-save').attributes('color')).toBe('positive');
    expect(wrapper.find('.unsaved-discard').text()).toBe('Do not save');
    expect(wrapper.find('.unsaved-cancel').text()).toBe('Cancel');

    await wrapper.find('.unsaved-save').trigger('click');
    await wrapper.find('.unsaved-discard').trigger('click');
    await wrapper.find('.unsaved-cancel').trigger('click');
    wrapper.unmount();
  });
});
