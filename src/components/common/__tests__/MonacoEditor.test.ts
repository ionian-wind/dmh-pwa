import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const fake = vi.hoisted(() => {
  let value = '';
  let changeHandler: (() => void) | undefined;
  const editor = {
    getValue: vi.fn(() => value),
    setValue: vi.fn((next: string) => {
      value = next;
    }),
    onDidChangeModelContent: vi.fn((handler: () => void) => {
      changeHandler = handler;
      return { dispose: vi.fn() };
    }),
    getModel: vi.fn(() => ({})),
    updateOptions: vi.fn(),
    focus: vi.fn(),
    dispose: vi.fn(),
  };
  const create = vi.fn((_host: HTMLElement, options: { value: string }) => {
    value = options.value;
    return editor;
  });
  return {
    editor,
    create,
    emitChange: (next: string) => {
      value = next;
      changeHandler?.();
    },
    setModelLanguage: vi.fn(),
  };
});

vi.mock('@/components/common/monaco', () => ({
  monaco: {
    editor: {
      create: fake.create,
      setModelLanguage: fake.setModelLanguage,
    },
  },
}));

import MonacoEditor from '../MonacoEditor.vue';

describe('MonacoEditor', () => {
  it('creates, updates and disposes the Monaco editor', async () => {
    const wrapper = mount(MonacoEditor, {
      props: {
        modelValue: 'output 3d6',
        language: 'anydice',
        height: '200px',
      },
    });

    expect(fake.create).toHaveBeenCalledTimes(1);
    expect(fake.create.mock.calls[0][1]).toMatchObject({
      value: 'output 3d6',
      language: 'anydice',
      automaticLayout: true,
    });

    fake.emitChange('output 1d6');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['output 1d6']);
    expect(wrapper.emitted('ready')?.[0]).toEqual([fake.editor]);

    await wrapper.setProps({ modelValue: 'output 2d6' });
    expect(fake.editor.setValue).toHaveBeenCalledWith('output 2d6');

    await wrapper.setProps({ language: 'plaintext' });
    expect(fake.setModelLanguage).toHaveBeenCalledWith({}, 'plaintext');

    await wrapper.setProps({ readonly: true });
    expect(fake.editor.updateOptions).toHaveBeenCalledWith({ readOnly: true });

    (wrapper.vm as unknown as { focus: () => void }).focus();
    expect(fake.editor.focus).toHaveBeenCalled();

    wrapper.unmount();
    expect(fake.editor.dispose).toHaveBeenCalled();
  });
});
