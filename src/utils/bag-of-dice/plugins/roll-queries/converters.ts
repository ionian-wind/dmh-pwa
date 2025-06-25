import { CstToAstHandlerMap } from '../../utils/cstAstConverter';
import { nanoid } from 'nanoid';

export type RollQueryOption = {
  label: string;
  value: string;
  id: string;
};

export type RollQueryNode = {
  type: 'RollQuery';
  prompt: string;
  options: RollQueryOption[];
  plugin: 'roll-queries';
};

function splitBySeparator(tokens: any[], separator: string) {
  const segments: any[][] = [];
  let current: any[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.tokenType?.name === separator) {
      // Only split if not immediately preceded by EscapedChar '\|'
      if (i > 0 && tokens[i - 1].tokenType?.name === 'EscapedChar' && tokens[i - 1].image === '\\|') {
        current.push(token);
        continue;
      }
      segments.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  segments.push(current);
  return segments;
}

function reconstructSegment(tokens: any[]): string {
  return tokens.map((t: any) => t.tokenType?.name === 'EscapedChar' ? t.image[1] : t.image).join('');
}

export const rollQueriesCstToAstHandlers: CstToAstHandlerMap = {
  rollQuery: (cst: any, helpers: any, input?: any) => {
    // Flatten all relevant tokens in order
    const tokens: any[] = [];
    for (const key of ['Text', 'EscapedChar', 'Pipe', 'Comma', 'WhiteSpace']) {
      if (cst.children[key]) tokens.push(...cst.children[key]);
    }
    tokens.sort((a: any, b: any) => a.startOffset - b.startOffset);
    // Split by Pipe: [prompt, ...options]
    const pipeSegments = splitBySeparator(tokens, 'Pipe');
    // Helper to reconstruct a segment from tokens, preserving all spaces and escapes
    const reconstruct = (segmentTokens: any[]) => {
      if (!segmentTokens.length) return '';
      if (input) {
        const start = segmentTokens[0].startOffset;
        const end = segmentTokens[segmentTokens.length - 1].endOffset;
        return input.slice(start, end + 1);
      } else {
        return reconstructSegment(segmentTokens);
      }
    };
    // First segment is prompt
    const prompt = reconstruct(pipeSegments[0]).trim();
    // Remaining segments are options
    const optionSegments = pipeSegments.slice(1);
    let optionObjs: RollQueryOption[] = [];
    for (const segTokens of optionSegments) {
      // Find first unescaped comma (i.e., a Comma token not preceded by EscapedChar)
      let commaIndex = -1;
      for (let i = 0; i < segTokens.length; i++) {
        const t = segTokens[i];
        if (t.tokenType?.name === 'Comma') {
          // Only split if not immediately preceded by EscapedChar '\,'
          if (!(i > 0 && segTokens[i - 1].tokenType?.name === 'EscapedChar' && segTokens[i - 1].image === '\\,')) {
            commaIndex = i;
            break;
          }
        }
      }
      if (commaIndex !== -1) {
        // Label: everything before the comma (trim trailing whitespace)
        // Value: everything after the comma (trim leading whitespace)
        let label = reconstructSegment(segTokens.slice(0, commaIndex)).replace(/\\([|,}])/g, '$1').replace(/\$/g, '').replace(/\s+$/, '');
        let value = reconstructSegment(segTokens.slice(commaIndex + 1)).replace(/\\([|,}])/g, '$1').replace(/\$/g, '').replace(/^\s+/, '');
        optionObjs.push({ label, value, id: nanoid() });
      } else {
        let clean = reconstructSegment(segTokens).replace(/\\([|,}])/g, '$1');
        optionObjs.push({ label: clean, value: clean, id: nanoid() });
      }
    }
    return {
      type: 'RollQuery',
      prompt,
      options: optionObjs,
      plugin: 'roll-queries',
    };
  },
}; 