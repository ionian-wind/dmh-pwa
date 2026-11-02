import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  class FakeEditorWorker {}
  return { FakeEditorWorker };
});

vi.mock('monaco-editor/editor/editor.api', () => ({
  editor: { create: vi.fn() },
  languages: {},
}));
vi.mock('monaco-editor/editor/editor.main.js', () => ({}));
vi.mock('monaco-editor/editor/editor.worker?worker', () => ({
  default: hoisted.FakeEditorWorker,
}));

describe('monaco setup', () => {
  it('configures MonacoEnvironment to create the editor worker', async () => {
    const module = await import('../monaco');
    const environment = (self as unknown as { MonacoEnvironment: any })
      .MonacoEnvironment;

    expect(module.monaco.editor).toBeDefined();
    expect(environment.getWorker()).toBeInstanceOf(hoisted.FakeEditorWorker);
  }, 20_000);
});
