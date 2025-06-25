export interface TokenDef {
  name: string;
  pattern: RegExp;
  plugin: string;
  // Optionally, a function to post-process the match
  value?(match: RegExpExecArray): any;
  // Priority for sorting (higher = matched first)
  priority?: number;
}

export interface Token {
  type: string;
  value: any;
  plugin: string;
  start: number;
  end: number;
}

export function createTokenizer(tokenDefs: TokenDef[]) {
  // Sort by priority, then pattern length (longest first)
  const sortedDefs = [...tokenDefs].sort((a, b) => {
    if ((b.priority ?? 0) !== (a.priority ?? 0)) {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }
    return b.pattern.source.length - a.pattern.source.length;
  });

  return function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    while (pos < input.length) {
      let matched = false;
      for (const def of sortedDefs) {
        def.pattern.lastIndex = pos;
        const match = def.pattern.exec(input);
        if (match && match.index === pos) {
          const value = def.value ? def.value(match) : match[0];
          tokens.push({
            type: def.name,
            value,
            plugin: def.plugin,
            start: pos,
            end: pos + match[0].length,
          });
          pos += match[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        throw new Error(`Unexpected character at position ${pos}: '${input[pos]}'`);
      }
    }
    return tokens;
  };
} 