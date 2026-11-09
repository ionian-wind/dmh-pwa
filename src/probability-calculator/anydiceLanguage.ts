export const ANYDICE_LANGUAGE_ID = 'anydice';

const KEYWORDS = new Set([
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
]);

const TOKEN_PATTERN =
  /(\\[\s\S]*?\\)|("(?:[^"\\]|\\.)*")|(\d+)|([A-Z_][A-Z0-9_]*)|([a-z]+)|([=!<>+\-*/^@#&|:,.]+)/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type AnyDiceSyntaxColors = Record<string, string>;

/** Highlight AnyDice source into HTML using the editor's theme colours. */
export function highlightAnydice(
  source: string,
  colors: AnyDiceSyntaxColors,
): string {
  const fallback = colors.text ?? 'inherit';
  let output = '';
  let cursor = 0;

  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    output += escapeHtml(source.slice(cursor, index));
    const token = match[0];
    let color = fallback;

    if (match[1]) color = colors.comment ?? fallback;
    else if (match[2]) color = colors.string ?? fallback;
    else if (match[3]) color = colors.number ?? fallback;
    else if (match[4]) color = colors.variable ?? fallback;
    else if (match[5]) {
      color = KEYWORDS.has(token) ? (colors.keyword ?? fallback) : fallback;
    } else if (match[6]) {
      color = colors.keyword ?? fallback;
    }

    output += `<span style="color: ${color};">${escapeHtml(token)}</span>`;
    cursor = index + token.length;
  }

  output += escapeHtml(source.slice(cursor));
  return output;
}

export interface AnyDiceSyntaxMode {
  name: string;
  highlight: (source: string, colors: Record<string, string>) => string;
}

/** Create the syntax mode registered with Editora's highlighting extension. */
export function createAnyDiceHighlightMode(): AnyDiceSyntaxMode {
  return {
    name: 'AnyDice',
    highlight: highlightAnydice,
  };
}
