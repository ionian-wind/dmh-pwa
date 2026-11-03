import { afterEach, describe, expect, it, vi } from 'vitest';

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
  extractCodePieceDefinitions,
  registerAnyDiceCompletions,
  setAnyDiceCompletionCodePieces,
  setAnyDiceCompletionTranslator,
} from '../anydiceCompletions';
import ru from '@/i18n/locales/ru.json';

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

function ruTranslate(key: string, named?: Record<string, unknown>): string {
  const value = key.split('.').reduce<any>((node, part) => node?.[part], ru);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(named?.[name] ?? ''),
  );
}

const libraryPiece = {
  name: 'Combat library',
  include: true,
  code: `DAMAGE: 2d6 + 3
function: double N:n if above B:n {
  result: N + N
}
function: always seven {
  result: 7
}`,
};

describe('AnyDice completions', () => {
  afterEach(() => {
    setAnyDiceCompletionCodePieces([]);
    setAnyDiceCompletionTranslator(null);
  });

  it('extracts definitions and their source code piece', () => {
    const definitions = extractCodePieceDefinitions(libraryPiece);

    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'variable',
          label: 'DAMAGE',
          insertText: 'DAMAGE',
          source: 'Combat library',
        }),
        expect.objectContaining({
          kind: 'function',
          label: 'double N if above B',
          insertText: 'double ${1:N} if above ${2:B}',
          source: 'Combat library',
        }),
        expect.objectContaining({
          kind: 'function',
          label: 'always seven',
          insertText: 'always seven',
        }),
      ]),
    );
  });

  it('offers definitions from included code pieces with their name', () => {
    setAnyDiceCompletionCodePieces([
      libraryPiece,
      { name: 'Ignored', include: false, code: 'HIDDEN: 1' },
    ]);
    const provider = createAnyDiceCompletionProvider();
    const result = provider.provideCompletionItems(
      modelFor('out') as any,
      position(4) as any,
      {} as any,
      {} as any,
    ) as { suggestions: any[] };

    const damage = result.suggestions.find(
      (suggestion) => suggestion.label === 'DAMAGE',
    );
    expect(damage).toMatchObject({
      kind: 6,
      detail: 'From code piece: Combat library',
      documentation: 'Defined in code piece “Combat library”.',
    });

    const double = result.suggestions.find(
      (suggestion) => suggestion.label === 'double N if above B',
    );
    expect(double).toMatchObject({
      kind: 3,
      insertText: '[double ${1:N} if above ${2:B}]',
      insertTextRules: 4,
    });
    expect(
      result.suggestions.map((suggestion) => suggestion.label),
    ).not.toContain('HIDDEN');
  });

  it('inserts connected code-piece functions inside call brackets', () => {
    setAnyDiceCompletionCodePieces([libraryPiece]);
    const provider = createAnyDiceCompletionProvider();
    const result = provider.provideCompletionItems(
      modelFor('[dou') as any,
      position(5) as any,
      {} as any,
      {} as any,
    ) as { suggestions: any[] };
    const double = result.suggestions.find(
      (suggestion) => suggestion.label === 'double N if above B',
    );
    expect(double.insertText).toBe('double ${1:N} if above ${2:B}]');
  });

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

  it('localizes system, pre-defined and code-piece suggestions', () => {
    setAnyDiceCompletionTranslator(ruTranslate);
    setAnyDiceCompletionCodePieces([libraryPiece]);
    const provider = createAnyDiceCompletionProvider();
    const result = provider.provideCompletionItems(
      modelFor('X: 1\nout') as any,
      position(8) as any,
      {} as any,
      {} as any,
    ) as { suggestions: any[] };

    const highest = result.suggestions.find(
      (suggestion) => suggestion.label === 'highest N of DICE',
    );
    expect(highest.detail).toBe(
      'Сумма N наибольших значений. Поддерживает несколько наборов через and.',
    );

    const dicePool = result.suggestions.find(
      (suggestion) => suggestion.label === 'набор кубиков',
    );
    expect(dicePool).toMatchObject({
      filterText: 'dice pool',
      detail: 'Создать набор кубиков',
    });

    const outputSnippet = result.suggestions.find(
      (suggestion) => suggestion.label === 'output' && suggestion.kind === 15,
    );
    expect(outputSnippet.detail).toBe('Добавить вывод');

    const keyword = result.suggestions.find(
      (suggestion) => suggestion.label === 'output' && suggestion.kind === 18,
    );
    expect(keyword.detail).toBe('Ключевое слово');

    const programVariable = result.suggestions.find(
      (suggestion) => suggestion.label === 'X',
    );
    expect(programVariable.detail).toBe('Переменная из этой программы');

    const damage = result.suggestions.find(
      (suggestion) => suggestion.label === 'DAMAGE',
    );
    expect(damage).toMatchObject({
      detail: 'Из фрагмента кода: Combat library',
      documentation: 'Определено во фрагменте кода «Combat library».',
    });
  });

  it('registers the completion provider once', () => {
    registerAnyDiceCompletions();
    registerAnyDiceCompletions();
    expect(languages.registerCompletionItemProvider).toHaveBeenCalledTimes(1);
    expect(languages.provider).toBeDefined();
  });
});
