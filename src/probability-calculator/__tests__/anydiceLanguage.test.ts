import { describe, expect, it, vi } from 'vitest';

const languages = vi.hoisted(() => {
  const registered: string[] = [];
  return {
    registered,
    getLanguages: vi.fn(() => registered.map((id) => ({ id }))),
    register: vi.fn(({ id }: { id: string }) => {
      registered.push(id);
    }),
    setLanguageConfiguration: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    registerCompletionItemProvider: vi.fn(),
  };
});

vi.mock('@/components/common/monaco', () => ({
  monaco: { languages },
}));

import {
  ANYDICE_LANGUAGE_ID,
  registerAnyDiceLanguage,
} from '../anydiceLanguage';

describe('AnyDice language registration', () => {
  it('registers the language, configuration and Monarch tokenizer once', () => {
    registerAnyDiceLanguage();
    registerAnyDiceLanguage();

    expect(ANYDICE_LANGUAGE_ID).toBe('anydice');
    expect(languages.register).toHaveBeenCalledTimes(1);
    expect(languages.setLanguageConfiguration).toHaveBeenCalledWith(
      'anydice',
      expect.objectContaining({
        comments: { blockComment: ['\\', '\\'] },
      }),
    );
    expect(languages.setMonarchTokensProvider).toHaveBeenCalledWith(
      'anydice',
      expect.objectContaining({
        keywords: expect.arrayContaining(['output', 'function', 'loop']),
      }),
    );
  });
});
