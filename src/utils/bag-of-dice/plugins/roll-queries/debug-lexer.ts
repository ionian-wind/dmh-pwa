import { Lexer } from 'chevrotain';
import { rollQueriesLexerModes } from './tokens';

const RollQueryLexer = new Lexer(rollQueriesLexerModes);

const input = '?{Prompt|Option\\|A|Option\\,B}';
const lexResult = RollQueryLexer.tokenize(input);

console.log('LEXED TOKENS:');
lexResult.tokens.forEach((t) => {
  console.log({ name: t.tokenType?.name, image: t.image });
});
