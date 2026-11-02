import { monaco } from '@/components/common/monaco';

export const ANYDICE_LANGUAGE_ID = 'anydice';

const anydiceLanguage: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.anydice',
  ignoreCase: false,
  keywords: [
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
  ],
  operators: [
    '+',
    '-',
    '*',
    '/',
    '^',
    '=',
    '!=',
    '<',
    '>',
    '<=',
    '>=',
    '&',
    '|',
    '!',
    '@',
    '#',
    '..',
  ],
  symbols: /[=!<>+\-*/^@#&|:,.]+/,
  tokenizer: {
    root: [
      [/\\[\s\S]*?\\/, 'comment'],
      [/\s+/, 'white'],
      [/"(?:[^"\\]|\\.)*"/, 'string'],
      [/\d+/, 'number'],
      [/[A-Z_][A-Z0-9_]*/, 'variable'],
      [
        /[a-z]+/,
        {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        },
      ],
      [/[{}()[\]]/, '@brackets'],
      [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      [/[,;]/, 'delimiter'],
    ],
  },
};

const anydiceConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    blockComment: ['\\', '\\'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
};

let registered = false;

/** Register the AnyDice language and its syntax highlighter once. */
export function registerAnyDiceLanguage(): void {
  if (
    registered ||
    monaco.languages.getLanguages().some(({ id }) => id === ANYDICE_LANGUAGE_ID)
  ) {
    registered = true;
    return;
  }

  monaco.languages.register({ id: ANYDICE_LANGUAGE_ID });
  monaco.languages.setLanguageConfiguration(
    ANYDICE_LANGUAGE_ID,
    anydiceConfiguration,
  );
  monaco.languages.setMonarchTokensProvider(
    ANYDICE_LANGUAGE_ID,
    anydiceLanguage,
  );
  registered = true;
}
