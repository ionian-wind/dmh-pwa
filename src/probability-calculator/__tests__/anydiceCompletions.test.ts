import { describe, expect, it, vi } from 'vitest';

const languages = vi.hoisted(() => {
  let provider: any;
  return {
    get provider() {
      return provider;
    },
    registerCompletionItemProvider: vi.fn((_language: string, value: any) => {
      provider = value;
      return { dispose: vi.fn() };
    }),
    CompletionItemKind: {
      Function: 3,
      Snippet: 15,
      Keyword: 18,
      Variable: 6,
    },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  };
});

vi.mock('@/components/common/monaco', () => ({
  monaco: { languages },
}));

import {
  createAnyDiceCompletionProvider,
  registerAnyDiceCompletions,
} from '../anydiceCompletions';

function modelFor(text: string) {
  return {
    getLineContent: vi.fn(() => text),
    getValue: vi.fn(() => text),
    getWordUntilPosition: vi.fn(
      ({ lineNumber, column }: { lineNumber: number; column: number }) => {
        const before = text.slice(0, column - 1);
        const match = before.match(/[a-z]+$/);
        return {
          word: match?.[0] ?? '',
          startColumn: column - (match?.[0].length ?? 0),
          endColumn: column,
          startLineNumber: lineNumber,
          endLineNumber: lineNumber,
        };
      },
    ),
  };
}

function position(column: number) {
  return { lineNumber: 1, column };
}

describe('AnyDice completions', () => {
  it('offers snippets, functions, keywords and variables', () => {
    const provider = createAnyDiceCompletionProvider();
    const model = modelFor('X: 1\noutput X');
    const result = provider.provideCompletionItems(
      model as any,
      position(9) as any,
      {} as any,
      {} as any,
    ) as { suggestions: any[] };

    expect(result.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'output', kind: 18 }),
        expect.objectContaining({ label: 'function', kind: 15 }),
        expect.objectContaining({ label: 'highest N of DICE', kind: 3 }),
        expect.objectContaining({ label: 'X', kind: 6 }),
      ]),
    );
  });

  it('inserts function snippets inside call brackets', () => {
    const provider = createAnyDiceCompletionProvider();
    const result = provider.provideCompletionItems(
      modelFor('[hig') as any,
      position(5) as any,
      {} as any,
      {} as any,
    ) as { suggestions: any[] };
    const highest = result.suggestions.find(
      (suggestion) => suggestion.label === 'highest N of DICE',
    );
    expect(highest.insertText).toContain('highest ${1:1} of ${2:4d6}');
    expect(highest.insertText.startsWith('[')).toBe(false);
    expect(highest.insertText.endsWith(']')).toBe(true);
  });

  it('does not duplicate an auto-closed closing bracket', () => {
    const provider = createAnyDiceCompletionProvider();
    const result = provider.provideCompletionItems(
      modelFor('[hig]') as any,
      position(5) as any,
      {} as any,
      {} as any,
    ) as { suggestions: any[] };
    const highest = result.suggestions.find(
      (suggestion) => suggestion.label === 'highest N of DICE',
    );
    expect(highest.insertText.endsWith(']')).toBe(false);
  });

  it('registers the completion provider once', () => {
    registerAnyDiceCompletions();
    registerAnyDiceCompletions();
    expect(languages.registerCompletionItemProvider).toHaveBeenCalledTimes(1);
    expect(languages.provider).toBeDefined();
  });
});
