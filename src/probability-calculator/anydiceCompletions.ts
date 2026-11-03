import { monaco } from '@/components/common/monaco';

interface CompletionSnippet {
  label: string;
  body: string;
  detail: string;
  labelKey?: string;
  detailKey?: string;
  documentation?: string;
}

export type CompletionTranslate = (
  key: string,
  named?: Record<string, unknown>,
) => string;

let completionTranslate: CompletionTranslate | null = null;

/** Set the translator used for localized completion labels/details. */
export function setAnyDiceCompletionTranslator(
  translate: CompletionTranslate | null,
): void {
  completionTranslate = translate;
}

function tr(
  key: string,
  fallback: string,
  named?: Record<string, unknown>,
): string {
  return completionTranslate ? completionTranslate(key, named) : fallback;
}

export interface CodeCompletionPiece {
  name: string;
  code: string;
  include: boolean;
}

export interface CodePieceDefinition {
  kind: 'function' | 'variable';
  label: string;
  insertText: string;
  source: string;
}

const FUNCTION_PATTERN = /^[ \t]*function:[ \t]*(.+?)[ \t]*\{/gm;
const VARIABLE_PATTERN = /^([A-Z_][A-Z0-9_]*)[ \t]*:/gm;
const PARAMETER_PATTERN = /([A-Z_][A-Z0-9_]*)\s*:\s*[a-z]+/g;

/** Extract function and global variable definitions from a code piece. */
export function extractCodePieceDefinitions(
  piece: CodeCompletionPiece,
): CodePieceDefinition[] {
  const definitions: CodePieceDefinition[] = [];
  const seen = new Set<string>();

  for (const match of piece.code.matchAll(FUNCTION_PATTERN)) {
    const signature = match[1].trim();
    if (!signature) continue;
    let parameter = 0;
    const insertText = signature.replace(
      PARAMETER_PATTERN,
      (_match, name: string) => {
        parameter += 1;
        return `\${${parameter}:${name}}`;
      },
    );
    const label = signature.replace(PARAMETER_PATTERN, '$1');
    const key = `function:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    definitions.push({
      kind: 'function',
      label,
      insertText,
      source: piece.name,
    });
  }

  for (const match of piece.code.matchAll(VARIABLE_PATTERN)) {
    const name = match[1];
    const key = `variable:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    definitions.push({
      kind: 'variable',
      label: name,
      insertText: name,
      source: piece.name,
    });
  }

  return definitions;
}

let completionCodePieces: CodeCompletionPiece[] = [];

/** Update the code pieces used as completion suggestions. */
export function setAnyDiceCompletionCodePieces(
  pieces: CodeCompletionPiece[],
): void {
  completionCodePieces = pieces.map((piece) => ({ ...piece }));
}

function codePieceDefinitions(): Map<string, CodePieceDefinition> {
  const definitions = new Map<string, CodePieceDefinition>();
  for (const piece of completionCodePieces) {
    if (!piece.include) continue;
    for (const definition of extractCodePieceDefinitions(piece)) {
      const key = `${definition.kind}:${definition.label}`;
      if (!definitions.has(key)) definitions.set(key, definition);
    }
  }
  return definitions;
}

const functionSnippets: CompletionSnippet[] = [
  {
    label: 'absolute NUMBER',
    body: 'absolute ${1:1}',
    detail: 'Absolute value',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.absolute',
  },
  {
    label: 'SEQUENCE contains NUMBER',
    body: '${1:SEQUENCE} contains ${2:1}',
    detail: 'Whether a number occurs in a sequence',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.contains',
  },
  {
    label: 'count VALUES in SEQUENCE',
    body: 'count ${1:VALUES} in ${2:SEQUENCE}',
    detail: 'Count matching values',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.count',
  },
  {
    label: 'explode DIE',
    body: 'explode ${1:d6}',
    detail: 'Explode on the maximum value',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.explode',
  },
  {
    label: 'highest N of DICE',
    body: 'highest ${1:1} of ${2:4d6}',
    detail: 'Sum the highest N values',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.highest',
  },
  {
    label: 'lowest N of DICE',
    body: 'lowest ${1:1} of ${2:4d6}',
    detail: 'Sum the lowest N values',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.lowest',
  },
  {
    label: 'middle N of DICE',
    body: 'middle ${1:1} of ${2:4d6}',
    detail: 'Sum the middle N values',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.middle',
  },
  {
    label: 'highest of A and B',
    body: 'highest of ${1:d6} and ${2:4}',
    detail: 'Higher of two values',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.highestOf',
  },
  {
    label: 'lowest of A and B',
    body: 'lowest of ${1:d6} and ${2:4}',
    detail: 'Lower of two values',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.lowestOf',
  },
  {
    label: 'maximum of DIE',
    body: 'maximum of ${1:d6}',
    detail: 'Highest possible value',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.maximum',
  },
  {
    label: 'minimum of DIE',
    body: 'minimum of ${1:d6}',
    detail: 'Lowest possible value',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.minimum',
  },
  {
    label: 'reverse SEQUENCE',
    body: 'reverse ${1:{1..6}}',
    detail: 'Reverse sequence order',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.reverse',
  },
  {
    label: 'sort SEQUENCE',
    body: 'sort ${1:{1..6}}',
    detail: 'Sort using position order',
    detailKey: 'probabilityCalculator.syntaxPage.functionMeanings.sort',
  },
];

const statementSnippets: CompletionSnippet[] = [
  {
    label: 'output',
    body: 'output ${1:3d6}',
    detail: 'Add an output',
    detailKey: 'probabilityCalculator.completions.statementDetails.output',
  },
  {
    label: 'output named',
    body: 'output ${1:3d6} named "${2:three dice}"',
    detail: 'Add a named output',
    detailKey: 'probabilityCalculator.completions.statementDetails.outputNamed',
  },
  {
    label: 'function',
    body: 'function: ${1:name} ${2:A:n} {\n  result: ${3:A}\n}',
    detail: 'Define a function',
    detailKey: 'probabilityCalculator.completions.statementDetails.function',
  },
  {
    label: 'loop over',
    labelKey: 'probabilityCalculator.completions.labels.loopOver',
    body: 'loop ${1:P} over {${2:1}..${3:6}} {\n  ${4}\n}',
    detail: 'Loop over a sequence',
    detailKey: 'probabilityCalculator.completions.statementDetails.loop',
  },
  {
    label: 'if / else',
    body: 'if ${1:condition} {\n  ${2}\n}\nelse {\n  ${3}\n}',
    detail: 'Conditional block',
    detailKey: 'probabilityCalculator.completions.statementDetails.ifElse',
  },
  {
    label: 'set position order',
    body: 'set "position order" to "${1|highest first,lowest first|}"',
    detail: 'Change sequence/digit position order',
    detailKey:
      'probabilityCalculator.completions.statementDetails.setPositionOrder',
  },
  {
    label: 'set explode depth',
    body: 'set "explode depth" to ${1:2}',
    detail: 'Change the explode depth',
    detailKey:
      'probabilityCalculator.completions.statementDetails.setExplodeDepth',
  },
  {
    label: 'set maximum function depth',
    body: 'set "maximum function depth" to ${1:10}',
    detail: 'Change the recursion limit',
    detailKey:
      'probabilityCalculator.completions.statementDetails.setMaximumFunctionDepth',
  },
  {
    label: 'dice pool',
    labelKey: 'probabilityCalculator.completions.labels.dicePool',
    body: '${1:3}d${2:6}',
    detail: 'Create a dice pool',
    detailKey: 'probabilityCalculator.completions.statementDetails.dicePool',
  },
  {
    label: 'sequence range',
    labelKey: 'probabilityCalculator.completions.labels.sequenceRange',
    body: '{${1:1}..${2:6}}',
    detail: 'Create a sequence range',
    detailKey:
      'probabilityCalculator.completions.statementDetails.sequenceRange',
  },
  {
    label: 'custom die',
    labelKey: 'probabilityCalculator.completions.labels.customDie',
    body: 'd{${1:1,2,3}}',
    detail: 'Create a custom die',
    detailKey: 'probabilityCalculator.completions.statementDetails.customDie',
  },
  {
    label: 'comment',
    labelKey: 'probabilityCalculator.completions.labels.comment',
    body: '\\ ${1:comment} \\',
    detail: 'Backslash comment',
    detailKey: 'probabilityCalculator.completions.statementDetails.comment',
  },
];

const keywords = [
  'output',
  'named',
  'function',
  'if',
  'else',
  'loop',
  'over',
  'result',
  'set',
  'to',
];

let registered = false;

export function createAnyDiceCompletionProvider(): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['[', '{', '"'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const line = model.getLineContent(position.lineNumber);
      const beforeWord = line.slice(0, Math.max(0, word.startColumn - 1));
      const afterCursor = line.slice(position.column - 1);
      const inCall = beforeWord.lastIndexOf('[') > beforeWord.lastIndexOf(']');
      const closeCall = inCall && !afterCursor.startsWith(']');

      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [];

      for (const fn of functionSnippets) {
        suggestions.push({
          label: fn.labelKey ? tr(fn.labelKey, fn.label) : fn.label,
          filterText: fn.label,
          kind: monaco.languages.CompletionItemKind.Function,
          detail: fn.detailKey ? tr(fn.detailKey, fn.detail) : fn.detail,
          documentation: fn.detailKey
            ? tr(fn.detailKey, fn.detail)
            : fn.documentation,
          insertText: inCall
            ? `${fn.body}${closeCall ? ']' : ''}`
            : `[${fn.body}]`,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: `1-${fn.label}`,
        });
      }

      if (!inCall) {
        for (const statement of statementSnippets) {
          suggestions.push({
            label: statement.labelKey
              ? tr(statement.labelKey, statement.label)
              : statement.label,
            filterText: statement.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: statement.detailKey
              ? tr(statement.detailKey, statement.detail)
              : statement.detail,
            documentation: statement.detailKey
              ? tr(statement.detailKey, statement.detail)
              : statement.documentation,
            insertText: statement.body,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `2-${statement.label}`,
          });
        }

        for (const keyword of keywords) {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: tr('probabilityCalculator.completions.keyword', 'Keyword'),
            insertText: keyword,
            range,
            sortText: `3-${keyword}`,
          });
        }
      }

      const variables = new Set(
        model.getValue().match(/\b[A-Z_][A-Z0-9_]*\b/g) ?? [],
      );
      for (const variable of variables) {
        if (variable === word.word) continue;
        suggestions.push({
          label: variable,
          kind: monaco.languages.CompletionItemKind.Variable,
          detail: tr(
            'probabilityCalculator.completions.variableFromProgram',
            'Variable from this program',
          ),
          insertText: variable,
          range,
          sortText: `4-${variable}`,
        });
      }

      const existingLabels = new Set(
        suggestions.map(
          (suggestion) => `${suggestion.kind}:${suggestion.label}`,
        ),
      );
      for (const definition of codePieceDefinitions().values()) {
        const kind =
          definition.kind === 'function'
            ? monaco.languages.CompletionItemKind.Function
            : monaco.languages.CompletionItemKind.Variable;
        const key = `${kind}:${definition.label}`;
        if (existingLabels.has(key) || definition.label === word.word) continue;
        existingLabels.add(key);

        const isFunction = definition.kind === 'function';
        suggestions.push({
          label: definition.label,
          kind,
          detail: tr(
            'probabilityCalculator.completions.fromCodePiece',
            `From code piece: ${definition.source}`,
            { name: definition.source },
          ),
          documentation: tr(
            'probabilityCalculator.completions.definedInCodePiece',
            `Defined in code piece “${definition.source}”.`,
            { name: definition.source },
          ),
          insertText: isFunction
            ? inCall
              ? `${definition.insertText}${closeCall ? ']' : ''}`
              : `[${definition.insertText}]`
            : definition.insertText,
          insertTextRules: isFunction
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          range,
          sortText: isFunction
            ? `0-${definition.label}`
            : `3.5-${definition.label}`,
        });
      }

      return { suggestions };
    },
  };
}

/** Register AnyDice autocomplete exactly once. */
export function registerAnyDiceCompletions(): void {
  if (registered) return;
  monaco.languages.registerCompletionItemProvider(
    'anydice',
    createAnyDiceCompletionProvider(),
  );
  registered = true;
}
