import { afterEach, describe, expect, it } from 'vitest';
import type {
  CompletionContext,
  CompletionItem,
} from '@editora/light-code-editor';

import {
  createAnyDiceCompletionProvider,
  extractCodePieceDefinitions,
  setAnyDiceCompletionCodePieces,
  setAnyDiceCompletionTranslator,
} from '../anydiceCompletions';
import ru from '@/i18n/locales/ru.json';

function contextFor(text: string, offset: number): CompletionContext {
  const lineStart = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const nextLine = text.indexOf('\n', offset);
  const lineEnd = nextLine === -1 ? text.length : nextLine;
  const beforeWord = text.slice(lineStart, offset);
  const match = beforeWord.match(/[a-z]+$/);
  const prefix = match?.[0] ?? '';
  const column = offset - lineStart;
  return {
    editor: {} as never,
    text,
    lineText: text.slice(lineStart, lineEnd),
    prefix,
    cursor: { position: { line: 0, column } },
    wordRange: {
      start: { line: 0, column: column - prefix.length },
      end: { line: 0, column },
    },
    explicit: false,
    triggerKind: 'input',
  };
}

function completions(text: string, offset = text.length): CompletionItem[] {
  const provider = createAnyDiceCompletionProvider();
  return provider(contextFor(text, offset)) as CompletionItem[];
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
    const items = completions('out');

    const damage = items.find((suggestion) => suggestion.label === 'DAMAGE');
    expect(damage).toMatchObject({
      kind: 'variable',
      detail: 'From code piece: Combat library',
      description: 'Defined in code piece “Combat library”.',
    });

    const double = items.find(
      (suggestion) => suggestion.label === 'double N if above B',
    );
    expect(double).toMatchObject({
      kind: 'function',
      insertText: '[double N if above B]',
    });
    expect(items.map((suggestion) => suggestion.label)).not.toContain('HIDDEN');
  });

  it('inserts connected code-piece functions inside call brackets', () => {
    setAnyDiceCompletionCodePieces([libraryPiece]);
    const items = completions('[dou');
    const double = items.find(
      (suggestion) => suggestion.label === 'double N if above B',
    );
    expect(double?.insertText).toBe('double N if above B]');
  });

  it('offers snippets, functions, keywords and variables', () => {
    const items = completions('X: 1\noutput ');
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'output', kind: 'keyword' }),
        expect.objectContaining({ label: 'function', kind: 'snippet' }),
        expect.objectContaining({
          label: 'highest N of DICE',
          kind: 'function',
        }),
        expect.objectContaining({ label: 'X', kind: 'variable' }),
      ]),
    );
  });

  it('inserts function snippets inside call brackets', () => {
    const items = completions('[hig');
    const highest = items.find(
      (suggestion) => suggestion.label === 'highest N of DICE',
    );
    expect(highest?.insertText).toBe('highest 1 of 4d6]');
  });

  it('does not duplicate an auto-closed closing bracket', () => {
    const items = completions('[hig]', 4);
    const highest = items.find(
      (suggestion) => suggestion.label === 'highest N of DICE',
    );
    expect(highest?.insertText?.endsWith(']')).toBe(false);
  });

  it('localizes system, pre-defined and code-piece suggestions', () => {
    setAnyDiceCompletionTranslator(ruTranslate);
    setAnyDiceCompletionCodePieces([libraryPiece]);
    const items = completions('X: 1\nout');

    const highest = items.find(
      (suggestion) => suggestion.label === 'highest N of DICE',
    );
    expect(highest?.detail).toBe(
      'Сумма N наибольших значений. Поддерживает несколько наборов через and.',
    );

    const dicePool = items.find(
      (suggestion) => suggestion.label === 'набор кубиков',
    );
    expect(dicePool).toMatchObject({
      filterText: 'dice pool',
      detail: 'Создать набор кубиков',
    });

    const outputSnippet = items.find(
      (suggestion) =>
        suggestion.label === 'output' && suggestion.kind === 'snippet',
    );
    expect(outputSnippet?.detail).toBe('Добавить вывод');

    const keyword = items.find(
      (suggestion) =>
        suggestion.label === 'output' && suggestion.kind === 'keyword',
    );
    expect(keyword?.detail).toBe('Ключевое слово');

    const programVariable = items.find(
      (suggestion) => suggestion.label === 'X',
    );
    expect(programVariable?.detail).toBe('Переменная из этой программы');

    const damage = items.find((suggestion) => suggestion.label === 'DAMAGE');
    expect(damage).toMatchObject({
      detail: 'Из фрагмента кода: Combat library',
      description: 'Определено во фрагменте кода «Combat library».',
    });
  });
});
