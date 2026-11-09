import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const fake = vi.hoisted(() => {
  const diagnostics = { setDiagnostics: vi.fn(), clearDiagnostics: vi.fn() };
  const syntax = { registerMode: vi.fn() };
  let value = '';
  let changeHandler: (() => void) | undefined;
  const editor = {
    getValue: vi.fn(() => value),
    setValue: vi.fn((next: string) => {
      value = next;
    }),
    setTheme: vi.fn(),
    setReadOnly: vi.fn(),
    executeCommand: vi.fn(),
    getView: vi.fn(() => ({ scrollToPosition: vi.fn() })),
    setCursor: vi.fn(),
    focus: vi.fn(),
    on: vi.fn((_event: string, handler: () => void) => {
      changeHandler = handler;
    }),
    destroy: vi.fn(),
  };
  const create = vi.fn((_host: HTMLElement, options: { value: string }) => {
    value = options.value;
    return editor;
  });
  return {
    editor,
    diagnostics,
    syntax,
    create,
    emitChange: (next: string) => {
      value = next;
      changeHandler?.();
    },
  };
});

vi.mock('@editora/light-code-editor', () => {
  class Extension {
    name = 'extension';
    setup = vi.fn();
  }
  class SyntaxHighlightingExtension extends Extension {
    name = 'syntax-highlighting';
    registerMode = fake.syntax.registerMode;
  }
  class DiagnosticsExtension extends Extension {
    name = 'diagnostics';
    setDiagnostics = fake.diagnostics.setDiagnostics;
    clearDiagnostics = fake.diagnostics.clearDiagnostics;
  }
  return {
    createEditor: fake.create,
    LineNumbersExtension: class extends Extension {},
    SyntaxHighlightingExtension,
    DiagnosticsExtension,
    CompletionExtension: class extends Extension {},
    SearchExtension: class extends Extension {},
    BracketMatchingExtension: class extends Extension {},
    ActiveLineAndIndentGuidesExtension: class extends Extension {},
    EditingCommandsExtension: class extends Extension {},
  };
});

import LightCodeEditor from '../LightCodeEditor.vue';

const syntaxMode = {
  id: 'anydice',
  mode: { name: 'AnyDice', highlight: (source: string) => source },
};

describe('LightCodeEditor', () => {
  it('creates the editor, registers syntax and emits changes', async () => {
    const wrapper = mount(LightCodeEditor, {
      props: {
        modelValue: 'output 3d6',
        language: 'anydice',
        syntaxMode,
        completionProviders: [() => []],
        height: '200px',
      },
    });

    expect(fake.create).toHaveBeenCalledTimes(1);
    expect(fake.create.mock.calls[0][1]).toMatchObject({
      value: 'output 3d6',
      theme: 'light',
      lineNumbers: true,
      lineWrapping: true,
    });
    expect(fake.syntax.registerMode).toHaveBeenCalledWith(
      'anydice',
      syntaxMode.mode,
    );
    expect(fake.editor.executeCommand).toHaveBeenCalledWith(
      'setSyntaxLanguage',
      'anydice',
    );

    fake.emitChange('output 1d6');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['output 1d6']);
    expect(wrapper.emitted('ready')?.[0]).toEqual([fake.editor]);

    await wrapper.setProps({ modelValue: 'output 2d6' });
    expect(fake.editor.setValue).toHaveBeenCalledWith('output 2d6');

    await wrapper.setProps({ theme: 'vs-dark', readonly: true });
    expect(fake.editor.setTheme).toHaveBeenCalledWith('dark');
    expect(fake.editor.setReadOnly).toHaveBeenCalledWith(true);

    (wrapper.vm as unknown as { focus: () => void }).focus();
    expect(fake.editor.focus).toHaveBeenCalled();

    const vm = wrapper.vm as unknown as {
      setDiagnostics: (items: unknown[]) => void;
      clearDiagnostics: () => void;
    };
    const items = [
      {
        severity: 'error' as const,
        message: 'bad',
        range: {
          start: { line: 0, column: 0 },
          end: { line: 0, column: 1 },
        },
      },
    ];
    vm.setDiagnostics(items);
    vm.clearDiagnostics();
    expect(fake.diagnostics.setDiagnostics).toHaveBeenCalledWith(items);
    expect(fake.diagnostics.clearDiagnostics).toHaveBeenCalled();

    wrapper.unmount();
    expect(fake.editor.destroy).toHaveBeenCalled();
  });

  it('supports plaintext mode and runtime language changes', async () => {
    fake.create.mockClear();
    fake.editor.executeCommand.mockClear();
    const wrapper = mount(LightCodeEditor, {
      props: { modelValue: 'x', language: 'plaintext', theme: 'dark' },
    });

    expect(fake.create.mock.calls[0][1]).toMatchObject({ theme: 'dark' });
    expect(fake.editor.executeCommand).not.toHaveBeenCalledWith(
      'setSyntaxLanguage',
      'plaintext',
    );

    await wrapper.setProps({ language: 'javascript' });
    expect(fake.editor.executeCommand).toHaveBeenCalledWith(
      'setSyntaxLanguage',
      'javascript',
    );

    (wrapper.vm as unknown as { setValue: (value: string) => void }).setValue(
      'next',
    );
    expect(fake.editor.setValue).toHaveBeenCalledWith('next');
    wrapper.unmount();
  });
});
